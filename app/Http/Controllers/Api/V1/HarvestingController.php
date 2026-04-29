<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\HarvestingSignalResource;
use App\Jobs\HarvestActorJob;
use App\Models\Actor;
use App\Models\HarvestingRun;
use App\Models\HarvestingSignal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class HarvestingController extends Controller
{
    /**
     * POST /api/v1/actors/{actorId}/harvest
     * Dispatch a harvesting run. Returns 202 immediately.
     */
    public function trigger(Request $request, string $actorId): JsonResponse
    {
        $actor = Actor::findOrFail($actorId);

        // Vault Actors require explicit confirmation (HARV-CON-002)
        if ($actor->pool === 'vault' && !$request->boolean('vault_confirmed')) {
            return response()->json([
                'error' => 'Vault Actor harvesting requires vault_confirmed: true in the request body.',
            ], 403);
        }

        $run = HarvestActorJob::dispatch(
            $actor->id,
            'manual',
            $request->boolean('vault_confirmed')
        );

        // Return the most recently created run ID for polling
        $latestRun = HarvestingRun::where('actor_id', $actorId)
            ->orderByDesc('started_at')
            ->first();

        return response()->json([
            'data' => [
                'harvesting_run_id' => $latestRun?->id,
                'message'           => 'Harvesting job dispatched.',
            ],
        ], 202);
    }

    /**
     * GET /api/v1/actors/{actorId}/harvesting-runs
     */
    public function runs(string $actorId): JsonResponse
    {
        Actor::findOrFail($actorId);

        $runs = HarvestingRun::where('actor_id', $actorId)
            ->orderByDesc('started_at')
            ->limit(20)
            ->get();

        return response()->json(['data' => $runs]);
    }

    /**
     * GET /api/v1/actors/{actorId}/signals
     * Per-actor pending signals.
     */
    public function actorSignals(Request $request, string $actorId): JsonResponse
    {
        Actor::findOrFail($actorId);

        $query = HarvestingSignal::where('actor_id', $actorId);

        $query->where('status', $request->get('status', 'pending'));

        if ($request->has('signal_type')) {
            $query->where('signal_type', $request->signal_type);
        }
        if ($request->has('source_id')) {
            $query->where('source_id', $request->source_id);
        }

        $signals = $query->orderByDesc('created_at')->get();

        return response()->json(['data' => HarvestingSignalResource::collection($signals)]);
    }

    /**
     * GET /api/v1/harvesting/status
     * Tenant-wide harvesting health.
     */
    public function status(): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;

        $pendingBySource = HarvestingSignal::where('tenant_id', $tenantId)
            ->where('status', 'pending')
            ->selectRaw('source_id, COUNT(*) as count')
            ->groupBy('source_id')
            ->pluck('count', 'source_id');

        $activeRuns = HarvestingRun::where('tenant_id', $tenantId)
            ->where('status', 'running')
            ->where('started_at', '>', now()->subHours(2))
            ->count();

        $failedSources = HarvestingRun::where('tenant_id', $tenantId)
            ->where('status', 'failed')
            ->orderByDesc('started_at')
            ->limit(5)
            ->get(['actor_id', 'started_at', 'error_message']);

        $totalPending = HarvestingSignal::where('tenant_id', $tenantId)
            ->where('status', 'pending')
            ->count();

        return response()->json([
            'data' => [
                'total_pending'     => $totalPending,
                'pending_by_source' => $pendingBySource,
                'active_runs'       => $activeRuns,
                'failed_runs'       => $failedSources,
            ],
        ]);
    }
}
