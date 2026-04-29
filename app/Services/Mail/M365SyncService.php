<?php
namespace App\Services\Mail;
use App\Models\Mail\MailAccount;
use App\Models\Mail\MailThread;
use App\Models\Mail\MailMessage;
use Illuminate\Support\Facades\Http;

class M365SyncService
{
    public function __construct(private M365OAuthService $oauth) {}

    private function client(MailAccount $account): \Illuminate\Http\Client\PendingRequest
    {
        if ($account->isExpired()) $this->oauth->refreshToken($account);
        return Http::withToken($account->access_token)->baseUrl('https://graph.microsoft.com/v1.0');
    }

    public function syncAccount(MailAccount $account, int $maxThreads = 50): void
    {
        $client   = $this->client($account);
        $response = $client->get('/me/mailFolders/inbox/messages', [
            '$top'     => $maxThreads,
            '$select'  => 'id,conversationId,subject,from,toRecipients,ccRecipients,receivedDateTime,isRead,body',
            '$orderby' => 'receivedDateTime desc',
        ])->json();

        $byThread = collect($response['value'] ?? [])->groupBy('conversationId');

        foreach ($byThread as $conversationId => $messages) {
            $this->syncConversation($account, $conversationId, $messages->all());
        }

        $account->update(['last_synced_at' => now(), 'status' => 'active']);
    }

    private function syncConversation(MailAccount $account, string $conversationId, array $messages): MailThread
    {
        $first = $messages[array_key_last($messages)]; // oldest first
        $last  = $messages[0]; // newest first from API

        $participants = collect($messages)
            ->flatMap(fn($m) => array_merge(
                [$m['from']['emailAddress'] ?? []],
                array_map(fn($r) => $r['emailAddress'], $m['toRecipients'] ?? []),
                array_map(fn($r) => $r['emailAddress'], $m['ccRecipients'] ?? [])
            ))
            ->unique('address')
            ->map(fn($p) => ['email' => $p['address'] ?? '', 'name' => $p['name'] ?? null])
            ->filter(fn($p) => !empty($p['email']))
            ->values()->all();

        $thread = MailThread::updateOrCreate(
            ['mail_account_id' => $account->id, 'provider_thread_id' => $conversationId],
            [
                'tenant_id'       => $account->tenant_id,
                'subject'         => $first['subject'] ?? '(no subject)',
                'participants'    => $participants,
                'message_count'   => count($messages),
                'last_message_at' => \Carbon\Carbon::parse($last['receivedDateTime']),
                'has_unread'      => collect($messages)->contains(fn($m) => !$m['isRead']),
            ]
        );

        foreach ($messages as $msg) {
            MailMessage::updateOrCreate(
                ['mail_thread_id' => $thread->id, 'provider_message_id' => $msg['id']],
                [
                    'tenant_id'    => $thread->tenant_id,
                    'from_email'   => $msg['from']['emailAddress']['address'] ?? '',
                    'from_name'    => $msg['from']['emailAddress']['name'] ?? null,
                    'to_recipients'=> array_map(fn($r) => ['email'=>$r['emailAddress']['address'],'name'=>$r['emailAddress']['name']??null], $msg['toRecipients'] ?? []),
                    'cc_recipients'=> array_map(fn($r) => ['email'=>$r['emailAddress']['address'],'name'=>$r['emailAddress']['name']??null], $msg['ccRecipients'] ?? []),
                    'subject'      => $msg['subject'] ?? null,
                    'body_text'    => $msg['body']['contentType'] === 'text' ? $msg['body']['content'] : strip_tags($msg['body']['content'] ?? ''),
                    'body_html'    => $msg['body']['contentType'] === 'html'  ? $msg['body']['content'] : null,
                    'sent_at'      => \Carbon\Carbon::parse($msg['receivedDateTime']),
                    'is_read'      => $msg['isRead'] ?? false,
                    'is_outbound'  => strtolower($msg['from']['emailAddress']['address'] ?? '') === strtolower($account->email_address),
                ]
            );
        }

        return $thread;
    }
}
