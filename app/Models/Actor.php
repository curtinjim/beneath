<?php
namespace App\Models;
use App\Scopes\TenantScope;
use App\Scopes\PoolScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
class Actor extends Model {
    use SoftDeletes;
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = [
        'tenant_id','actor_type','pool','project_id','display_name','aliases',
        'primary_email','additional_emails','reliability_profile','trajectory',
        'trajectory_rationale','trajectory_computed_at',
        'split_suggested','split_rationale','canary_marker','canary_rationale',
        'cross_contradictions','cross_contradictions_at',
        'dormancy_state','importance_tier','tags','notes','subtype_data',
        'merged_into_id','last_enriched_at',
    ];
    protected $casts = [
        'aliases'=>'array','additional_emails'=>'array','tags'=>'array',
        'subtype_data'=>'array','last_enriched_at'=>'datetime',
        'trajectory_computed_at'=>'datetime',
        'split_suggested'=>'boolean','canary_marker'=>'boolean',
        'cross_contradictions'=>'array','cross_contradictions_at'=>'datetime',
    ];
    protected static function boot(): void {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }
    protected static function booted(): void {
        static::addGlobalScope(new TenantScope());
        static::addGlobalScope(new PoolScope());
    }
    public function tenant(): BelongsTo { return $this->belongsTo(Tenant::class); }
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function behaviouralEvents(): HasMany { return $this->hasMany(BehaviouralEvent::class); }
    public function sourceRelationships(): HasMany { return $this->hasMany(ActorRelationship::class,'source_actor_id'); }
    public function targetRelationships(): HasMany { return $this->hasMany(ActorRelationship::class,'target_actor_id'); }
}
