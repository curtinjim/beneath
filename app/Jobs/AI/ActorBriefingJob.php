<?php
namespace App\Jobs\AI;

use App\AI\BeneathAIProvider;
use App\Models\Actor;
use App\Models\ActorRelationship;
use App\Models\BehaviouralEvent;
use App\Models\ChatMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ActorBriefingJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 120;

    public function __construct(
        private string $actorId,
        private string $sessionId,
    ) {}

    public function handle(BeneathAIProvider $ai): void
    {
        $actor = Actor::findOrFail($this->actorId);

        $events = BehaviouralEvent::where('actor_id', $this->actorId)
            ->orderBy('event_date', 'desc')
            ->limit(30)
            ->get(['event_type', 'summary', 'reliability_grade', 'event_date'])
            ->toArray();

        $relationships = ActorRelationship::with([
                'targetActor:id,display_name,actor_type',
                'sourceActor:id,display_name,actor_type',
            ])
            ->where(function ($q) {
                $q->where('source_actor_id', $this->actorId)->orWhere('target_actor_id', $this->actorId);
            })
            ->limit(20)
            ->get()
            ->map(fn ($r) => [
                'type'        => $r->relationship_type,
                'direction'   => $r->direction,
                'other_actor' => $r->source_actor_id === $this->actorId
                    ? $r->targetActor?->display_name
                    : $r->sourceActor?->display_name,
            ])
            ->toArray();

        $actorData = [
            'id'                  => $actor->id,
            'display_name'        => $actor->display_name,
            'actor_type'          => $actor->actor_type,
            'reliability_profile' => $actor->reliability_profile,
            'trajectory'          => $actor->trajectory,
        ];

        try {
            $result   = $ai->actorBriefing($actorData, $events, $relationships);
            $briefing = $result['briefing'] ?? null;
            if (!$briefing) {
                $briefing = 'Briefing synthesis could not be completed.';
            }
        } catch (\Throwable) {
            $briefing = 'Briefing failed. Please try again.';
        }

        ChatMessage::create([
            'session_id' => $this->sessionId,
            'role'       => 'assistant',
            'content'    => $briefing,
            'voice'      => 'maisie',
        ]);
    }
}
