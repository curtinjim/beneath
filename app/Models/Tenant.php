<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Tenant extends Model
{
    protected $fillable = [
        'name', 'plan', 'seat_limit', 'billing_email',
        'stripe_customer_id', 'stripe_subscription_id', 'stripe_price_id',
        'trial_ends_at', 'onboarding_completed_at', 'suspended_at',
        'subdomain', 'timezone',
    ];

    protected $casts = [
        'trial_ends_at'            => 'datetime',
        'onboarding_completed_at'  => 'datetime',
        'suspended_at'             => 'datetime',
        'seat_limit'               => 'integer',
    ];

    // ── Relations ─────────────────────────────────────────────────────────────

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(TenantInvitation::class);
    }

    public function aiConfig(): HasOne
    {
        return $this->hasOne(TenantAiConfig::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function isOnTrial(): bool
    {
        return $this->plan === 'trial'
            && $this->trial_ends_at
            && $this->trial_ends_at->isFuture();
    }

    public function isTrialExpired(): bool
    {
        return $this->plan === 'trial'
            && $this->trial_ends_at
            && $this->trial_ends_at->isPast();
    }

    public function isSuspended(): bool
    {
        return $this->suspended_at !== null;
    }

    public function onboardingComplete(): bool
    {
        return $this->onboarding_completed_at !== null;
    }

    public function activeUserCount(): int
    {
        return $this->users()->where('status', 'active')->count();
    }

    public function seatsAvailable(): int
    {
        return max(0, $this->seat_limit - $this->activeUserCount());
    }

    public function hasSeats(): bool
    {
        return $this->seatsAvailable() > 0;
    }
}
