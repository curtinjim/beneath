<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TenantProvisioningService
{
    /**
     * Create a new tenant and its first owner user.
     * Called during public registration.
     */
    public function provision(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $tenant = Tenant::create([
                'name'          => $data['org_name'],
                'plan'          => 'trial',
                'seat_limit'    => 3,
                'billing_email' => $data['email'],
                'trial_ends_at' => now()->addDays(14),
                'timezone'      => $data['timezone'] ?? 'UTC',
            ]);

            $user = User::create([
                'tenant_id' => $tenant->id,
                'name'      => $data['name'],
                'email'     => $data['email'],
                'password'  => Hash::make($data['password']),
                'role'      => 'owner',
                'status'    => 'active',
            ]);

            return compact('tenant', 'user');
        });
    }

    /**
     * Mark onboarding complete for a tenant.
     */
    public function completeOnboarding(Tenant $tenant): void
    {
        $tenant->update(['onboarding_completed_at' => now()]);
    }

    /**
     * Suspend a tenant (e.g. payment failure).
     */
    public function suspend(Tenant $tenant): void
    {
        $tenant->update(['suspended_at' => now()]);
    }

    /**
     * Reinstate a suspended tenant.
     */
    public function reinstate(Tenant $tenant): void
    {
        $tenant->update(['suspended_at' => null]);
    }

    /**
     * Upgrade tenant plan and update seat limit.
     */
    public function changePlan(Tenant $tenant, string $plan): void
    {
        $seats = match ($plan) {
            'starter'    => 5,
            'growth'     => 15,
            'enterprise' => 999,
            default      => 3,
        };

        $tenant->update([
            'plan'       => $plan,
            'seat_limit' => $seats,
        ]);
    }
}
