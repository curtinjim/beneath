<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantActive
{
    /**
     * Reject requests from suspended tenants.
     * Allows through: /api/v1/auth/logout, /api/v1/billing/*, /api/v1/tenant
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user) return $next($request);

        $tenant = $user->tenant;
        if (!$tenant) return $next($request);

        // Always allow billing and tenant routes so they can resubscribe
        $passthrough = [
            'api/v1/billing',
            'api/v1/tenant',
            'api/v1/auth/logout',
        ];

        foreach ($passthrough as $prefix) {
            if ($request->is($prefix) || $request->is($prefix . '/*')) {
                return $next($request);
            }
        }

        if ($tenant->isSuspended()) {
            return response()->json([
                'message' => 'Your account has been suspended. Please update your billing details.',
                'code'    => 'tenant_suspended',
            ], 402);
        }

        if ($tenant->isTrialExpired() && !$tenant->stripe_subscription_id) {
            return response()->json([
                'message' => 'Your trial has expired. Please choose a plan to continue.',
                'code'    => 'trial_expired',
            ], 402);
        }

        return $next($request);
    }
}
