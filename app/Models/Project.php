<?php
namespace App\Models;
use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Project extends Model
{
    protected $keyType   = 'string';
    public $incrementing = false;

    protected $fillable = [
        'tenant_id','name','description','goal_statement',
        'classification_level','narrative','narrative_at',
    ];

    protected $casts = [
        'archived_at'  => 'datetime',
        'narrative_at' => 'datetime',
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

    public function tenant(): BelongsTo      { return $this->belongsTo(Tenant::class); }
    public function memberships(): HasMany   { return $this->hasMany(ProjectMembership::class); }
    public function actorLinks(): HasMany    { return $this->hasMany(ProjectActorLink::class); }
}
