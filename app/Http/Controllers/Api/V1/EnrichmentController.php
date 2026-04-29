<?php
namespace App\Http\Controllers\Api\V1;

use App\AI\BeneathAIProvider;
use App\Http\Controllers\Controller;
use App\Jobs\AI\EnrichActorJob;
use App\Models\Actor;
use App\Models\ActorEnrichment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class EnrichmentController extends Controller
{
    public function trigger(Request $request, string $actorId): JsonResponse
    {
        $actor = Actor::findOrFail($actorId);

        $enrichment = ActorEnrichment::create([
            'tenant_id' => auth()->user()->tenant_id,
            'actor_id'  => $actorId,
            'status'    => 'pending',
        ]);

        EnrichActorJob::dispatch($enrichment->id, $actorId);

        return response()->json([
            'job_id' => $enrichment->id,
            'status' => 'pending',
        ], 202);
    }

    public function status(Request $request, string $actorId): JsonResponse
    {
        $enrichment = ActorEnrichment::where('actor_id', $actorId)
            ->where('tenant_id', auth()->user()->tenant_id)
            ->latest()
            ->first();

        if (!$enrichment) {
            return response()->json(['status' => 'none']);
        }

        $data = ['status' => $enrichment->status, 'job_id' => $enrichment->id];

        if ($enrichment->status === 'done') {
            $data['enrichment_fields']        = $enrichment->enrichment_fields;
            $data['leverage_read_suggestion'] = $enrichment->leverage_read_suggestion;
            $data['enriched_at']              = $enrichment->updated_at;
        }

        return response()->json($data);
    }

    public function applyField(Request $request, string $actorId): JsonResponse
    {
        $validated = $request->validate([
            'field' => 'required|string',
            'value' => 'required',
        ]);

        $allowed = [
            'reliability_profile','trajectory','dormancy_state',
            'importance_tier','tags','notes',
        ];

        if (!in_array($validated['field'], $allowed)) {
            return response()->json(['error' => 'Field not applicable'], 422);
        }

        $actor = Actor::findOrFail($actorId);
        $actor->update([$validated['field'] => $validated['value']]);

        return response()->json(['ok' => true]);
    }

    // BD-33: synchronous enrichment preview before first actor save
    public function preview(Request $request): JsonResponse
    {
        $request->validate([
            'display_name'       => 'required|string|max:255',
            'actor_type'         => 'nullable|string',
            'primary_email'      => 'nullable|string',
            'notes'              => 'nullable|string',
        ]);

        $ai = app(BeneathAIProvider::class);

        $inputData = [
            'operatorEnteredFields' => $request->only([
                'display_name','actor_type','primary_email','notes',
            ]),
            'sources' => [],
        ];

        $result = $ai->generateEnrichmentFields($inputData);

        return response()->json(['data' => $result]);
    }
}
