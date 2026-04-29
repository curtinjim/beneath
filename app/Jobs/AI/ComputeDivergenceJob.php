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

class ComputeDivergenceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public string $actorId) {}

    public function handle(BeneathAIProvider $ai): void
    {
        $events = BehaviouralEvent::withoutGlobalScopes()
            ->where('actor_id', $this->actorId)
            ->whereIn('event_type', ['claim', 'commitment', 'position', 'denial', 'action'])
            ->orderBy('event_date', 'desc')
            ->limit(50)
            ->get(['id', 'event_type', 'summary', 'reliability_grade', 'event_date'])
            ->toArray();

        if (count($events) < 5) return;

        $result = $ai->computeDivergence($events);

        cache()->put("divergence:{$this->actorId}", $result, now()->addHours(24));
    }
}
