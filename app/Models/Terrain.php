<?php
namespace App\Models;
use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Terrain extends Model
{
    protected $table      = 'actor_terrain';
    protected $keyType    = 'string';
    public $incrementing  = false;

    protected $fillable = [
        'tenant_id','actor_id','category','label','value',
        'related_actor_id','notes','reliability_grade','sort_order',
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

    public function relatedActor(): BelongsTo
    {
        return $this->belongsTo(Actor::class, 'related_actor_id');
    }
}
