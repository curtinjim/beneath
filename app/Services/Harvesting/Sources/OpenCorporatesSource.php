<?php

namespace App\Services\Harvesting\Sources;

use App\Models\Actor;
use App\Services\Harvesting\HarvestingSource;
use App\Services\Harvesting\HarvestSignal;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class OpenCorporatesSource implements HarvestingSource
{
    public function supports(Actor $actor): bool
    {
        return $actor->actor_type === 'organisation';
    }

    public function harvest(Actor $actor): array
    {
        $cacheKey = 'harvest:opencorporates:' . md5($actor->id);

        $data = Cache::remember($cacheKey, 3600, function () use ($actor) {
            return $this->search($actor->display_name, $actor->tenant_id);
        });

        if (empty($data)) return [];

        $signals = [];
        foreach ($data as $company) {
            $note = "{$company['name']} | {$company['jurisdiction']} | Status: {$company['current_status']}";
            if (!empty($company['incorporation_date'])) {
                $note .= " | Incorporated: {$company['incorporation_date']}";
            }

            $signals[] = HarvestSignal::fieldValue(
                sourceId:        'OpenCorporatesSource',
                fieldName:       'notes',
                proposedValue:   $note,
                confidence:      'medium',
                reliabilityGrade:'rock',
                sourceLabel:     "OpenCorporates ({$company['jurisdiction']})",
                sourceUrl:       $company['opencorporates_url'] ?? null,
                rawData:         $company,
            );
        }

        return $signals;
    }

    private function search(string $name, int $tenantId): array
    {
        $tenant = \App\Models\Tenant::find($tenantId);
        $token  = $tenant?->settings['OPENCORPORATES_TOKEN'] ?? null;

        $params = ['q' => $name, 'per_page' => 3];
        if ($token) {
            try { $params['api_token'] = \Illuminate\Support\Facades\Crypt::decryptString($token); }
            catch (\Exception) {}
        }

        $response = Http::timeout(15)
            ->withHeaders(['User-Agent' => 'BeneathPlatform/1.0'])
            ->get('https://api.opencorporates.com/companies/search', $params);

        if (!$response->successful()) {
            throw new \RuntimeException("OpenCorporates search failed: HTTP {$response->status()}");
        }

        $companies = $response->json('results.companies', []);
        return array_map(fn($c) => $c['company'], array_slice($companies, 0, 3));
    }
}
