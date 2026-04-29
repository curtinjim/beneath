<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Jobs\AI\SignalRelevanceJob;
use App\Models\Project;
use App\Models\ProjectActorLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class SignalRelevanceController extends Controller
{
    public function index(string $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);

        $actorIds = ProjectActorLink::where('project_id', $projectId)
            ->pluck('actor_id');

        if ($actorIds->isEmpty()) {
            return response()->json(['data' => []]);
        }

        $signals = DB::table('harvesting_signals as s')
            ->leftJoin('project_signal_scores as pss', function ($join) use ($projectId) {
                $join->on('pss.signal_id', '=', 's.id')
                     ->where('pss.project_id', '=', $projectId);
            })
            ->whereIn('s.actor_id', $actorIds)
            ->select(
                's.id','s.actor_id','s.signal_type','s.summary',
                's.status','s.confidence','s.created_at',
                'pss.relevance_score','pss.relevance_note','pss.scored_at'
            )
            ->orderByDesc('pss.relevance_score')
            ->orderByDesc('s.created_at')
            ->limit(100)
            ->get();

        return response()->json(['data' => $signals]);
    }

    public function score(string $projectId): JsonResponse
    {
        Project::findOrFail($projectId);
        SignalRelevanceJob::dispatch($projectId);
        return response()->json(['message' => 'Signal relevance scoring queued.']);
    }
}
