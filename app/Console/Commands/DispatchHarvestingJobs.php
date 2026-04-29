<?php

namespace App\Console\Commands;

use App\Jobs\HarvestActorJob;
use App\Models\Actor;
use App\Models\HarvestingRun;
use Illuminate\Console\Command;

class DispatchHarvestingJobs extends Command
{
    protected $signature   = 'harvesting:dispatch';
    protected $description = 'Dispatch harvesting jobs for Actors past their interval threshold.';

    public function handle(): int
    {
        $this->markStaleRuns();
        $this->dispatchDueActors();
        return self::SUCCESS;
    }

    private function dispatchDueActors(): void
    {
        $dispatched = 0;

        Actor::withoutGlobalScopes()
            ->where('pool', 'commons')
            ->where('dormancy_state', '!=', 'archived') // BD-28: archived actors never harvested
            ->chunk(200, function ($actors) use (&$dispatched) {
                foreach ($actors as $actor) {
                    $threshold = $this->intervalThreshold($actor);
                    if ($threshold === null) continue;

                    $lastEnriched = $actor->last_enriched_at;
                    $isDue = $lastEnriched === null || $lastEnriched->lt(now()->sub($threshold));

                    if ($isDue) {
                        $alreadyRunning = HarvestingRun::where('actor_id', $actor->id)
                            ->where('status', 'running')
                            ->where('started_at', '>', now()->subHours(2))
                            ->exists();

                        if (!$alreadyRunning) {
                            HarvestActorJob::dispatch($actor->id, 'interval', false);
                            $dispatched++;
                        }
                    }
                }
            });

        $this->info("Dispatched {$dispatched} harvesting jobs.");
    }

    private function intervalThreshold(Actor $actor): ?\DateInterval
    {
        if ($actor->dormancy_state === 'dormant') {
            return new \DateInterval('P30D'); // monthly
        }

        $isActive = HarvestingRun::where('actor_id', $actor->id)
            ->where('trigger', 'manual')
            ->where('started_at', '>', now()->subDays(30))
            ->exists();

        if ($isActive) {
            return new \DateInterval('P1D'); // daily
        }

        return new \DateInterval('P7D'); // weekly default
    }

    private function markStaleRuns(): void
    {
        $stale = HarvestingRun::where('status', 'running')
            ->where('started_at', '<', now()->subHours(2))
            ->get();

        foreach ($stale as $run) {
            $run->update([
                'status'        => 'failed',
                'completed_at'  => now(),
                'error_message' => 'Run marked stale — worker likely crashed.',
            ]);

            HarvestActorJob::dispatch($run->actor_id, 'interval', false);
        }

        if ($stale->count() > 0) {
            $this->warn("Marked {$stale->count()} stale runs failed and re-dispatched.");
        }
    }
}
