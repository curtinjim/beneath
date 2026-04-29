<?php

namespace App\Providers;

use App\Services\Harvesting\HarvestingSourceRegistry;
use App\Services\Harvesting\Sources\CompaniesHouseSource;
use App\Services\Harvesting\Sources\GoogleNewsSource;
use App\Services\Harvesting\Sources\HunterSource;
use App\Services\Harvesting\Sources\OpenCorporatesSource;
use App\Services\Harvesting\Sources\OpenSanctionsSource;
use App\Services\Harvesting\Sources\SamGovSource;
use App\Services\Harvesting\Sources\SecEdgarSource;
use App\Services\Harvesting\Sources\UsaSpendingSource;
use App\Services\Harvesting\Sources\WikidataSource;
use Illuminate\Support\ServiceProvider;

class HarvestingServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(HarvestingSourceRegistry::class, function () {
            $registry = new HarvestingSourceRegistry();

            // Registration order determines execution order.
            // OpenSanctions runs first (flags surface immediately).
            $registry->register(new OpenSanctionsSource());
            $registry->register(new GoogleNewsSource());
            $registry->register(new WikidataSource());
            $registry->register(new SecEdgarSource());
            $registry->register(new SamGovSource());
            $registry->register(new UsaSpendingSource());
            $registry->register(new CompaniesHouseSource());
            $registry->register(new OpenCorporatesSource());
            $registry->register(new HunterSource());

            return $registry;
        });
    }

    public function boot(): void
    {
        // Register the scheduler command
        if ($this->app->runningInConsole()) {
            $this->commands([\App\Console\Commands\DispatchHarvestingJobs::class]);
        }
    }
}
