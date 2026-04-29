<?php
namespace App\Models;
use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;
class AuditLog extends Model {
    public $timestamps = false;
    const UPDATED_AT = null;
    protected $table = 'audit_log';
    protected $fillable = [
        'tenant_id','user_id','operation','table_name','record_id',
        'before','after','ip_address',
    ];
    protected $casts = ['before'=>'array','after'=>'array','created_at'=>'datetime'];
    protected static function booted(): void {
        static::addGlobalScope(new TenantScope());
    }
}
