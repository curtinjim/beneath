<?php
namespace App\Models\Mail;
use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;
use App\Models\Actor;
use Illuminate\Support\Str;
class MailActorLink extends Model {
    protected $keyType = 'string'; public $incrementing = false;
    protected $fillable = ['id','tenant_id','mail_thread_id','actor_id','matched_email','match_confidence','boundary_crossed'];
    protected $casts = ['boundary_crossed'=>'boolean'];
    protected static function boot(): void { parent::boot(); static::creating(fn($m) => $m->id ??= (string)Str::uuid()); }
    protected static function booted(): void { static::addGlobalScope(new TenantScope()); }
    public function actor() { return $this->belongsTo(Actor::class); }
    public function thread() { return $this->belongsTo(MailThread::class, 'mail_thread_id'); }
}
