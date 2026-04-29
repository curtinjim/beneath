<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\StripeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class BillingController extends Controller
{
    public function __construct(private StripeService $stripe) {}

    /** GET /api/v1/billing */
    public function show(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        return response()->json([
            'plan'             => $tenant->plan,
            'seat_limit'       => $tenant->seat_limit,
            'seats_used'       => $tenant->activeUserCount(),
            'trial_ends'       => $tenant->trial_ends_at?->toDateString(),
            'trial_expired'    => $tenant->isTrialExpired(),
            'suspended'        => $tenant->isSuspended(),
            'has_subscription' => (bool) $tenant->stripe_subscription_id,
            'plans'            => $this->planList(),
        ]);
    }

    /** POST /api/v1/billing/checkout */
    public function checkout(Request $request): JsonResponse
    {
        $this->authorizeOwner($request);

        $data = $request->validate(['price_id' => 'required|string']);

        $url = $this->stripe->createCheckoutSession(
            $request->user()->tenant,
            $data['price_id']
        );

        return response()->json(['url' => $url]);
    }

    /** POST /api/v1/billing/portal */
    public function portal(Request $request): JsonResponse
    {
        $this->authorizeOwner($request);
        abort_if(!$request->user()->tenant->stripe_customer_id, 422, 'No billing account yet.');

        $url = $this->stripe->createPortalSession($request->user()->tenant);

        return response()->json(['url' => $url]);
    }

    /** POST /api/v1/billing/webhook  (no auth — verified by signature) */
    public function webhook(Request $request): Response
    {
        $event = $this->stripe->parseWebhook(
            $request->getContent(),
            $request->header('Stripe-Signature', '')
        );

        $this->stripe->handleEvent($event);

        return response('', 200);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function authorizeOwner(Request $request): void
    {
        abort_if($request->user()->role !== 'owner', 403, 'Owner access required.');
    }

    private function planList(): array
    {
        return [
            [
                'id'         => 'starter',
                'name'       => 'Starter',
                'seats'      => 5,
                'price_id'   => config('billing.price_starter'),
                'price_gbp'  => 49,
            ],
            [
                'id'         => 'growth',
                'name'       => 'Growth',
                'seats'      => 15,
                'price_id'   => config('billing.price_growth'),
                'price_gbp'  => 149,
            ],
            [
                'id'         => 'enterprise',
                'name'       => 'Enterprise',
                'seats'      => 999,
                'price_id'   => null,
                'price_gbp'  => null, // contact sales
            ],
        ];
    }
}
