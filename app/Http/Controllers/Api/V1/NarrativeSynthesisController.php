<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\AI\NarrativeSynthesisJob;
use App\Models\Project;
use Illuminate\Http\JsonResponse;

class NarrativeSynthesisController extends Controller
{
    public function show(string $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        return response()->json([
            'data' => [
                'narrative'    => $project->narrative,
                'narrative_at' => $project->narrative_at,
            ],
        ]);
    }

    // Bug 1 fix: route registers 'generate', controller had 'compute' — renamed to match
    public function generate(string $projectId): JsonResponse
    {
        Project::findOrFail($projectId);
        NarrativeSynthesisJob::dispatch($projectId);
        return response()->json(['message' => 'Narrative synthesis queued.']);
    }
}
