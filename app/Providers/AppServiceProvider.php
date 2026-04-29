<?php
namespace App\Providers;

use App\AI\BeneathAIProvider;
use App\AI\Providers\AnthropicProvider;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(BeneathAIProvider::class, function () {
            $provider = config('ai.provider', 'anthropic');
            return match ($provider) {
                'anthropic' => new AnthropicProvider(),
                default     => new AnthropicProvider(),
            };
        });
    }

    public function boot(): void {}
}
