<?php
namespace App\Jobs\AI;
use App\AI\BeneathAIProvider;
use App\Models\Actor;
use App\Models\ActorRelationship;
use App\Models\BehaviouralEvent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class ComputeCrossContradictionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 90;

    public function __construct(private string $actorId) {}

    public function handle(BeneathAIProvider $ai): void
    {
        $actor = Actor::findOrFail($this->actorId);

        // Our actor's claim-type events (most recent 10)
        $myEvents = BehaviouralEvent::where('actor_id', $this->actorId)
            ->whereIn('event_type', ['claim', 'commitment', 'position', 'denial'])
            ->orderBy('event_date', 'desc')
            ->limit(10)
            ->get(['id', 'event_type', 'summary', 'event_date']);

        if ($myEvents->isEmpty()) {
            DB::table('actors')->where('id', $this->actorId)->update([
                'cross_contradictions'    => json_encode([]),
                'cross_contradictions_at' => now(),
            ]);
            return;
        }

        // Related actor IDs (up to 5)
        $relatedIds = ActorRelationship::where(function ($q) {
                $q->where('source_actor_id', $this->actorId)
                  ->orWhere('target_actor_id', $this->actorId);
            })->get()
            ->map(fn ($r) => $r->source_actor_id === $this->actorId
                ? $r->target_actor_id
                : $r->source_actor_id
            )->unique()->take(5)->values();

        if ($relatedIds->isEmpty()) {
            DB::table('actors')->where('id', $this->actorId)->update([
                'cross_contradictions'    => json_encode([]),
                'cross_contradictions_at' => now(),
            ]);
            return;
        }

        $contradictions = [];

        foreach ($relatedIds as $relatedId) {
            $related = Actor::find($relatedId);
            if (!$related) continue;

            $theirEvents = BehaviouralEvent::where('actor_id', $relatedId)
                ->whereIn('event_type', ['claim', 'commitment', 'position', 'denial'])
                ->orderBy('event_date', 'desc')
                ->limit(6)
                ->get(['id', 'event_type', 'summary', 'event_date'])
                ->toArray();

            if (empty($theirEvents)) continue;

            // Check our 3 most recent events against this actor's set
            foreach ($myEvents->take(3) as $myEvent) {
                try {
                    $result = $ai->detectContradiction($myEvent->toArray(), $theirEvents);
                } catch (\Throwable) {
                    continue;
                }

                if ($result['contradictionDetected'] ?? false) {
                    $contradictions[] = [
                        'actor_id'       => $relatedId,
                        'actor_name'     => $related->display_name,
                        'our_event_id'   => $myEvent->id,
                        'their_event_id' => $result['contradictingEventId'] ?? null,
                        'confidence'     => $result['confidence'] ?? null,
                        'explanation'    => $result['explanation'] ?? null,
                    ];
                }
            }
        }

        DB::table('actors')->where('id', $this->actorId)->update([
            'cross_contradictions'    => json_encode($contradictions),
            'cross_contradictions_at' => now(),
        ]);
    }
}
