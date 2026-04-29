<?php
namespace App\Models\Mail;
use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
class MailMessage extends Model {
    protected $keyType = 'string'; public $incrementing = false;
    protected $fillable = ['id','tenant_id','mail_thread_id','provider_message_id',
        'from_email','from_name','to_recipients','cc_recipients','subject',
        'body_text','body_html','sent_at','is_read','is_outbound'];
    protected $casts = ['to_recipients'=>'array','cc_recipients'=>'array',
        'sent_at'=>'datetime','is_read'=>'boolean','is_outbound'=>'boolean'];
    protected static function boot(): void { parent::boot(); static::creating(fn($m) => $m->id ??= (string)Str::uuid()); }
    protected static function booted(): void { static::addGlobalScope(new TenantScope()); }
    public function thread() { return $this->belongsTo(MailThread::class, 'mail_thread_id'); }
}
