<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class ProjectMembership extends Model {
    public $timestamps = false;
    protected $fillable = ['project_id','user_id','member_role','granted_by','granted_at','revoked_at'];
    protected $casts = ['granted_at'=>'datetime','revoked_at'=>'datetime'];
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function grantedBy(): BelongsTo { return $this->belongsTo(User::class,'granted_by'); }
    public function isActive(): bool { return $this->revoked_at === null; }
}
