<?php
namespace App\Services\Mail;
use App\Models\Actor;
use App\Models\Mail\MailActorLink;
use App\Models\Mail\MailThread;

class ActorMatcher
{
    public function matchThread(MailThread $thread): void
    {
        $tenantId = $thread->tenant_id;
        $emails   = collect($thread->participants)->pluck('email')->filter()->map('strtolower');

        foreach ($emails as $email) {
            // Check primary_email
            $actor = Actor::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->whereRaw('LOWER(primary_email) = ?', [$email])
                ->first();

            // Check additional_emails JSON array
            if (!$actor) {
                $actor = Actor::withoutGlobalScopes()
                    ->where('tenant_id', $tenantId)
                    ->whereRaw("JSON_SEARCH(LOWER(additional_emails), 'one', ?) IS NOT NULL", [$email])
                    ->first();
            }

            if ($actor) {
                MailActorLink::firstOrCreate(
                    ['mail_thread_id' => $thread->id, 'actor_id' => $actor->id],
                    ['tenant_id' => $tenantId, 'matched_email' => $email, 'match_confidence' => 'auto']
                );
            }
        }
    }
}
