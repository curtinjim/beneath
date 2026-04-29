<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class StripeService
{
    private string $secretKey;
    private string $baseUrl = 'https://api.stripe.com/v1';

    public function __construct()
    {
        $this->secretKey = config('billing.stripe_secret');
    }

    // ── Customer ──────────────────────────────────────────────────────────────

    public function createCustomer(Tenant $tenant): string
    {
        $res = $this->post('/customers', [
            'name'  => $tenant->name,
            'email' => $tenant->billing_email,
            'metadata' => ['tenant_id' => $tenant->id],
        ]);

        $tenant->update(['stripe_customer_id' => $res['id']]);
        return $res['id'];
    }

    public function getOrCreateCustomer(Tenant $tenant): string
    {
        if ($tenant->stripe_customer_id) return $tenant->stripe_customer_id;
        return $this->createCustomer($tenant);
    }

    // ── Checkout ──────────────────────────────────────────────────────────────

    /**
     * Create a Stripe Checkout session for a plan upgrade.
     * Returns the checkout URL to redirect to.
     */
    public function createCheckoutSession(Tenant $tenant, string $priceId): string
    {
        $customerId = $this->getOrCreateCustomer($tenant);

        $res = $this->post('/checkout/sessions', [
            'customer'             => $customerId,
            'mode'                 => 'subscription',
            'line_items[0][price]' => $priceId,
            'line_items[0][quantity]' => 1,
            'success_url'          => config('app.url') . '/billing?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url'           => config('app.url') . '/billing?cancelled=1',
            'metadata'             => ['tenant_id' => $tenant->id],
        ]);

        return $res['url'];
    }

    /**
     * Create a billing portal session so the tenant can manage their subscription.
     */
    public function createPortalSession(Tenant $tenant): string
    {
        $customerId = $this->getOrCreateCustomer($tenant);

        $res = $this->post('/billing_portal/sessions', [
            'customer'   => $customerId,
            'return_url' => config('app.url') . '/billing',
        ]);

        return $res['url'];
    }

    // ── Webhook handling ──────────────────────────────────────────────────────

    /**
     * Verify and parse a Stripe webhook payload.
     * Returns the event array or throws on invalid signature.
     */
    public function parseWebhook(string $payload, string $sigHeader): array
    {
        $secret    = config('billing.stripe_webhook_secret');
        $tolerance = 300; // seconds

        // Parse Stripe-Signature header
        $parts = [];
        foreach (explode(',', $sigHeader) as $part) {
            [$k, $v] = explode('=', $part, 2);
            $parts[$k][] = $v;
        }

        $timestamp = (int) ($parts['t'][0] ?? 0);
        abort_if(abs(time() - $timestamp) > $tolerance, 400, 'Webhook timestamp too old.');

        $signed   = $timestamp . '.' . $payload;
        $expected = hash_hmac('sha256', $signed, $secret);
        $given    = $parts['v1'][0] ?? '';

        abort_if(!hash_equals($expected, $given), 400, 'Invalid webhook signature.');

        return json_decode($payload, true);
    }

    /**
     * Handle a verified Stripe event.
     */
    public function handleEvent(array $event): void
    {
        $type   = $event['type'];
        $object = $event['data']['object'];

        match ($type) {
            'checkout.session.completed'        => $this->onCheckoutCompleted($object),
            'customer.subscription.updated'     => $this->onSubscriptionUpdated($object),
            'customer.subscription.deleted'     => $this->onSubscriptionDeleted($object),
            'invoice.payment_failed'            => $this->onPaymentFailed($object),
            default                             => null,
        };
    }

    // ── Event handlers ────────────────────────────────────────────────────────

    private function onCheckoutCompleted(array $session): void
    {
        $tenantId = $session['metadata']['tenant_id'] ?? null;
        if (!$tenantId) return;

        $tenant = Tenant::find($tenantId);
        if (!$tenant) return;

        $tenant->update([
            'stripe_subscription_id' => $session['subscription'],
            'stripe_price_id'        => $session['line_items']['data'][0]['price']['id'] ?? null,
        ]);

        // Resolve plan name from price ID
        $plan = $this->planFromPriceId($tenant->stripe_price_id);
        app(TenantProvisioningService::class)->changePlan($tenant, $plan);

        Log::info("Tenant {$tenantId} upgraded to {$plan}");
    }

    private function onSubscriptionUpdated(array $sub): void
    {
        $tenant = Tenant::where('stripe_subscription_id', $sub['id'])->first();
        if (!$tenant) return;

        $priceId = $sub['items']['data'][0]['price']['id'] ?? null;
        $plan    = $this->planFromPriceId($priceId);

        $tenant->update(['stripe_price_id' => $priceId]);
        app(TenantProvisioningService::class)->changePlan($tenant, $plan);

        if ($sub['status'] === 'active' && $tenant->isSuspended()) {
            app(TenantProvisioningService::class)->reinstate($tenant);
        }
    }

    private function onSubscriptionDeleted(array $sub): void
    {
        $tenant = Tenant::where('stripe_subscription_id', $sub['id'])->first();
        if (!$tenant) return;

        app(TenantProvisioningService::class)->changePlan($tenant, 'trial');
        app(TenantProvisioningService::class)->suspend($tenant);
    }

    private function onPaymentFailed(array $invoice): void
    {
        $tenant = Tenant::where('stripe_customer_id', $invoice['customer'])->first();
        if (!$tenant) return;

        // After 3 attempts Stripe cancels; we just log here.
        // Suspension happens on subscription.deleted.
        Log::warning("Payment failed for tenant {$tenant->id}");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function planFromPriceId(?string $priceId): string
    {
        $map = config('billing.price_plan_map', []);
        return $map[$priceId] ?? 'starter';
    }

    private function post(string $path, array $params): array
    {
        $res = Http::withBasicAuth($this->secretKey, '')
            ->asForm()
            ->post($this->baseUrl . $path, $params);

        abort_if($res->failed(), 502, 'Stripe API error: ' . $res->body());

        return $res->json();
    }
}
