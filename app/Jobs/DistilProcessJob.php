<?php
namespace App\Jobs;

use App\AI\BeneathAIProvider;
use App\Models\Actor;
use App\Models\Source;
use App\Models\SourceClaim;
use App\Models\SourceEntity;
use App\Models\SourceEvent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DistilProcessJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 120;

    public function __construct(public string $sourceId) {}

    public function handle(BeneathAIProvider $ai): void
    {
        $source = Source::withoutGlobalScopes()->find($this->sourceId);
        if (!$source) return;

        $source->update(['status' => 'processing']);

        try {
            $text = $this->extractText($source);
        } catch (\Throwable $e) {
            $source->update(['status' => 'failed', 'distil_status' => 'skipped', 'distil_error' => $e->getMessage()]);
            Log::error('DistilProcessJob text extraction failed', ['source_id' => $source->id, 'error' => $e->getMessage()]);
            return;
        }

        $source->update(['raw_text' => $text, 'status' => 'done', 'distil_status' => 'processing']);

        if (empty(trim($text))) {
            $source->update(['distil_status' => 'skipped', 'distil_error' => 'No text could be extracted.']);
            return;
        }

        try {
            $actors = Actor::withoutGlobalScopes()
                ->where('tenant_id', $source->tenant_id)
                ->get(['id', 'display_name', 'actor_type'])
                ->map(fn($a) => ['id' => $a->id, 'name' => $a->display_name, 'type' => $a->actor_type])
                ->toArray();

            // Entity extraction
            $entityResult = $ai->extractEntities($text, $actors);
            foreach ($entityResult['matchedActors'] ?? [] as $match) {
                SourceEntity::create([
                    'source_id'   => $source->id,
                    'tenant_id'   => $source->tenant_id,
                    'entity_name' => $match['entityName'] ?? '',
                    'actor_id'    => $match['actorId'] ?? null,
                    'match_type'  => 'matched',
                    'confidence'  => 'high',
                ]);
            }
            foreach ($entityResult['candidateNewActors'] ?? [] as $candidate) {
                SourceEntity::create([
                    'source_id'   => $source->id,
                    'tenant_id'   => $source->tenant_id,
                    'entity_name' => $candidate['name'] ?? '',
                    'actor_type'  => $candidate['actorType'] ?? null,
                    'context'     => $candidate['context'] ?? null,
                    'match_type'  => 'candidate',
                    'confidence'  => $candidate['confidence'] ?? 'medium',
                ]);
            }

            // Event extraction
            $eventResult = $ai->extractEvents($text, $actors);
            foreach ($eventResult['events'] ?? [] as $ev) {
                SourceEvent::create([
                    'source_id'             => $source->id,
                    'tenant_id'             => $source->tenant_id,
                    'event_type'            => $ev['eventType'] ?? 'signal',
                    'summary'               => substr($ev['summary'] ?? '', 0, 200),
                    'content'               => $ev['content'] ?? null,
                    'attributed_actor_id'   => $ev['attributedActorId'] ?? null,
                    'attributed_actor_name' => $ev['attributedActorName'] ?? null,
                    'event_date'            => $ev['eventDate'] ?? null,
                    'reliability_grade'     => $ev['reliabilityGrade'] ?? 'sand',
                    'confidence'            => $ev['confidence'] ?? 'medium',
                ]);
            }

            // Claim extraction
            $claimResult = $ai->extractClaims($text, $actors);
            foreach ($claimResult['claims'] ?? [] as $cl) {
                SourceClaim::create([
                    'source_id'             => $source->id,
                    'tenant_id'             => $source->tenant_id,
                    'claim_text'            => $cl['claimText'] ?? '',
                    'attributed_actor_id'   => $cl['attributedActorId'] ?? null,
                    'attributed_actor_name' => $cl['attributedActorName'] ?? null,
                    'context'               => $cl['context'] ?? null,
                    'confidence'            => $cl['confidence'] ?? 'medium',
                ]);
            }

            $source->update(['distil_status' => 'done', 'processed_at' => now()]);

        } catch (\Throwable $e) {
            $source->update(['distil_status' => 'failed', 'distil_error' => $e->getMessage()]);
            Log::error('DistilProcessJob AI extraction failed', ['source_id' => $source->id, 'error' => $e->getMessage()]);
        }
    }

    private function extractText(Source $source): string
    {
        if ($source->source_type === 'url' && $source->url) {
            $response = Http::timeout(15)
                ->withHeaders(['User-Agent' => 'Beneath/1.0 Intelligence Platform'])
                ->get($source->url);

            if (!$response->successful()) {
                throw new \RuntimeException('HTTP ' . $response->status() . ' fetching URL');
            }

            $html = $response->body();
            $text = strip_tags($html);
            $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $text = preg_replace('/\s+/', ' ', $text);
            return trim(substr($text, 0, 50000));
        }

        if ($source->source_type === 'file' && $source->file_path) {
            $path = storage_path('app/' . $source->file_path);
            if (!file_exists($path)) {
                throw new \RuntimeException('File not found');
            }

            $mime = $source->file_mime ?? '';

            if (str_contains($mime, 'html')) {
                $text = strip_tags(file_get_contents($path));
                return trim(substr(preg_replace('/\s+/', ' ', $text), 0, 50000));
            }

            if (str_contains($mime, 'pdf')) {
                $escaped = escapeshellarg($path);
                $text    = shell_exec("pdftotext {$escaped} - 2>/dev/null");
                if (!empty($text)) {
                    return trim(substr($text, 0, 50000));
                }
            }

            // Plain text, markdown, csv, etc.
            return trim(substr(file_get_contents($path), 0, 50000));
        }

        return '';
    }
}
