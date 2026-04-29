<?php

namespace App\Services\Harvesting\Sources;

use App\Models\Actor;
use App\Services\Harvesting\HarvestingSource;
use App\Services\Harvesting\HarvestSignal;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;

class HunterSource implements HarvestingSource
{
    public function supports(Actor $actor): bool
    {
        return $actor->actor_type === 'person';
    }

    public function harvest(Actor $actor): array
    {
        $apiKey = $this->resolveApiKey($actor->tenant_id);
        if (!$apiKey) return [];

        // Need an organisation domain to query Hunter
        $domain = $actor->subtype_data['organisation_domain'] ?? null;
        if (!$domain) return [];

        // Parse first and last name from display_name
        $parts = explode(' ', trim($actor->display_name), 2);
        $first = $parts[0] ?? '';
        $last  = $parts[1] ?? '';
        if (!$first || !$last) return [];

        $cacheKey = 'harvest:hunter:' . md5($actor->id . $domain);

        $result = Cache::remember($cacheKey, 3600, function () use ($first, $last, $domain, $apiKey) {
            return $this->findEmail($first, $last, $domain, $apiKey);
        });

        if (empty($result['email'])) return [];

        $confidence = match (true) {
            ($result['score'] ?? 0) >= 80 => 'high',
            ($result['score'] ?? 0) >= 50 => 'medium',
            default                        => 'low',
        };

        $reliabilityGrade = $confidence === 'high' ? 'rock' : 'sand';

        return [
            HarvestSignal::fieldValue(
                sourceId:        'HunterSource',
                fieldName:       'primary_email',
                proposedValue:   $result['email'],
                confidence:      $confidence,
                reliabilityGrade:$reliabilityGrade,
                sourceLabel:     "Hunter.io (confidence: {$result['score']}%)",
                sourceUrl:       'https://hunter.io',
                rawData:         $result,
            ),
        ];
    }

    private function findEmail(string $first, string $last, string $domain, string $apiKey): array
    {
        $response = Http::timeout(10)->get('https://api.hunter.io/v2/email-finder', [
            'first_name' => $first,
            'last_name'  => $last,
            'domain'     => $domain,
            'api_key'    => $apiKey,
        ]);

        if (!$response->successful()) {
            throw new \RuntimeException("Hunter.io API failed: HTTP {$response->status()}");
        }

        return $response->json('data', []);
    }

    private function resolveApiKey(int $tenantId): ?string
    {
        $tenant = \App\Models\Tenant::find($tenantId);
        $raw = $tenant?->settings['HUNTER_API_KEY'] ?? null;
        if (!$raw) return null;
        try { return Crypt::decryptString($raw); } catch (\Exception) { return null; }
    }
}
