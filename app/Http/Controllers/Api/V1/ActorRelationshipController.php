<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\RelationshipRequest;
use App\Http\Resources\Api\V1\RelationshipResource;
use App\Models\Actor;
use App\Models\ActorRelationship;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class ActorRelationshipController extends Controller {

    public function index(string $actorId): AnonymousResourceCollection {
        Actor::findOrFail($actorId);
        $rels = ActorRelationship::with([
                'sourceActor:id,display_name,actor_type,reliability_profile',
                'targetActor:id,display_name,actor_type,reliability_profile',
            ])
            ->where(function($q) use ($actorId) {
                $q->where('source_actor_id', $actorId)->orWhere('target_actor_id', $actorId);
            })->get();
        return RelationshipResource::collection($rels);
    }

    public function store(RelationshipRequest $request, string $actorId): JsonResponse {
        Actor::findOrFail($actorId);
        $data = $request->validated();
        $data['id']              = (string) Str::uuid();
        $data['tenant_id']       = $request->user()->tenant_id;
        $data['source_actor_id'] = $actorId;
        $rel = ActorRelationship::withoutGlobalScopes()->create($data);
        $rel->load([
            'sourceActor:id,display_name,actor_type,reliability_profile',
            'targetActor:id,display_name,actor_type,reliability_profile',
        ]);
        return (new RelationshipResource($rel))->response()->setStatusCode(201);
    }

    public function update(RelationshipRequest $request, string $id): JsonResponse {
        $rel = ActorRelationship::findOrFail($id);
        $rel->update($request->validated());
        $rel->load([
            'sourceActor:id,display_name,actor_type,reliability_profile',
            'targetActor:id,display_name,actor_type,reliability_profile',
        ]);
        return (new RelationshipResource($rel))->response();
    }

    public function destroy(string $id): JsonResponse {
        ActorRelationship::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
