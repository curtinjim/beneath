<?php

namespace App\Services\Harvesting\Sources;

use App\Models\Actor;
use App\Services\Harvesting\HarvestingSource;
use App\Services\Harvesting\HarvestSignal;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class WikidataSource implements HarvestingSource
{
    public function supports(Actor $actor): bool
    {
        return true; // All actor types
    }

    public function harvest(Actor $actor): array
    {
        $cacheKey = 'harvest:wikidata:' . md5($actor->id);

        $data = Cache::remember($cacheKey, 3600, function () use ($actor) {
            return $this->fetchWikidata($actor) ?? $this->fetchWikipediaSummary($actor);
        });

        if (empty($data)) return [];

        $signals = [];
        $grade   = 'sand';  // default — field_value from Wikidata is rock, Wikipedia is sand

        foreach ($data as $field => $value) {
            if (empty($value) || $field === '_source') continue;
            if ($field === '_grade') { $grade = $value; continue; }

            $signals[] = HarvestSignal::fieldValue(
                sourceId:        'WikidataSource',
                fieldName:       $field,
                proposedValue:   (string) $value,
                confidence:      'medium',
                reliabilityGrade:$grade,
                sourceLabel:     $data['_source'] ?? 'Wikidata',
                sourceUrl:       $data['_url'] ?? null,
                rawData:         $data,
            );
        }

        return $signals;
    }

    private function fetchWikidata(Actor $actor): ?array
    {
        $name  = addslashes($actor->display_name);
        $type  = $this->wikidataType($actor->actor_type);
        $sparql = <<<SPARQL
SELECT ?item ?desc ?inception ?country ?website WHERE {
  ?item rdfs:label "{$name}"@en .
  {$type}
  OPTIONAL { ?item schema:description ?desc . FILTER(LANG(?desc)="en") }
  OPTIONAL { ?item wdt:P571 ?inception }
  OPTIONAL { ?item wdt:P17 ?country . ?country rdfs:label ?countryLabel FILTER(LANG(?countryLabel)="en") }
  OPTIONAL { ?item wdt:P856 ?website }
}
LIMIT 1
SPARQL;

        $response = Http::timeout(20)
            ->withHeaders(['Accept' => 'application/sparql-results+json', 'User-Agent' => 'BeneathPlatform/1.0'])
            ->get('https://query.wikidata.org/sparql', ['query' => $sparql]);

        if (!$response->successful()) return null;

        $results = $response->json('results.bindings', []);
        if (empty($results)) return null;

        $r = $results[0];
        return array_filter([
            '_source' => 'Wikidata',
            '_grade'  => 'rock',
            '_url'    => $r['item']['value'] ?? null,
            'notes'   => $r['desc']['value'] ?? null,
            'website' => $r['website']['value'] ?? null,
        ]);
    }

    private function fetchWikipediaSummary(Actor $actor): ?array
    {
        $title    = urlencode(str_replace(' ', '_', $actor->display_name));
        $response = Http::timeout(10)
            ->withHeaders(['User-Agent' => 'BeneathPlatform/1.0'])
            ->get("https://en.wikipedia.org/api/rest_v1/page/summary/{$title}");

        if (!$response->successful()) return null;

        $body = $response->json();
        if (empty($body['extract'])) return null;

        return [
            '_source' => 'Wikipedia',
            '_grade'  => 'sand',
            '_url'    => $body['content_urls']['desktop']['page'] ?? null,
            'notes'   => mb_substr($body['extract'], 0, 500),
        ];
    }

    private function wikidataType(string $actorType): string
    {
        return match ($actorType) {
            'person'       => '?item wdt:P31 wd:Q5 .',  // human
            'organisation' => '?item wdt:P31 ?type . ?type wdt:P279* wd:Q43229 .',  // organisation
            'government'   => '?item wdt:P31 ?type . ?type wdt:P279* wd:Q7188 .',   // government
            default        => '',
        };
    }
}
