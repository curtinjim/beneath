<?php
namespace App\Jobs\AI;
use App\AI\BeneathAIProvider;
use App\Models\Project;
use App\Models\ProjectActorLink;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class SignalRelevanceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 90;

    public function __construct(private string $projectId) {}

    public function handle(BeneathAIProvider $ai): void
    {
        $project = Project::findOrFail($this->projectId);

        if (!$project->goal_statement) return;

        $actorIds = ProjectActorLink::where('project_id', $this->projectId)
            ->pluck('actor_id');

        if ($actorIds->isEmpty()) return;

        $signals = DB::table('harvesting_signals')
            ->whereIn('actor_id', $actorIds)
            ->whereNotNull('summary')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get(['id','signal_type','summary','confidence']);

        foreach ($signals as $signal) {
            try {
                $result = $ai->scoreSignalRelevance(
                    ['signal_type' => $signal->signal_type, 'summary' => $signal->summary, 'confidence' => $signal->confidence],
                    $project->goal_statement
                );
                $score = max(0, min(100, (int) ($result['score'] ?? 0)));
                $note  = $result['note'] ?? null;
            } catch (\Throwable) {
                continue;
            }

            DB::table('project_signal_scores')->upsert([
                'project_id'      => $this->projectId,
                'signal_id'       => $signal->id,
                'relevance_score' => $score,
                'relevance_note'  => $note,
                'scored_at'       => now(),
            ], ['project_id','signal_id'], ['relevance_score','relevance_note','scored_at']);
        }
    }
}
