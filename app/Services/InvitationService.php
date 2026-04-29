<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\TenantInvitation;
use App\Models\User;
use App\Notifications\TenantInvitationNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class InvitationService
{
    /**
     * Send an invitation to an email address.
     */
    public function invite(Tenant $tenant, User $inviter, string $email, string $role = 'member'): TenantInvitation
    {
        abort_if(!$tenant->hasSeats(), 422, 'No seats available on this plan.');

        // Revoke any existing pending invitation for this email
        TenantInvitation::where('tenant_id', $tenant->id)
            ->where('email', strtolower($email))
            ->whereNull('accepted_at')
            ->delete();

        $invitation = TenantInvitation::create([
            'tenant_id'  => $tenant->id,
            'invited_by' => $inviter->id,
            'email'      => strtolower($email),
            'role'       => $role,
            'token'      => Str::random(48),
            'expires_at' => now()->addDays(7),
        ]);

        // Send notification (queued)
        \Notification::route('mail', $email)
            ->notify(new TenantInvitationNotification($invitation));

        return $invitation;
    }

    /**
     * Accept an invitation and create (or attach) the user.
     */
    public function accept(string $token, array $userData): User
    {
        $invitation = TenantInvitation::where('token', $token)
            ->whereNull('accepted_at')
            ->firstOrFail();

        abort_if($invitation->isExpired(), 410, 'This invitation has expired.');

        return DB::transaction(function () use ($invitation, $userData) {
            // Create user if they don't exist
            $user = User::firstOrCreate(
                ['email' => $invitation->email],
                [
                    'tenant_id'  => $invitation->tenant_id,
                    'name'       => $userData['name'],
                    'password'   => Hash::make($userData['password']),
                    'role'       => $invitation->role,
                    'status'     => 'active',
                    'invited_by' => $invitation->invited_by,
                ]
            );

            // If user already existed (different tenant), update their tenant
            if ($user->tenant_id !== $invitation->tenant_id) {
                $user->update([
                    'tenant_id'  => $invitation->tenant_id,
                    'role'       => $invitation->role,
                    'status'     => 'active',
                    'invited_by' => $invitation->invited_by,
                ]);
            }

            $invitation->update(['accepted_at' => now()]);

            return $user;
        });
    }

    /**
     * Revoke a pending invitation.
     */
    public function revoke(TenantInvitation $invitation): void
    {
        abort_if($invitation->accepted_at !== null, 422, 'Invitation already accepted.');
        $invitation->delete();
    }
}
