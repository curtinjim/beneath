<?php

namespace App\Models;

use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class HarvestingSignal extends Model
{
    protected $keyType    = 'string';
    public    $incrementing = false;

    protected $fillable = [
        'id', 'tenant_id', 'actor_id', 'harvesting_run_id',
        'source_id', 'signal_type', 'field_name', 'proposed_value',
        'confidence', 'reliability_grade', 'source_label', 'source_url',
        'raw_data', 'status', 'reviewed_by', 'reviewed_at',
    ];

    protected $casts = [
        'raw_data'    => 'array',
        'reviewed_at' => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }

    protected static function booted(): void
    {
        static::addGlobalScope(new TenantScope());
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(Actor::class);
    }

    public function harvestingRun(): BelongsTo
    {
        return $this->belongsTo(HarvestingRun::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
