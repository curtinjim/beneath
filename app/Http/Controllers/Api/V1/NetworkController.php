<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\Actor;
use App\Models\ActorRelationship;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NetworkController extends Controller {

    public function show(Request $request, string $actorId): JsonResponse
    {
        Actor::findOrFail($actorId);

        $rels = ActorRelationship::with([
                'sourceActor:id,display_name,actor_type,reliability_profile',
                'targetActor:id,display_name,actor_type,reliability_profile',
            ])
            ->where(function ($q) use ($actorId) {
                $q->where('source_actor_id', $actorId)->orWhere('target_actor_id', $actorId);
            })->get();

        $connected = $rels->map(function ($rel) use ($actorId) {
            $other = $rel->source_actor_id === $actorId ? $rel->targetActor : $rel->sourceActor;
            if (!$other) return null;
            return [
                'actor'             => [
                    'id'                 => $other->id,
                    'display_name'       => $other->display_name,
                    'actor_type'         => $other->actor_type,
                    'reliability_profile'=> $other->reliability_profile,
                ],
                'relationship_type' => $rel->relationship_type,
                'direction'         => $rel->direction,
                'status'            => $rel->status,
            ];
        })->filter()->values();

        $compareId = $request->query('compare');
        $shared    = null;

        if ($compareId && $compareId !== $actorId) {
            $compareRelIds = ActorRelationship::where(function ($q) use ($compareId) {
                $q->where('source_actor_id', $compareId)->orWhere('target_actor_id', $compareId);
            })->get()->map(fn ($r) => $r->source_actor_id === $compareId
                ? $r->target_actor_id
                : $r->source_actor_id
            )->unique();

            $shared = $connected->filter(fn ($c) => $compareRelIds->contains($c['actor']['id']))->values();
        }

        return response()->json([
            'data' => [
                'connected' => $connected,
                'shared'    => $shared,
            ],
        ]);
    }
}
