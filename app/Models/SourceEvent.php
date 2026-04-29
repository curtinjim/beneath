<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SourceEvent extends Model
{
    protected $fillable = [
        'source_id', 'tenant_id', 'event_type', 'summary', 'content',
        'attributed_actor_id', 'attributed_actor_name', 'event_date',
        'reliability_grade', 'confidence', 'committed', 'committed_event_id',
    ];

    protected $casts = [
        'committed'  => 'boolean',
        'event_date' => 'date',
    ];

    public function source(): BelongsTo { return $this->belongsTo(Source::class); }
}
