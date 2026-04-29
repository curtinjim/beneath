<?php
namespace App\Models\Mail;
use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
class MailThread extends Model {
    protected $keyType = 'string'; public $incrementing = false;
    protected $fillable = ['id','tenant_id','mail_account_id','provider_thread_id','subject',
        'participants','message_count','last_message_at','has_unread','labels',
        'significance_assessed','significance_score','significance_summary'];
    protected $casts = ['participants'=>'array','labels'=>'array','last_message_at'=>'datetime',
        'significance_assessed'=>'boolean','has_unread'=>'boolean'];
    protected static function boot(): void { parent::boot(); static::creating(fn($m) => $m->id ??= (string)Str::uuid()); }
    protected static function booted(): void { static::addGlobalScope(new TenantScope()); }
    public function account() { return $this->belongsTo(MailAccount::class, 'mail_account_id'); }
    public function messages() { return $this->hasMany(MailMessage::class)->orderBy('sent_at'); }
    public function actorLinks() { return $this->hasMany(MailActorLink::class); }
}
