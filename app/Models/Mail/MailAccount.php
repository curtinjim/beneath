<?php
namespace App\Models\Mail;
use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
class MailAccount extends Model {
    protected $keyType = 'string'; public $incrementing = false;
    protected $fillable = ['id','tenant_id','user_id','provider','email_address','display_name',
        'access_token','refresh_token','token_expires_at','status','error_message','last_synced_at','sync_settings'];
    protected $casts = ['token_expires_at'=>'datetime','last_synced_at'=>'datetime','sync_settings'=>'array'];
    protected $hidden = ['access_token','refresh_token'];
    protected static function boot(): void { parent::boot(); static::creating(fn($m) => $m->id ??= (string)Str::uuid()); }
    protected static function booted(): void { static::addGlobalScope(new TenantScope()); }
    public function threads() { return $this->hasMany(MailThread::class); }
    public function isExpired(): bool { return $this->token_expires_at && $this->token_expires_at->isPast(); }
}
