<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntelligenceCommit extends Model
{
    protected $fillable = [
        'tenant_id', 'source_id', 'commit_type', 'entity_type', 'entity_id',
        'source_record_type', 'source_record_id', 'committed_by', 'reverted_at',
    ];

    protected $casts = ['reverted_at' => 'datetime'];

    public function source(): BelongsTo { return $this->belongsTo(Source::class); }
}
