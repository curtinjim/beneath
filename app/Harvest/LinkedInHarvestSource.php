<?php

namespace App\Harvest;

use App\Models\Actor;
use Illuminate\Support\Facades\Log;

/**
 * BD-77: LinkedIn harvest source stub.
 * Placeholder for future LinkedIn API / scraper integration.
 * Returns empty results until the integration is wired up.
 */
class LinkedInHarvestSource
{
    public function harvest(Actor $actor): array
    {
        Log::debug('LinkedInHarvestSource: stub called', ['actor_id' => $actor->id]);

        return [
            'source'   => 'linkedin',
            'actor_id' => $actor->id,
            'items'    => [],
        ];
    }

    public function supports(Actor $actor): bool
    {
        return !empty($actor->linkedin_url);
    }
}
