<?php

namespace App\Services\Harvesting\Sources;

use App\Models\Actor;
use App\Services\Harvesting\HarvestingSource;
use App\Services\Harvesting\HarvestSignal;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;

class SamGovSource implements HarvestingSource
{
    public function supports(Actor $actor): bool
    {
        return in_array($actor->actor_type, ['organisation', 'government']);
    }

    public function harvest(Actor $actor): array
    {
        $apiKey = $this->resolveApiKey($actor->tenant_id);
        if (!$apiKey) return [];  // HARV-KEY-003: skip silently if no key

        $cacheKey = 'harvest:samgov:' . md5($actor->id);

        $data = Cache::remember($cacheKey, 3600, function () use ($actor, $apiKey) {
            return $this->querySamGov($actor->display_name, $apiKey);
        });

        if (empty($data)) return [];

        $signals = [];

        $fieldMap = [
            'cage_code'         => ['field' => 'notes', 'label' => 'CAGE Code'],
            'registration_status' => ['field' => 'notes', 'label' => 'SAM Registration Status'],
            'expiration_date'   => ['field' => 'notes', 'label' => 'SAM Registration Expiry'],
            'naics_codes'       => ['field' => 'notes', 'label' => 'NAICS Codes'],
        ];

        foreach ($fieldMap as $key => [$meta]) {
            if (!empty($data[$key])) {
                $value = is_array($data[$key]) ? implode(', ', $data[$key]) : $data[$key];
                $signals[] = HarvestSignal::fieldValue(
                    sourceId:        'SamGovSource',
                    fieldName:       $meta['field'],
                    proposedValue:   "{$meta['label']}: {$value}",
                    confidence:      'high',
                    reliabilityGrade:'bedrock',
                    sourceLabel:     'SAM.gov',
                    sourceUrl:       'https://sam.gov',
                    rawData:         $data,
                );
            }
        }

        return $signals;
    }

    private function querySamGov(string $name, string $apiKey): array
    {
        $encoded  = urlencode($name);
        $response = Http::timeout(15)->get(
            "https://api.sam.gov/entity-information/v3/entities",
            ['api_key' => $apiKey, 'legalBusinessName' => $encoded, 'registrationStatus' => 'Active']
        );

        if (!$response->successful()) {
            throw new \RuntimeException("SAM.gov API failed: HTTP {$response->status()}");
        }

        $entities = $response->json('entityData', []);
        if (empty($entities)) return [];

        $e = $entities[0];
        $reg = $e['entityRegistration'] ?? [];
        $core = $e['coreData'] ?? [];

        return array_filter([
            'cage_code'           => $reg['cageCode'] ?? null,
            'registration_status' => $reg['registrationStatus'] ?? null,
            'expiration_date'     => $reg['registrationExpirationDate'] ?? null,
            'naics_codes'         => array_column($core['naicsCode'] ?? [], 'naicsCode'),
            'legal_name'          => $reg['legalBusinessName'] ?? null,
        ]);
    }

    private function resolveApiKey(int $tenantId): ?string
    {
        $tenant = \App\Models\Tenant::find($tenantId);
        $raw = $tenant?->settings['SAMGOV_API_KEY'] ?? null;
        if (!$raw) return null;
        try { return Crypt::decryptString($raw); } catch (\Exception) { return null; }
    }
}
