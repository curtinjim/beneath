<?php
namespace App\Http\Controllers\Api\V1\Mail;
use App\Http\Controllers\Controller;
use App\Models\Mail\MailAccount;
use App\Services\Mail\GmailOAuthService;
use App\Services\Mail\M365OAuthService;
use App\Jobs\Mail\SyncMailAccountJob;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OAuthController extends Controller
{
    public function gmailRedirect(GmailOAuthService $gmail): \Illuminate\Http\JsonResponse
    {
        $state = Str::random(40);
        session(['mail_oauth_state' => $state]);
        return response()->json(['url' => $gmail->getAuthUrl($state)]);
    }

    public function gmailCallback(Request $request, GmailOAuthService $gmail): \Illuminate\Http\RedirectResponse
    {
        if ($request->state !== session('mail_oauth_state')) abort(403, 'Invalid state');

        $tokens   = $gmail->exchangeCode($request->code);
        $userInfo = $gmail->getUserInfo($tokens['access_token']);

        $account = MailAccount::updateOrCreate(
            ['user_id' => auth()->id(), 'provider' => 'gmail', 'email_address' => $userInfo['email']],
            [
                'tenant_id'       => auth()->user()->tenant_id,
                'display_name'    => $userInfo['name'] ?? $userInfo['email'],
                'access_token'    => $tokens['access_token'],
                'refresh_token'   => $tokens['refresh_token'] ?? null,
                'token_expires_at'=> isset($tokens['expires_in']) ? now()->addSeconds($tokens['expires_in']) : null,
                'status'          => 'active',
                'error_message'   => null,
            ]
        );

        SyncMailAccountJob::dispatch($account->id);
        return redirect(config('app.frontend_url', '/') . '/settings?mail=connected');
    }

    public function m365Redirect(M365OAuthService $m365): \Illuminate\Http\JsonResponse
    {
        $state = Str::random(40);
        session(['mail_oauth_state' => $state]);
        return response()->json(['url' => $m365->getAuthUrl($state)]);
    }

    public function m365Callback(Request $request, M365OAuthService $m365): \Illuminate\Http\RedirectResponse
    {
        if ($request->state !== session('mail_oauth_state')) abort(403, 'Invalid state');

        $tokens   = $m365->exchangeCode($request->code);
        $userInfo = $m365->getUserInfo($tokens['access_token']);

        $account = MailAccount::updateOrCreate(
            ['user_id' => auth()->id(), 'provider' => 'm365', 'email_address' => $userInfo['mail'] ?? $userInfo['userPrincipalName']],
            [
                'tenant_id'       => auth()->user()->tenant_id,
                'display_name'    => $userInfo['displayName'] ?? null,
                'access_token'    => $tokens['access_token'],
                'refresh_token'   => $tokens['refresh_token'] ?? null,
                'token_expires_at'=> isset($tokens['expires_in']) ? now()->addSeconds($tokens['expires_in']) : null,
                'status'          => 'active',
                'error_message'   => null,
            ]
        );

        SyncMailAccountJob::dispatch($account->id);
        return redirect(config('app.frontend_url', '/') . '/settings?mail=connected');
    }

    public function disconnect(Request $request, string $accountId): \Illuminate\Http\JsonResponse
    {
        $account = MailAccount::findOrFail($accountId);
        $account->update(['status' => 'disconnected', 'access_token' => '', 'refresh_token' => null]);
        return response()->json(['ok' => true]);
    }
}
