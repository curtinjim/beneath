<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\AI\ComputeTrajectoryJob;
use App\Models\Actor;
use Illuminate\Http\JsonResponse;

class TrajectoryController extends Controller
{
    /**
     * GET /api/v1/actors/{actorId}/trajectory
     */
    public function show(string $actorId): JsonResponse
    {
        $actor = Actor::findOrFail($actorId);

        return response()->json([
            'data' => [
                'trajectory'           => $actor->trajectory,
                'rationale'            => $actor->trajectory_rationale,
                'computed_at'          => $actor->trajectory_computed_at?->toISOString(),
            ],
        ]);
    }

    /**
     * POST /api/v1/actors/{actorId}/trajectory
     */
    public function compute(string $actorId): JsonResponse
    {
        Actor::findOrFail($actorId);
        ComputeTrajectoryJob::dispatch($actorId);
        return response()->json(['data' => ['status' => 'queued']], 202);
    }
}
