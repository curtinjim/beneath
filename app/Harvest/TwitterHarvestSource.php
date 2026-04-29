<?php

namespace App\Harvest;

use App\Models\Actor;
use Illuminate\Support\Facades\Log;

/**
 * BD-78: Twitter/X harvest source stub.
 * Placeholder for future Twitter/X API integration.
 * Returns empty results until the integration is wired up.
 */
class TwitterHarvestSource
{
    public function harvest(Actor $actor): array
    {
        Log::debug('TwitterHarvestSource: stub called', ['actor_id' => $actor->id]);

        return [
            'source'   => 'twitter',
            'actor_id' => $actor->id,
            'items'    => [],
        ];
    }

    public function supports(Actor $actor): bool
    {
        return !empty($actor->twitter_handle);
    }
}
