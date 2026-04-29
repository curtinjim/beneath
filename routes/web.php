<?php

use App\Http\Controllers\Api\V1\Mail\OAuthController;

Route::middleware("web")->group(function () {
    Route::get("/api/v1/mail/gmail/callback", [OAuthController::class, "gmailCallback"])->name("mail.gmail.callback");
    Route::get("/api/v1/mail/m365/callback",  [OAuthController::class, "m365Callback"])->name("mail.m365.callback");
});

use Illuminate\Support\Facades\Route;
Route::get('/{any?}', function () {
    return file_get_contents(public_path('app/index.html'));
})->where('any', '.*');
