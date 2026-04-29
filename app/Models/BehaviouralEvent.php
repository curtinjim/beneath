<?php
namespace App\Models;
use App\Scopes\TenantScope;
use App\Scopes\PoolScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
class BehaviouralEvent extends Model {
    use SoftDeletes;
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = [
        'tenant_id','actor_id','pool','project_id','event_type','summary',
        'content','supporting_text','reliability_grade','event_date',
        'date_precision','source_type','source_id','related_actor_ids',
        'related_event_ids','promoted','operator_annotation','canary_marker',
    ];
    protected $casts = [
        'related_actor_ids'=>'array','related_event_ids'=>'array',
        'promoted'=>'boolean','event_date'=>'date',
    ];
    protected static function boot(): void {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }
    protected static function booted(): void {
        static::addGlobalScope(new TenantScope());
        static::addGlobalScope(new PoolScope());
    }
    public function actor(): BelongsTo { return $this->belongsTo(Actor::class); }
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
}
