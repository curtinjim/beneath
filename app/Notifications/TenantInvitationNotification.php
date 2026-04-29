<?php

namespace App\Notifications;

use App\Models\TenantInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TenantInvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private TenantInvitation $invitation) {}

    public function via(): array
    {
        return ['mail'];
    }

    public function toMail(): MailMessage
    {
        $url     = config('app.url') . '/accept-invitation/' . $this->invitation->token;
        $tenant  = $this->invitation->tenant->name;
        $inviter = $this->invitation->inviter->name;
        $expires = $this->invitation->expires_at->format('j M Y');

        return (new MailMessage)
            ->subject("You've been invited to join {$tenant} on Beneath")
            ->greeting("Hello,")
            ->line("{$inviter} has invited you to join **{$tenant}** on Beneath as a {$this->invitation->role}.")
            ->action('Accept Invitation', $url)
            ->line("This invitation expires on {$expires}.")
            ->line('If you were not expecting this invitation, you may ignore this email.');
    }
}
