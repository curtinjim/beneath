<?php
namespace App\Models;
use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
class TaskRecord extends Model {
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = [
        'tenant_id','actor_id','related_actor_ids','title','description',
        'due_date','status','completed_at','source_interaction_id',
        'source_event_id','project_id',
    ];
    protected $casts = [
        'related_actor_ids'=>'array','due_date'=>'date','completed_at'=>'datetime',
    ];
    protected static function boot(): void {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }
    protected static function booted(): void {
        static::addGlobalScope(new TenantScope());
    }
    public function actor(): BelongsTo { return $this->belongsTo(Actor::class); }
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
}
