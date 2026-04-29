<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ActorEnrichment extends Model {
    protected $keyType = "string";
    public $incrementing = false;
    protected $fillable = [
        "id","tenant_id","actor_id","status","enrichment_fields","leverage_read_suggestion","job_id",
    ];
    protected $casts = [
        "enrichment_fields" => "array",
        "leverage_read_suggestion" => "array",
    ];
    protected static function boot(): void {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }
    public function actor() { return $this->belongsTo(Actor::class); }
}
