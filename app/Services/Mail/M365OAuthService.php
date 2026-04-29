<?php
namespace App\Services\Mail;
use App\Models\Mail\MailAccount;
use Illuminate\Support\Facades\Http;

class M365OAuthService
{
    private string $clientId;
    private string $clientSecret;
    private string $redirectUri;
    private string $tenantId;

    public function __construct()
    {
        $this->clientId     = config('mail_oauth.m365.client_id');
        $this->clientSecret = config('mail_oauth.m365.client_secret');
        $this->redirectUri  = config('mail_oauth.m365.redirect_uri');
        $this->tenantId     = config('mail_oauth.m365.tenant_id', 'common');
    }

    public function getAuthUrl(string $state): string
    {
        $params = http_build_query([
            'client_id'     => $this->clientId,
            'response_type' => 'code',
            'redirect_uri'  => $this->redirectUri,
            'scope'         => 'offline_access Mail.Read User.Read',
            'response_mode' => 'query',
            'state'         => $state,
        ]);
        return "https://login.microsoftonline.com/{$this->tenantId}/oauth2/v2.0/authorize?" . $params;
    }

    public function exchangeCode(string $code): array
    {
        $response = Http::asForm()->post(
            "https://login.microsoftonline.com/{$this->tenantId}/oauth2/v2.0/token",
            [
                'client_id'     => $this->clientId,
                'client_secret' => $this->clientSecret,
                'code'          => $code,
                'redirect_uri'  => $this->redirectUri,
                'grant_type'    => 'authorization_code',
            ]
        );
        return $response->json();
    }

    public function refreshToken(MailAccount $account): void
    {
        $response = Http::asForm()->post(
            "https://login.microsoftonline.com/{$this->tenantId}/oauth2/v2.0/token",
            [
                'client_id'     => $this->clientId,
                'client_secret' => $this->clientSecret,
                'refresh_token' => $account->refresh_token,
                'grant_type'    => 'refresh_token',
                'scope'         => 'offline_access Mail.Read User.Read',
            ]
        );
        $data = $response->json();
        $account->update([
            'access_token'    => $data['access_token'],
            'refresh_token'   => $data['refresh_token'] ?? $account->refresh_token,
            'token_expires_at'=> now()->addSeconds($data['expires_in'] ?? 3600),
        ]);
    }

    public function getUserInfo(string $accessToken): array
    {
        return Http::withToken($accessToken)
            ->get('https://graph.microsoft.com/v1.0/me')
            ->json();
    }
}
