<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SourceClaim extends Model
{
    protected $fillable = [
        'source_id', 'tenant_id', 'claim_text',
        'attributed_actor_id', 'attributed_actor_name',
        'context', 'confidence', 'committed',
    ];

    protected $casts = ['committed' => 'boolean'];

    public function source(): BelongsTo { return $this->belongsTo(Source::class); }
}
