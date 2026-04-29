<?php

namespace App\Services\Harvesting\Sources;

use App\Models\Actor;
use App\Services\Harvesting\HarvestingSource;
use App\Services\Harvesting\HarvestSignal;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleNewsSource implements HarvestingSource
{
    public function supports(Actor $actor): bool
    {
        return true; // All actor types
    }

    public function harvest(Actor $actor): array
    {
        $query    = $actor->display_name;
        $aliases  = $actor->aliases ?? [];
        if (!empty($aliases)) {
            $query .= ' OR "' . $aliases[0] . '"';
        }

        $cacheKey = 'harvest:googlenews:' . md5($actor->id . $query);

        $items = Cache::remember($cacheKey, 3600, function () use ($query) {
            $encoded  = urlencode('"' . $query . '"');
            $url      = "https://news.google.com/rss/search?q={$encoded}&hl=en-US&gl=US&ceid=US:en";
            $response = Http::timeout(15)->get($url);

            if (!$response->successful()) {
                throw new \RuntimeException("Google News RSS failed: HTTP {$response->status()}");
            }

            $xml = @simplexml_load_string($response->body());
            if ($xml === false) {
                throw new \RuntimeException('Google News RSS: invalid XML response');
            }

            $results = [];
            foreach ($xml->channel->item as $item) {
                $results[] = [
                    'title'   => (string) $item->title,
                    'link'    => (string) $item->link,
                    'pubDate' => (string) $item->pubDate,
                    'source'  => (string) ($item->source ?? ''),
                ];
                if (count($results) >= 10) break;
            }
            return $results;
        });

        $signals = [];
        foreach ($items as $item) {
            $signals[] = HarvestSignal::newsItem(
                sourceId:        'GoogleNewsSource',
                headline:        $item['title'],
                confidence:      'medium',
                reliabilityGrade:'sand',
                sourceLabel:     'Google News' . ($item['source'] ? " — {$item['source']}" : ''),
                sourceUrl:       $item['link'] ?: null,
                rawData:         $item,
            );
        }

        return $signals;
    }
}
