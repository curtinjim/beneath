<?php
namespace App\Models;
use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
class HarvestingRun extends Model {
    public $timestamps = false;
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = [
        'tenant_id','actor_id','trigger','status','sources_queried',
        'signals_found','signals_reviewed','signals_accepted',
        'signals_dismissed','duplicates_suppressed','error_message',
        'started_at','completed_at',
    ];
    protected $casts = [
        'sources_queried'=>'array','started_at'=>'datetime','completed_at'=>'datetime',
    ];
    protected static function boot(): void {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }
    protected static function booted(): void {
        static::addGlobalScope(new TenantScope());
    }
    public function actor(): BelongsTo { return $this->belongsTo(Actor::class); }
}
