<?php
namespace App\Jobs\AI;

use App\AI\BeneathAIProvider;
use App\Models\BehaviouralEvent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class ComputeActorSplitJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 60;

    public function __construct(public string $actorId) {}

    public function handle(BeneathAIProvider $ai): void
    {
        $actor = DB::table('actors')->where('id', $this->actorId)->first();
        if (!$actor) return;

        $events = BehaviouralEvent::where('actor_id', $this->actorId)
            ->orderBy('event_date')
            ->limit(50)
            ->get(['id', 'event_type', 'summary', 'content', 'event_date', 'reliability_grade'])
            ->toArray();

        if (count($events) < 5) {
            DB::table('actors')->where('id', $this->actorId)->update([
                'split_suggested' => false,
                'split_rationale' => 'Insufficient events to assess split (minimum 5 required).',
            ]);
            return;
        }

        $actorContext = [
            'display_name'      => $actor->display_name,
            'actor_type'        => $actor->actor_type,
            'reliability_profile' => $actor->reliability_profile,
        ];

        $result = $ai->assessSplit($events, $actorContext);

        DB::table('actors')->where('id', $this->actorId)->update([
            'split_suggested' => $result['split_suggested'] ?? false,
            'split_rationale' => $result['rationale'] ?? null,
        ]);
    }
}
