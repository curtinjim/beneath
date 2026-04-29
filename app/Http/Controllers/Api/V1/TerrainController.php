<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\Actor;
use App\Models\Terrain;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TerrainController extends Controller
{
    public function index(string $actorId): JsonResponse
    {
        Actor::findOrFail($actorId);
        $terrain = Terrain::where('actor_id', $actorId)
            ->with('relatedActor:id,display_name,actor_type,reliability_profile')
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();
        return response()->json(['data' => $terrain]);
    }

    public function store(Request $request, string $actorId): JsonResponse
    {
        Actor::findOrFail($actorId);
        $validated = $request->validate([
            'category'         => 'required|in:location,access_zone,affiliation,background,operational,personnel',
            'label'            => 'required|string|max:200',
            'value'            => 'required|string',
            'related_actor_id' => 'nullable|string|size:36',
            'notes'            => 'nullable|string',
            'reliability_grade'=> 'nullable|in:bedrock,rock,sand,mud,fog',
            'sort_order'       => 'nullable|integer|min:0',
        ]);
        $entry = Terrain::create(array_merge($validated, [
            'tenant_id' => $request->user()->tenant_id,
            'actor_id'  => $actorId,
        ]));
        $entry->load('relatedActor:id,display_name,actor_type,reliability_profile');
        return response()->json(['data' => $entry], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $entry = Terrain::findOrFail($id);
        $validated = $request->validate([
            'category'         => 'sometimes|required|in:location,access_zone,affiliation,background,operational,personnel',
            'label'            => 'sometimes|required|string|max:200',
            'value'            => 'sometimes|required|string',
            'related_actor_id' => 'nullable|string|size:36',
            'notes'            => 'nullable|string',
            'reliability_grade'=> 'nullable|in:bedrock,rock,sand,mud,fog',
            'sort_order'       => 'nullable|integer|min:0',
        ]);
        $entry->update($validated);
        $entry->load('relatedActor:id,display_name,actor_type,reliability_profile');
        return response()->json(['data' => $entry]);
    }

    public function destroy(string $id): JsonResponse
    {
        Terrain::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
