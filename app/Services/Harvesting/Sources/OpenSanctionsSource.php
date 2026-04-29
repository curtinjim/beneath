<?php

namespace App\Services\Harvesting\Sources;

use App\Models\Actor;
use App\Services\Harvesting\HarvestingSource;
use App\Services\Harvesting\HarvestSignal;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class OpenSanctionsSource implements HarvestingSource
{
    public function supports(Actor $actor): bool
    {
        return true; // All actor types
    }

    public function harvest(Actor $actor): array
    {
        $cacheKey = 'harvest:opensanctions:' . md5($actor->id);

        $results = Cache::remember($cacheKey, 3600, function () use ($actor) {
            return $this->query($actor->display_name, $actor->aliases ?? []);
        });

        if (empty($results)) return [];

        $signals = [];
        foreach ($results as $match) {
            // Sanctions flag
            if (!empty($match['datasets']) && $this->isSanctioned($match)) {
                $sources = implode(', ', array_slice($match['datasets'], 0, 3));
                $signals[] = HarvestSignal::flag(
                    sourceId:        'OpenSanctionsSource',
                    flagDescription: "Sanctions match: {$match['caption']} — listed in: {$sources}",
                    reliabilityGrade:'bedrock',
                    sourceLabel:     'OpenSanctions',
                    sourceUrl:       "https://opensanctions.org/entities/{$match['id']}/",
                    rawData:         $match,
                );
            }

            // PEP flag
            if ($this->isPep($match)) {
                $signals[] = HarvestSignal::flag(
                    sourceId:        'OpenSanctionsSource',
                    flagDescription: "Politically Exposed Person (PEP): {$match['caption']}",
                    reliabilityGrade:'bedrock',
                    sourceLabel:     'OpenSanctions — PEP Registry',
                    sourceUrl:       "https://opensanctions.org/entities/{$match['id']}/",
                    rawData:         $match,
                );
            }

            // Known aliases
            $aliases = $match['properties']['alias'] ?? [];
            if (!empty($aliases)) {
                $signals[] = HarvestSignal::fieldValue(
                    sourceId:        'OpenSanctionsSource',
                    fieldName:       'aliases',
                    proposedValue:   implode(', ', array_slice($aliases, 0, 5)),
                    confidence:      'high',
                    reliabilityGrade:'bedrock',
                    sourceLabel:     'OpenSanctions',
                    sourceUrl:       null,
                    rawData:         ['aliases' => $aliases],
                );
            }
        }

        return $signals;
    }

    private function query(string $name, array $aliases): array
    {
        $queries = array_map(fn($n) => ['match' => ['name' => ['values' => [$n]]]], array_merge([$name], $aliases));

        $response = Http::timeout(15)
            ->withHeaders(['Accept' => 'application/json', 'User-Agent' => 'BeneathPlatform/1.0'])
            ->post('https://api.opensanctions.org/match/default', ['queries' => ['q0' => $queries[0]]]);

        if ($response->status() === 404 || $response->status() === 422) return [];

        if (!$response->successful()) {
            throw new \RuntimeException("OpenSanctions API failed: HTTP {$response->status()}");
        }

        $responses = $response->json('responses.q0.results', []);
        // Only return matches with score >= 0.7
        return array_filter($responses, fn($r) => ($r['score'] ?? 0) >= 0.7);
    }

    private function isSanctioned(array $match): bool
    {
        $sanctions = ['eu_fsf', 'us_ofac_sdn', 'un_sc_sanctions', 'gb_hmt_sanctions',
                      'us_state_dept', 'ca_dfatd_sema_sanctions'];
        return !empty(array_intersect($match['datasets'] ?? [], $sanctions));
    }

    private function isPep(array $match): bool
    {
        $pepSources = ['everypolitician', 'wd_peps', 'us_cia_world_leaders'];
        return !empty(array_intersect($match['datasets'] ?? [], $pepSources))
            || in_array('Person', $match['schema'] ?? [])
               && str_contains(strtolower($match['caption'] ?? ''), 'politician');
    }
}
