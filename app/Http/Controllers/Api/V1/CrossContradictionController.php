<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Jobs\AI\ComputeCrossContradictionJob;
use App\Models\Actor;
use Illuminate\Http\JsonResponse;

class CrossContradictionController extends Controller {

    public function show(string $actorId): JsonResponse
    {
        $actor = Actor::findOrFail($actorId);
        return response()->json([
            'data' => [
                'cross_contradictions'    => $actor->cross_contradictions ?? [],
                'cross_contradictions_at' => $actor->cross_contradictions_at,
            ],
        ]);
    }

    public function compute(string $actorId): JsonResponse
    {
        Actor::findOrFail($actorId);
        ComputeCrossContradictionJob::dispatch($actorId);
        return response()->json(['message' => 'Cross-contradiction analysis queued.']);
    }
}
