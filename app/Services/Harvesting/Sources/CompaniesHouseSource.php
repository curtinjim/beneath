<?php

namespace App\Services\Harvesting\Sources;

use App\Models\Actor;
use App\Services\Harvesting\HarvestingSource;
use App\Services\Harvesting\HarvestSignal;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;

class CompaniesHouseSource implements HarvestingSource
{
    public function supports(Actor $actor): bool
    {
        return $actor->actor_type === 'organisation';
    }

    public function harvest(Actor $actor): array
    {
        $apiKey = $this->resolveApiKey($actor->tenant_id);
        if (!$apiKey) return [];

        $cacheKey = 'harvest:companieshouse:' . md5($actor->id);

        $data = Cache::remember($cacheKey, 3600, function () use ($actor, $apiKey) {
            return $this->searchCompaniesHouse($actor->display_name, $apiKey);
        });

        if (empty($data)) return [];

        $signals = [];

        // Company number and incorporation date as notes
        if (!empty($data['company_number'])) {
            $note = "Companies House: {$data['title']} | Number: {$data['company_number']}";
            if (!empty($data['date_of_creation'])) $note .= " | Incorporated: {$data['date_of_creation']}";
            if (!empty($data['company_status']))   $note .= " | Status: {$data['company_status']}";
            $signals[] = HarvestSignal::fieldValue(
                sourceId:        'CompaniesHouseSource',
                fieldName:       'notes',
                proposedValue:   $note,
                confidence:      'high',
                reliabilityGrade:'bedrock',
                sourceLabel:     'Companies House UK',
                sourceUrl:       "https://find-and-update.company-information.service.gov.uk/company/{$data['company_number']}",
                rawData:         $data,
            );
        }

        // SIC codes
        if (!empty($data['sic_codes'])) {
            $signals[] = HarvestSignal::fieldValue(
                sourceId:        'CompaniesHouseSource',
                fieldName:       'notes',
                proposedValue:   'SIC Codes: ' . implode(', ', $data['sic_codes']),
                confidence:      'high',
                reliabilityGrade:'bedrock',
                sourceLabel:     'Companies House UK',
                sourceUrl:       null,
                rawData:         $data,
            );
        }

        // Officers
        foreach ($data['officers'] ?? [] as $officer) {
            $signals[] = HarvestSignal::newsItem(
                sourceId:        'CompaniesHouseSource',
                headline:        "Officer: {$officer['name']} — {$officer['officer_role']}",
                confidence:      'high',
                reliabilityGrade:'bedrock',
                sourceLabel:     'Companies House UK — Officers',
                sourceUrl:       null,
                rawData:         $officer,
            );
        }

        return $signals;
    }

    private function searchCompaniesHouse(string $name, string $apiKey): array
    {
        $response = Http::timeout(15)
            ->withBasicAuth($apiKey, '')
            ->get('https://api.company-information.service.gov.uk/search/companies', ['q' => $name]);

        if (!$response->successful()) {
            throw new \RuntimeException("Companies House search failed: HTTP {$response->status()}");
        }

        $items = $response->json('items', []);
        if (empty($items)) return [];

        $company = $items[0];
        $number  = $company['company_number'] ?? null;

        $result = [
            'title'           => $company['title'] ?? $name,
            'company_number'  => $number,
            'company_status'  => $company['company_status'] ?? null,
            'date_of_creation'=> $company['date_of_creation'] ?? null,
            'sic_codes'       => $company['sic_codes'] ?? [],
            'officers'        => [],
        ];

        if ($number) {
            $officers = Http::timeout(10)
                ->withBasicAuth($apiKey, '')
                ->get("https://api.company-information.service.gov.uk/company/{$number}/officers");

            if ($officers->successful()) {
                foreach ($officers->json('items', []) as $o) {
                    $result['officers'][] = [
                        'name'         => $o['name'] ?? '',
                        'officer_role' => $o['officer_role'] ?? '',
                    ];
                    if (count($result['officers']) >= 5) break;
                }
            }
        }

        return $result;
    }

    private function resolveApiKey(int $tenantId): ?string
    {
        $tenant = \App\Models\Tenant::find($tenantId);
        $raw = $tenant?->settings['COMPANIES_HOUSE_KEY'] ?? null;
        if (!$raw) return null;
        try { return Crypt::decryptString($raw); } catch (\Exception) { return null; }
    }
}
