<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ProjectActorLink extends Model
{
    protected $table     = 'project_actor_links';
    protected $keyType   = 'string';
    public $incrementing = false;

    protected $fillable = [
        'tenant_id','project_id','actor_id',
        'stance','predicted_reaction','linkage_notes',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }

    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function actor(): BelongsTo   { return $this->belongsTo(Actor::class); }
}
