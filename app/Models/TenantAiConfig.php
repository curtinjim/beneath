<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantAiConfig extends Model
{
    protected $fillable = [
        'tenant_id',
        'provider',
        'anthropic_api_key',
        'anthropic_model',
        'openai_api_key',
        'openai_model',
        'ollama_url',
        'ollama_model',
        'voice_configs',
        'skill_ids',
    ];

    protected $casts = [
        'voice_configs' => 'array',
        'skill_ids'     => 'array',
    ];

    protected $hidden = [
        'anthropic_api_key',
        'openai_api_key',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public static function forTenant(int $tenantId): self
    {
        return static::firstOrCreate(
            ['tenant_id' => $tenantId],
            ['provider' => 'anthropic']
        );
    }

    public function getSkillId(string $name): ?string
    {
        $map = $this->skill_ids ?? [];
        return $map[$name] ?? null;
    }
}
