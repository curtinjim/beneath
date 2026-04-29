<?php
namespace App\Models;

use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Source extends Model
{
    use SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'tenant_id', 'pool', 'project_id', 'source_type', 'title',
        'url', 'file_path', 'file_mime', 'file_size', 'raw_text',
        'status', 'distil_status', 'distil_error', 'created_by', 'processed_at',
    ];

    protected $casts = [
        'processed_at' => 'datetime',
        'file_size'    => 'integer',
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

    public function tenant(): BelongsTo { return $this->belongsTo(Tenant::class); }
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function entities(): HasMany { return $this->hasMany(SourceEntity::class); }
    public function events(): HasMany { return $this->hasMany(SourceEvent::class); }
    public function claims(): HasMany { return $this->hasMany(SourceClaim::class); }
    public function commits(): HasMany { return $this->hasMany(IntelligenceCommit::class); }
}
