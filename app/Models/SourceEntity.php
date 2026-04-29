<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SourceEntity extends Model
{
    protected $fillable = [
        'source_id', 'tenant_id', 'entity_name', 'actor_type', 'actor_id',
        'context', 'match_type', 'confidence', 'committed', 'committed_actor_id',
    ];

    protected $casts = ['committed' => 'boolean'];

    public function source(): BelongsTo { return $this->belongsTo(Source::class); }
    public function actor(): BelongsTo { return $this->belongsTo(Actor::class); }
}
