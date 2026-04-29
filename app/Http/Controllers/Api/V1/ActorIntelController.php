<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\AI\ComputeActorSplitJob;
use App\Jobs\AI\ComputeCanaryJob;
use App\Models\Actor;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ActorIntelController extends Controller
{
    // ── Split detection ─────────────────────────────────────────

    public function computeSplit(string $actorId): JsonResponse
    {
        Actor::findOrFail($actorId);
        ComputeActorSplitJob::dispatch($actorId);
        return response()->json(['data' => ['status' => 'queued']], 202);
    }

    public function confirmSplit(string $actorId): JsonResponse
    {
        $original = Actor::findOrFail($actorId);

        $newActor = Actor::create([
            'id'                 => (string) Str::uuid(),
            'tenant_id'          => $original->tenant_id,
            'actor_type'         => $original->actor_type,
            'pool'               => $original->pool,
            'project_id'         => $original->project_id,
            'display_name'       => $original->display_name . ' (Split)',
            'reliability_profile'=> 'sand',
            'trajectory'         => 'unclear',
            'dormancy_state'     => 'active',
            'importance_tier'    => 'unclassified',
        ]);

        $original->update(['split_suggested' => false, 'split_rationale' => null]);

        return response()->json(['data' => ['new_actor_id' => $newActor->id]], 201);
    }

    public function dismissSplit(string $actorId): JsonResponse
    {
        $actor = Actor::findOrFail($actorId);
        $actor->update(['split_suggested' => false, 'split_rationale' => null]);
        return response()->json(null, 204);
    }

    // ── Canary marker ────────────────────────────────────────────

    public function computeCanary(string $actorId): JsonResponse
    {
        Actor::findOrFail($actorId);
        ComputeCanaryJob::dispatch($actorId);
        return response()->json(['data' => ['status' => 'queued']], 202);
    }

    public function setCanary(string $actorId): JsonResponse
    {
        $actor = Actor::findOrFail($actorId);
        $actor->update(['canary_marker' => true]);
        return response()->json(['data' => ['canary_marker' => true]]);
    }

    public function clearCanary(string $actorId): JsonResponse
    {
        $actor = Actor::findOrFail($actorId);
        $actor->update(['canary_marker' => false, 'canary_rationale' => null]);
        return response()->json(null, 204);
    }
}
