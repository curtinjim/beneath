<?php

namespace App\Services\Harvesting\Sources;

use App\Models\Actor;
use App\Services\Harvesting\HarvestingSource;
use App\Services\Harvesting\HarvestSignal;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class SecEdgarSource implements HarvestingSource
{
    public function supports(Actor $actor): bool
    {
        return $actor->actor_type === 'organisation';
    }

    public function harvest(Actor $actor): array
    {
        $cacheKey = 'harvest:secedgar:' . md5($actor->id);

        $data = Cache::remember($cacheKey, 3600, function () use ($actor) {
            return $this->searchEdgar($actor->display_name);
        });

        if (empty($data)) return [];

        $signals = [];

        if (!empty($data['description'])) {
            $signals[] = HarvestSignal::fieldValue(
                sourceId:        'SecEdgarSource',
                fieldName:       'notes',
                proposedValue:   $data['description'],
                confidence:      'high',
                reliabilityGrade:'bedrock',
                sourceLabel:     'SEC EDGAR',
                sourceUrl:       $data['url'] ?? null,
                rawData:         $data,
            );
        }

        foreach ($data['officers'] ?? [] as $officer) {
            $signals[] = HarvestSignal::newsItem(
                sourceId:        'SecEdgarSource',
                headline:        "Officer: {$officer['name']} — {$officer['title']}",
                confidence:      'high',
                reliabilityGrade:'bedrock',
                sourceLabel:     'SEC EDGAR — Officers',
                sourceUrl:       $data['url'] ?? null,
                rawData:         ['officer' => $officer, 'company' => $data['name'] ?? ''],
            );
        }

        return $signals;
    }

    private function searchEdgar(string $name): array
    {
        // Search EDGAR company search
        $encoded  = urlencode($name);
        $response = Http::timeout(15)
            ->withHeaders(['User-Agent' => 'BeneathPlatform contact@blackrudder.com'])
            ->get("https://efts.sec.gov/LATEST/search-index?q=%22{$encoded}%22&dateRange=custom&startdt=2020-01-01&forms=10-K,DEF+14A");

        if (!$response->successful()) {
            throw new \RuntimeException("EDGAR search failed: HTTP {$response->status()}");
        }

        $hits = $response->json('hits.hits', []);
        if (empty($hits)) return [];

        $top  = $hits[0]['_source'] ?? [];
        $cik  = $top['entity_id'] ?? null;

        $result = [
            'name'        => $top['display_names'][0] ?? $name,
            'description' => $top['period_of_report'] ? "SEC filing period: {$top['period_of_report']}" : null,
            'url'         => $cik ? "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={$cik}&type=10-K" : null,
            'officers'    => [],
        ];

        // Fetch officers from company facts if CIK available
        if ($cik) {
            $result['officers'] = $this->fetchOfficers($cik);
        }

        return $result;
    }

    private function fetchOfficers(string $cik): array
    {
        $response = Http::timeout(10)
            ->withHeaders(['User-Agent' => 'BeneathPlatform contact@blackrudder.com'])
            ->get("https://data.sec.gov/submissions/CIK{$cik}.json");

        if (!$response->successful()) return [];

        $officers = [];
        foreach ($response->json('insiders', []) as $insider) {
            $officers[] = [
                'name'  => $insider['name'] ?? '',
                'title' => $insider['title'] ?? '',
            ];
            if (count($officers) >= 5) break;
        }

        return $officers;
    }
}
