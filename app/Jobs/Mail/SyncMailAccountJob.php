<?php
namespace App\Jobs\Mail;
use App\Models\Mail\MailAccount;
use App\Services\Mail\GmailSyncService;
use App\Services\Mail\M365SyncService;
use App\Services\Mail\ActorMatcher;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SyncMailAccountJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    public int $tries   = 2;
    public int $timeout = 120;

    public function __construct(public string $accountId) {}

    public function handle(GmailSyncService $gmail, M365SyncService $m365, ActorMatcher $matcher): void
    {
        $account = MailAccount::withoutGlobalScopes()->find($this->accountId);
        if (!$account || $account->status === 'disconnected') return;

        try {
            if ($account->provider === 'gmail') $gmail->syncAccount($account);
            else                                 $m365->syncAccount($account);

            // Match new threads to actors
            $account->threads()->whereNull('updated_at')->orWhere('updated_at', '>=', now()->subMinutes(5))
                ->each(fn($t) => $matcher->matchThread($t));

        } catch (\Throwable $e) {
            $account->update(['status' => 'error', 'error_message' => $e->getMessage()]);
            throw $e;
        }
    }
}
