<?php

namespace App\Jobs;

use App\Models\Actor;
use App\Models\BehaviouralEvent;
use App\Models\HarvestingRun;
use App\Models\HarvestingSignal;
use App\Models\HarvestingSourceSuppression;
use App\Services\Harvesting\HarvestingSource;
use App\Services\Harvesting\HarvestingSourceRegistry;
use App\Services\Harvesting\HarvestSignal;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class HarvestActorJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Dedicated harvesting queue — separate from 'ai' and 'default' (HARV-CON-004).
     */
    public string $queue = 'harvesting';

    public int $timeout = 600; // 10 minutes max per job

    public function __construct(
        private readonly string $actorId,
        private readonly string $trigger,       // creation | interval | manual
        private readonly bool   $vaultConfirmed = false,
    ) {}

    public function handle(HarvestingSourceRegistry $registry): void
    {
        // --- Guard: Actor must exist and not be soft-deleted ---
        $actor = Actor::withoutGlobalScopes()->find($this->actorId);

        if (!$actor || (method_exists($actor, 'trashed') && $actor->trashed())) {
            Log::info('HarvestActorJob: Actor not found or deleted.', ['actor_id' => $this->actorId]);
            return;
        }

        // --- Guard: Vault confirmation (HARV-CON-002) ---
        if ($actor->pool === 'vault' && !$this->vaultConfirmed) {
            Log::warning('HarvestActorJob: Vault Actor harvested without vault_confirmed.', [
                'actor_id' => $this->actorId,
            ]);
            return;
        }

        // --- Create HarvestingRun ---
        $run = HarvestingRun::create([
            'id'         => (string) Str::uuid(),
            'tenant_id'  => $actor->tenant_id,
            'actor_id'   => $actor->id,
            'trigger'    => $this->trigger,
            'status'     => 'running',
            'started_at' => now(),
        ]);

        $sourcesQueried  = [];
        $allSignals      = [];

        // --- Execute each applicable source ---
        foreach ($registry->forActor($actor) as $source) {
            $sourceId     = class_basename($source);
            $sourceResult = ['source' => $sourceId, 'status' => 'skipped', 'attempts' => 0, 'signals' => 0];

            $signals = $this->executeWithRetry($source, $actor, $sourceResult);

            $sourcesQueried[] = $sourceResult;

            if ($signals !== null) {
                $allSignals = array_merge($allSignals, $signals);
            }
        }

        // --- Deduplicate ---
        [$deduped, $suppressedCount] = $this->deduplicateSignals($allSignals, $actor);

        // --- Write signals ---
        $written = 0;
        foreach ($deduped as $signal) {
            // Source suppression check
            if ($this->isSourceSuppressed($signal->sourceId, $actor)) {
                $suppressedCount++;
                continue;
            }

            $autoApply = $this->shouldAutoApply($signal, $actor);
            $status    = $autoApply ? 'auto_applied' : 'pending';

            HarvestingSignal::create([
                'id'                => (string) Str::uuid(),
                'tenant_id'         => $actor->tenant_id,
                'actor_id'          => $actor->id,
                'harvesting_run_id' => $run->id,
                'source_id'         => $signal->sourceId,
                'signal_type'       => $signal->signalType,
                'field_name'        => $signal->fieldName,
                'proposed_value'    => $signal->proposedValue,
                'confidence'        => $signal->confidence,
                'reliability_grade' => $signal->reliabilityGrade,
                'source_label'      => $signal->sourceLabel,
                'source_url'        => $signal->sourceUrl,
                'raw_data'          => $signal->rawData,
                'status'            => $status,
            ]);

            if ($autoApply && $signal->signalType === 'field_value' && $signal->fieldName) {
                $this->applyFieldValue($signal, $actor);
            }

            $written++;
        }

        // --- Finalise run ---
        $run->update([
            'status'               => 'completed',
            'completed_at'         => now(),
            'sources_queried'      => $sourcesQueried,
            'signals_found'        => count($allSignals),
            'duplicates_suppressed'=> $suppressedCount,
        ]);

        // --- Touch Actor (HARV-JOB-004) ---
        DB::table('actors')
            ->where('id', $actor->id)
            ->update(['last_enriched_at' => now()]);
    }

    // -----------------------------------------------------------------------

    private function executeWithRetry(HarvestingSource $source, Actor $actor, array &$result): ?array
    {
        // Delays between retries: 0s, 30s, 5min (30min capped at 15min for worker health)
        $delays  = [0, 30, 300, 900];
        $sourceId = class_basename($source);

        for ($attempt = 1; $attempt <= 4; $attempt++) {
            $result['attempts'] = $attempt;

            if ($attempt > 1 && isset($delays[$attempt - 1])) {
                sleep($delays[$attempt - 1]);
            }

            try {
                $signals = $source->harvest($actor);
                $result['status']  = 'success';
                $result['signals'] = count($signals);
                return $signals;
            } catch (\Throwable $e) {
                $result['error'] = $e->getMessage();
                Log::warning("HarvestActorJob: source {$sourceId} attempt {$attempt} failed.", [
                    'actor_id' => $actor->id,
                    'error'    => $e->getMessage(),
                ]);
            }
        }

        $result['status'] = 'failed';
        Log::error("HarvestActorJob: source {$sourceId} failed all 4 attempts.", ['actor_id' => $actor->id]);
        return null;
    }

    /**
     * @param HarvestSignal[] $signals
     * @return array [deduped HarvestSignal[], int suppressedCount]
     */
    private function deduplicateSignals(array $signals, Actor $actor): array
    {
        $suppressed = 0;
        $seen       = [];
        $deduped    = [];

        // Load existing pending signals for this actor for comparison
        $existing = HarvestingSignal::where('actor_id', $actor->id)
            ->where('status', 'pending')
            ->get(['source_id', 'field_name', 'proposed_value'])
            ->toArray();

        $existingKeys = array_map(
            fn($e) => $e['source_id'] . '|' . $e['field_name'] . '|' . $e['proposed_value'],
            $existing
        );

        foreach ($signals as $signal) {
            // Exact duplicate check against existing pending signals
            $key = $signal->sourceId . '|' . ($signal->fieldName ?? '') . '|' . $signal->proposedValue;
            if (in_array($key, $existingKeys)) {
                $suppressed++;
                continue;
            }

            // Exact duplicate within current batch
            if (isset($seen[$key])) {
                $suppressed++;
                continue;
            }

            // Near-duplicate detection for news_item signals (Levenshtein >= 85%)
            if ($signal->signalType === 'news_item') {
                $isDup = false;
                foreach ($deduped as $existing2) {
                    if ($existing2->signalType !== 'news_item') continue;
                    $domain1 = parse_url($signal->sourceUrl ?? '', PHP_URL_HOST);
                    $domain2 = parse_url($existing2->sourceUrl ?? '', PHP_URL_HOST);
                    if ($domain1 && $domain1 === $domain2) {
                        $len = max(strlen($signal->proposedValue), strlen($existing2->proposedValue));
                        if ($len > 0) {
                            $dist       = levenshtein(substr($signal->proposedValue, 0, 255), substr($existing2->proposedValue, 0, 255));
                            $similarity = 1 - ($dist / $len);
                            if ($similarity >= 0.85) { $isDup = true; break; }
                        }
                    }
                }
                if ($isDup) { $suppressed++; continue; }
            }

            $seen[$key] = true;
            $deduped[]  = $signal;
        }

        return [$deduped, $suppressed];
    }

    private function isSourceSuppressed(string $sourceId, Actor $actor): bool
    {
        return HarvestingSourceSuppression::where('actor_id', $actor->id)
            ->where('source_id', $sourceId)
            ->where('suppress_until', '>', now())
            ->exists();
    }

    private function shouldAutoApply(HarvestSignal $signal, Actor $actor): bool
    {
        // HARV-REV-012: Flag signals NEVER auto-applied
        if ($signal->signalType === 'flag') return false;

        // Only field_value signals can be auto-applied
        if ($signal->signalType !== 'field_value') return false;

        // Check tenant settings
        $tenant      = \App\Models\Tenant::find($actor->tenant_id);
        $autoApply   = $tenant?->settings['auto_apply_harvesting'] ?? false;
        if (!$autoApply) return false;

        // HARV-REV-010: must be high confidence + bedrock + Commons Actor + null field
        if ($signal->confidence !== 'high')        return false;
        if ($signal->reliabilityGrade !== 'bedrock') return false;
        if ($actor->pool !== 'commons')            return false;
        if (!$signal->fieldName)                   return false;

        // Field must currently be null
        $currentValue = $actor->{$signal->fieldName} ?? null;
        return $currentValue === null || $currentValue === '';
    }

    private function applyFieldValue(HarvestSignal $signal, Actor $actor): void
    {
        try {
            DB::table('actors')
                ->where('id', $actor->id)
                ->update([
                    $signal->fieldName => $signal->proposedValue,
                    'updated_at'       => now(),
                ]);
        } catch (\Throwable $e) {
            Log::error('HarvestActorJob: auto-apply field failed.', [
                'field' => $signal->fieldName,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
