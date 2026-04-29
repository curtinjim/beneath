<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\AI\ComputeDivergenceJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DivergenceController extends Controller
{
    public function show(string $actorId): JsonResponse
    {
        $cached = cache()->get("divergence:{$actorId}");
        return response()->json(['data' => $cached]);
    }

    public function compute(Request $request, string $actorId): JsonResponse
    {
        ComputeDivergenceJob::dispatch($actorId);
        return response()->json(['data' => ['status' => 'queued']], 202);
    }
}
