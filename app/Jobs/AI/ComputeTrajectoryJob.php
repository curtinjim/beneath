<?php
namespace App\Jobs\AI;

use App\AI\BeneathAIProvider;
use App\Models\Actor;
use App\Models\BehaviouralEvent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class ComputeTrajectoryJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 60;

    public function __construct(public string $actorId) {}

    public function handle(BeneathAIProvider $ai): void
    {
        $actor = Actor::withoutGlobalScopes()->find($this->actorId);
        if (!$actor) return;

        $events = BehaviouralEvent::withoutGlobalScopes()
            ->where('actor_id', $this->actorId)
            ->whereNotNull('event_date')
            ->orderBy('event_date', 'asc')
            ->limit(40)
            ->get(['id', 'event_type', 'summary', 'reliability_grade', 'event_date'])
            ->toArray();

        if (count($events) < 3) return;

        $actorContext = [
            'id'           => $actor->id,
            'display_name' => $actor->display_name,
            'actor_type'   => $actor->actor_type,
        ];

        $result = $ai->computeTrajectory($events, $actorContext);

        if (empty($result['trajectory'])) return;

        DB::table('actors')
            ->where('id', $this->actorId)
            ->update([
                'trajectory'              => $result['trajectory'],
                'trajectory_rationale'    => $result['rationale'] ?? null,
                'trajectory_computed_at'  => now(),
                'updated_at'              => now(),
            ]);
    }
}
