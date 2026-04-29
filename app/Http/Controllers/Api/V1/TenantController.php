<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TenantAiConfig;
use App\Services\TenantProvisioningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantController extends Controller
{
    public function __construct(private TenantProvisioningService $provisioner) {}

    /** GET /api/v1/tenant */
    public function show(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        return response()->json([
            'id'               => $tenant->id,
            'name'             => $tenant->name,
            'plan'             => $tenant->plan,
            'seat_limit'       => $tenant->seat_limit,
            'seats_used'       => $tenant->activeUserCount(),
            'trial_ends'       => $tenant->trial_ends_at?->toDateString(),
            'is_trial'         => $tenant->isOnTrial(),
            'trial_expired'    => $tenant->isTrialExpired(),
            'suspended'        => $tenant->isSuspended(),
            'onboarding_done'  => $tenant->onboardingComplete(),
            'timezone'         => $tenant->timezone,
        ]);
    }

    /** PATCH /api/v1/tenant */
    public function update(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'name'          => 'sometimes|string|max:120',
            'billing_email' => 'sometimes|email',
            'timezone'      => 'sometimes|string|max:64',
        ]);

        $request->user()->tenant->update($data);

        return response()->json(['ok' => true]);
    }

    /** POST /api/v1/tenant/complete-onboarding */
    public function completeOnboarding(Request $request): JsonResponse
    {
        $this->provisioner->completeOnboarding($request->user()->tenant);
        return response()->json(['ok' => true]);
    }

    // ── AI config ─────────────────────────────────────────────────────────────

    /** GET /api/v1/tenant/ai-config */
    public function aiConfig(Request $request): JsonResponse
    {
        $config = $request->user()->tenant->aiConfig;

        return response()->json($config ? [
            'provider'            => $config->provider,
            'endpoint'            => $config->endpoint,
            'model'               => $config->model,
            'has_api_key'         => $config->hasApiKey(),
            'fallback_to_default' => $config->fallback_to_default,
        ] : [
            'provider'            => null,
            'endpoint'            => null,
            'model'               => null,
            'has_api_key'         => false,
            'fallback_to_default' => true,
        ]);
    }

    /** PUT /api/v1/tenant/ai-config */
    public function updateAiConfig(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'provider'            => 'nullable|in:ollama,openai,anthropic',
            'endpoint'            => 'nullable|url',
            'model'               => 'nullable|string|max:128',
            'api_key'             => 'nullable|string|max:256',
            'fallback_to_default' => 'boolean',
        ]);

        $tenant = $request->user()->tenant;
        $config = TenantAiConfig::firstOrNew(['tenant_id' => $tenant->id]);
        $config->fill([
            'tenant_id'           => $tenant->id,
            'provider'            => $data['provider'] ?? $config->provider,
            'endpoint'            => $data['endpoint'] ?? $config->endpoint,
            'model'               => $data['model']    ?? $config->model,
            'fallback_to_default' => $data['fallback_to_default'] ?? true,
        ]);

        if (!empty($data['api_key'])) {
            $config->setApiKey($data['api_key']);
        }

        $config->save();

        return response()->json(['ok' => true]);
    }

    // ── Usage ─────────────────────────────────────────────────────────────────

    /** GET /api/v1/tenant/usage */
    public function usage(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        $rows = \DB::table('usage_events')
            ->where('tenant_id', $tenant->id)
            ->where('occurred_at', '>=', now()->startOfMonth())
            ->selectRaw('event_type, SUM(quantity) as total')
            ->groupBy('event_type')
            ->pluck('total', 'event_type');

        return response()->json([
            'month'  => now()->format('Y-m'),
            'events' => $rows,
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function authorizeAdmin(Request $request): void
    {
        abort_if(!in_array($request->user()->role, ['owner', 'admin']), 403, 'Admin access required.');
    }
}
