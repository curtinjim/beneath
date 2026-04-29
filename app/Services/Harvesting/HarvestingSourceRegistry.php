<?php

namespace App\Services\Harvesting;

use App\Models\Actor;

/**
 * Holds all registered HarvestingSource implementations.
 * Resolved from the Laravel service container by HarvestActorJob.
 * Sources are registered in HarvestingServiceProvider.
 */
class HarvestingSourceRegistry
{
    /** @var HarvestingSource[] */
    private array $sources = [];

    public function register(HarvestingSource $source): void
    {
        $this->sources[] = $source;
    }

    /**
     * Return all sources that support the given Actor.
     *
     * @return HarvestingSource[]
     */
    public function forActor(Actor $actor): array
    {
        return array_values(array_filter(
            $this->sources,
            fn(HarvestingSource $s) => $s->supports($actor)
        ));
    }

    /** @return HarvestingSource[] */
    public function all(): array
    {
        return $this->sources;
    }
}
