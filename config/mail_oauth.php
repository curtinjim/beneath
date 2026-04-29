<?php
return [
    'gmail' => [
        'client_id'     => env('GMAIL_CLIENT_ID', ''),
        'client_secret' => env('GMAIL_CLIENT_SECRET', ''),
        'redirect_uri'  => env('GMAIL_REDIRECT_URI', env('APP_URL').'/api/v1/mail/gmail/callback'),
    ],
    'm365' => [
        'client_id'     => env('M365_CLIENT_ID', ''),
        'client_secret' => env('M365_CLIENT_SECRET', ''),
        'redirect_uri'  => env('M365_REDIRECT_URI', env('APP_URL').'/api/v1/mail/m365/callback'),
        'tenant_id'     => env('M365_TENANT_ID', 'common'),
    ],
];
