<?php

namespace App\Services\Harvesting\Sources;

use App\Models\Actor;
use App\Services\Harvesting\HarvestingSource;
use App\Services\Harvesting\HarvestSignal;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class UsaSpendingSource implements HarvestingSource
{
    public function supports(Actor $actor): bool
    {
        return in_array($actor->actor_type, ['organisation', 'government']);
    }

    public function harvest(Actor $actor): array
    {
        $cacheKey = 'harvest:usaspending:' . md5($actor->id);

        $awards = Cache::remember($cacheKey, 3600, function () use ($actor) {
            return $this->fetchAwards($actor->display_name);
        });

        $signals = [];
        foreach ($awards as $award) {
            $amount = isset($award['Award Amount'])
                ? '$' . number_format((float) $award['Award Amount'], 0)
                : 'undisclosed';
            $agency = $award['Awarding Agency'] ?? 'Unknown Agency';
            $date   = $award['Award Date'] ?? '';

            $signals[] = HarvestSignal::newsItem(
                sourceId:        'UsaSpendingSource',
                headline:        "Federal award from {$agency}: {$amount}" . ($date ? " ({$date})" : ''),
                confidence:      'high',
                reliabilityGrade:'bedrock',
                sourceLabel:     'USASpending.gov',
                sourceUrl:       $award['url'] ?? 'https://usaspending.gov',
                rawData:         $award,
            );
        }

        return $signals;
    }

    private function fetchAwards(string $name): array
    {
        $response = Http::timeout(15)->post(
            'https://api.usaspending.gov/api/v2/search/spending_by_award/',
            [
                'filters' => [
                    'recipient_search_text' => [$name],
                    'time_period' => [['start_date' => '2020-01-01', 'end_date' => date('Y-m-d')]],
                    'award_type_codes' => ['A','B','C','D','02','03','04','05'],
                ],
                'fields' => ['Award ID','Recipient Name','Award Amount','Awarding Agency','Award Date','Description'],
                'page'   => 1,
                'limit'  => 5,
                'sort'   => 'Award Amount',
                'order'  => 'desc',
            ]
        );

        if (!$response->successful()) {
            throw new \RuntimeException("USASpending API failed: HTTP {$response->status()}");
        }

        return $response->json('results', []);
    }
}
