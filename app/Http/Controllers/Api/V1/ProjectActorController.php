<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\Actor;
use App\Models\Project;
use App\Models\ProjectActorLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectActorController extends Controller
{
    public function index(string $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $links = ProjectActorLink::where('project_id', $projectId)
            ->with('actor:id,display_name,actor_type,reliability_profile,trajectory')
            ->get();
        return response()->json(['data' => $links]);
    }

    public function store(Request $request, string $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $validated = $request->validate([
            'actor_id'           => 'required|string|size:36',
            'stance'             => 'nullable|in:party_line,independent,divergent,unknown',
            'predicted_reaction' => 'nullable|string|max:500',
            'linkage_notes'      => 'nullable|string',
        ]);

        Actor::findOrFail($validated['actor_id']);

        $link = ProjectActorLink::firstOrCreate(
            ['project_id' => $projectId, 'actor_id' => $validated['actor_id']],
            array_merge($validated, ['tenant_id' => $request->user()->tenant_id, 'project_id' => $projectId])
        );

        if (!$link->wasRecentlyCreated) {
            $link->update(array_filter($validated, fn($v) => $v !== null));
        }

        $link->load('actor:id,display_name,actor_type,reliability_profile,trajectory');
        return response()->json(['data' => $link], $link->wasRecentlyCreated ? 201 : 200);
    }

    public function update(Request $request, string $projectId, string $actorId): JsonResponse
    {
        $link = ProjectActorLink::where('project_id', $projectId)
            ->where('actor_id', $actorId)
            ->firstOrFail();

        $validated = $request->validate([
            'stance'             => 'nullable|in:party_line,independent,divergent,unknown',
            'predicted_reaction' => 'nullable|string|max:500',
            'linkage_notes'      => 'nullable|string',
        ]);

        $link->update($validated);
        $link->load('actor:id,display_name,actor_type,reliability_profile,trajectory');
        return response()->json(['data' => $link]);
    }

    public function destroy(string $projectId, string $actorId): JsonResponse
    {
        ProjectActorLink::where('project_id', $projectId)
            ->where('actor_id', $actorId)
            ->firstOrFail()
            ->delete();
        return response()->json(null, 204);
    }
}
