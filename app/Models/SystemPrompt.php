<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemPrompt extends Model {
    protected $fillable = ['name', 'group', 'label', 'description', 'body', 'is_active'];
    protected $casts = ['is_active' => 'boolean'];
}
