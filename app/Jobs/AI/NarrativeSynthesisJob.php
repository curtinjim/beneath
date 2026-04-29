<?php
namespace App\Jobs\AI;

use App\AI\BeneathAIProvider;
use App\Models\BehaviouralEvent;
use App\Models\ChatMessage;
use App\Models\Project;
use App\Models\ProjectActorLink;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class NarrativeSynthesisJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 120;

    public function __construct(
        private string  $projectId,
        private ?string $sessionId = null,
    ) {}

    public function handle(BeneathAIProvider $ai): void
    {
        $project = Project::findOrFail($this->projectId);

        $links = ProjectActorLink::where('project_id', $this->projectId)
            ->with('actor:id,display_name,actor_type,reliability_profile,trajectory')
            ->get();

        if ($links->isEmpty()) {
            $narrative = 'No actors linked to this project.';
            DB::table('projects')->where('id', $this->projectId)->update([
                'narrative'    => $narrative,
                'narrative_at' => now(),
            ]);
            $this->postToSession($narrative);
            return;
        }

        $actorSummaries = $links->map(function ($link) {
            $actor = $link->actor;
            if (!$actor) return null;

            $events = BehaviouralEvent::where('actor_id', $actor->id)
                ->whereIn('event_type', ['claim','commitment','position','admission','denial','action'])
                ->orderBy('event_date', 'desc')
                ->limit(15)
                ->get(['event_type','summary','event_date','reliability_grade'])
                ->toArray();

            return [
                'actor' => [
                    'id'                  => $actor->id,
                    'display_name'        => $actor->display_name,
                    'actor_type'          => $actor->actor_type,
                    'reliability_profile' => $actor->reliability_profile,
                    'trajectory'          => $actor->trajectory,
                ],
                'stance'             => $link->stance,
                'predicted_reaction' => $link->predicted_reaction,
                'linkage_notes'      => $link->linkage_notes,
                'recent_events'      => $events,
            ];
        })->filter()->values()->toArray();

        $projectContext = [
            'name'           => $project->name,
            'goal_statement' => $project->goal_statement,
            'description'    => $project->description,
            'actor_count'    => count($actorSummaries),
        ];

        try {
            $result    = $ai->synthesizeNarrative($projectContext, $actorSummaries);
            $narrative = $result['narrative'] ?? 'Synthesis could not be completed.';
        } catch (\Throwable) {
            $narrative = 'Synthesis failed. Please try again.';
        }

        DB::table('projects')->where('id', $this->projectId)->update([
            'narrative'    => $narrative,
            'narrative_at' => now(),
        ]);

        $this->postToSession($narrative);
    }

    private function postToSession(string $content): void
    {
        if (!$this->sessionId) return;

        ChatMessage::create([
            'session_id' => $this->sessionId,
            'role'       => 'assistant',
            'content'    => $content,
            'voice'      => 'maisie',
        ]);
    }
}
