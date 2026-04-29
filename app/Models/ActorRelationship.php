<?php
namespace App\Models;
use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
class ActorRelationship extends Model {
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = [
        'tenant_id','source_actor_id','target_actor_id','relationship_type',
        'direction','status','reliability_grade','acknowledged','stance',
        'actual_influence','posture_toward_operator','leverage_read',
        'start_date','end_date','last_confirmed_at','source_event_ids','notes',
    ];
    protected $casts = [
        'acknowledged'=>'boolean','source_event_ids'=>'array',
        'start_date'=>'date','end_date'=>'date','last_confirmed_at'=>'date',
    ];
    protected static function boot(): void {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }
    protected static function booted(): void {
        static::addGlobalScope(new TenantScope());
    }
    public function sourceActor(): BelongsTo { return $this->belongsTo(Actor::class,'source_actor_id'); }
    public function targetActor(): BelongsTo { return $this->belongsTo(Actor::class,'target_actor_id'); }
}
