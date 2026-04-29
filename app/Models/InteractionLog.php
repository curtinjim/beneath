<?php
namespace App\Models;
use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
class InteractionLog extends Model {
    use SoftDeletes;
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = [
        'tenant_id','primary_actor_id','related_actor_ids','interaction_type',
        'location_or_platform','date','duration_minutes','subject',
        'content','outcomes','project_id','pool',
    ];
    protected $casts = ['related_actor_ids'=>'array','date'=>'date'];
    protected static function boot(): void {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }
    protected static function booted(): void {
        static::addGlobalScope(new TenantScope());
    }
    public function primaryActor(): BelongsTo { return $this->belongsTo(Actor::class,'primary_actor_id'); }
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
}
