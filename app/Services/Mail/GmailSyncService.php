<?php
namespace App\Services\Mail;
use App\Models\Mail\MailAccount;
use App\Models\Mail\MailThread;
use App\Models\Mail\MailMessage;
use Illuminate\Support\Facades\Http;

class GmailSyncService
{
    public function __construct(private GmailOAuthService $oauth) {}

    private function client(MailAccount $account): \Illuminate\Http\Client\PendingRequest
    {
        if ($account->isExpired()) $this->oauth->refreshToken($account);
        return Http::withToken($account->access_token)->baseUrl('https://gmail.googleapis.com/gmail/v1');
    }

    public function syncAccount(MailAccount $account, int $maxThreads = 50): void
    {
        $client  = $this->client($account);
        $threads = $client->get('/users/me/threads', ['maxResults' => $maxThreads, 'labelIds' => 'INBOX'])->json('threads') ?? [];

        foreach ($threads as $t) {
            $this->syncThread($account, $t['id'], $client);
        }

        $account->update(['last_synced_at' => now(), 'status' => 'active']);
    }

    public function syncThread(MailAccount $account, string $providerId, $client = null): MailThread
    {
        $client ??= $this->client($account);
        $data     = $client->get("/users/me/threads/{$providerId}", ['format' => 'full'])->json();

        $messages  = $data['messages'] ?? [];
        $firstMsg  = $messages[0] ?? [];
        $lastMsg   = end($messages) ?: [];

        $subject      = $this->header($firstMsg, 'Subject') ?? '(no subject)';
        $participants = $this->extractParticipants($messages);
        $lastDate     = $this->msgDate($lastMsg);
        $hasUnread    = collect($messages)->contains(fn($m) => !in_array('UNREAD', $m['labelIds'] ?? []));

        $thread = MailThread::updateOrCreate(
            ['mail_account_id' => $account->id, 'provider_thread_id' => $providerId],
            [
                'tenant_id'       => $account->tenant_id,
                'subject'         => $subject,
                'participants'    => $participants,
                'message_count'   => count($messages),
                'last_message_at' => $lastDate,
                'has_unread'      => $hasUnread,
                'labels'          => $data['messages'][0]['labelIds'] ?? [],
            ]
        );

        foreach ($messages as $msg) {
            $this->upsertMessage($thread, $msg, $account->email_address);
        }

        return $thread;
    }

    private function upsertMessage(MailThread $thread, array $msg, string $accountEmail): void
    {
        $msgId   = $msg['id'];
        $headers = collect($msg['payload']['headers'] ?? []);
        $from    = $this->parseAddress($headers->firstWhere('name', 'From')['value'] ?? '');
        $to      = $this->parseAddressList($headers->firstWhere('name', 'To')['value'] ?? '');
        $cc      = $this->parseAddressList($headers->firstWhere('name', 'Cc')['value'] ?? '');
        $subject = $headers->firstWhere('name', 'Subject')['value'] ?? null;
        $date    = $headers->firstWhere('name', 'Date')['value'] ?? null;
        $body    = $this->extractBody($msg['payload'] ?? []);

        MailMessage::updateOrCreate(
            ['mail_thread_id' => $thread->id, 'provider_message_id' => $msgId],
            [
                'tenant_id'    => $thread->tenant_id,
                'from_email'   => $from['email'],
                'from_name'    => $from['name'],
                'to_recipients'=> $to,
                'cc_recipients'=> $cc,
                'subject'      => $subject,
                'body_text'    => $body['text'],
                'body_html'    => $body['html'],
                'sent_at'      => $date ? \Carbon\Carbon::parse($date) : now(),
                'is_read'      => !in_array('UNREAD', $msg['labelIds'] ?? []),
                'is_outbound'  => strtolower($from['email']) === strtolower($accountEmail),
            ]
        );
    }

    private function extractBody(array $payload): array
    {
        $text = null; $html = null;
        $this->walkParts($payload, $text, $html);
        return ['text' => $text, 'html' => $html];
    }

    private function walkParts(array $part, &$text, &$html): void
    {
        $mime = $part['mimeType'] ?? '';
        if ($mime === 'text/plain' && isset($part['body']['data'])) {
            $text = base64_decode(strtr($part['body']['data'], '-_', '+/'));
        } elseif ($mime === 'text/html' && isset($part['body']['data'])) {
            $html = base64_decode(strtr($part['body']['data'], '-_', '+/'));
        }
        foreach ($part['parts'] ?? [] as $sub) {
            $this->walkParts($sub, $text, $html);
        }
    }

    private function extractParticipants(array $messages): array
    {
        $seen = [];
        foreach ($messages as $msg) {
            foreach (['From','To','Cc'] as $hdr) {
                $val = $this->header($msg, $hdr);
                if ($val) {
                    foreach ($this->parseAddressList($val) as $p) {
                        $key = strtolower($p['email']);
                        if (!isset($seen[$key])) $seen[$key] = $p;
                    }
                }
            }
        }
        return array_values($seen);
    }

    private function header(array $msg, string $name): ?string
    {
        return collect($msg['payload']['headers'] ?? [])->firstWhere('name', $name)['value'] ?? null;
    }

    private function msgDate(array $msg): ?\Carbon\Carbon
    {
        $val = $this->header($msg, 'Date');
        return $val ? \Carbon\Carbon::parse($val) : null;
    }

    private function parseAddress(string $raw): array
    {
        if (preg_match('/^(.*?)\s*<([^>]+)>$/', trim($raw), $m)) {
            return ['name' => trim($m[1], '" '), 'email' => trim($m[2])];
        }
        return ['name' => null, 'email' => trim($raw)];
    }

    private function parseAddressList(string $raw): array
    {
        return array_values(array_filter(array_map(
            fn($a) => $this->parseAddress(trim($a)),
            preg_split('/,(?![^<]*>)/', $raw)
        ), fn($a) => !empty($a['email'])));
    }
}
