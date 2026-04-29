<?php

namespace App\Services\Harvesting;

use App\Models\Actor;

/**
 * All harvesting sources implement this interface.
 * The job layer calls sources exclusively through this interface.
 * Direct HTTP calls in job code are prohibited (HARV-CON-006).
 */
interface HarvestingSource
{
    /**
     * Return true if this source is applicable to the given Actor type and context.
     */
    public function supports(Actor $actor): bool;

    /**
     * Execute the lookup and return an array of HarvestSignal objects.
     * MUST be idempotent. Implementations MUST cache responses in Redis for 1 hour.
     *
     * @return HarvestSignal[]
     */
    public function harvest(Actor $actor): array;
}
