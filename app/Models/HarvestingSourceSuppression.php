<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HarvestingSourceSuppression extends Model
{
    protected $fillable = ['tenant_id', 'actor_id', 'source_id', 'suppress_until'];
    protected $casts    = ['suppress_until' => 'datetime'];

    public function actor(): BelongsTo
    {
        return $this->belongsTo(Actor::class);
    }
}
