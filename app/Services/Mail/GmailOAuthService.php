<?php
namespace App\Services\Mail;
use App\Models\Mail\MailAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class GmailOAuthService
{
    private string $clientId;
    private string $clientSecret;
    private string $redirectUri;

    public function __construct()
    {
        $this->clientId     = config('mail_oauth.gmail.client_id');
        $this->clientSecret = config('mail_oauth.gmail.client_secret');
        $this->redirectUri  = config('mail_oauth.gmail.redirect_uri');
    }

    public function getAuthUrl(string $state): string
    {
        $params = http_build_query([
            'client_id'     => $this->clientId,
            'redirect_uri'  => $this->redirectUri,
            'response_type' => 'code',
            'scope'         => 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email',
            'access_type'   => 'offline',
            'prompt'        => 'consent',
            'state'         => $state,
        ]);
        return 'https://accounts.google.com/o/oauth2/v2/auth?' . $params;
    }

    public function exchangeCode(string $code): array
    {
        $response = Http::post('https://oauth2.googleapis.com/token', [
            'code'          => $code,
            'client_id'     => $this->clientId,
            'client_secret' => $this->clientSecret,
            'redirect_uri'  => $this->redirectUri,
            'grant_type'    => 'authorization_code',
        ]);
        return $response->json();
    }

    public function refreshToken(MailAccount $account): void
    {
        $response = Http::post('https://oauth2.googleapis.com/token', [
            'client_id'     => $this->clientId,
            'client_secret' => $this->clientSecret,
            'refresh_token' => $account->refresh_token,
            'grant_type'    => 'refresh_token',
        ]);
        $data = $response->json();
        $account->update([
            'access_token'    => $data['access_token'],
            'token_expires_at'=> now()->addSeconds($data['expires_in'] ?? 3600),
        ]);
    }

    public function getUserInfo(string $accessToken): array
    {
        return Http::withToken($accessToken)
            ->get('https://www.googleapis.com/oauth2/v2/userinfo')
            ->json();
    }
}
