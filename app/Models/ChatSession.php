<?php
namespace App\Models;

use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ChatSession extends Model {
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = [
        'tenant_id', 'user_id', 'project_id', 'title', 'voice', 'archived_at',
    ];
    protected $casts = [
        'archived_at' => 'datetime',
    ];

    protected static function boot(): void {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }

    protected static function booted(): void {
        static::addGlobalScope(new TenantScope());
    }

    public function messages(): HasMany { return $this->hasMany(ChatMessage::class, 'session_id')->orderBy('created_at'); }
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
}
