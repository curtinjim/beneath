<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// BD-361: rename 'jack' voice to 'cole' to avoid Jackson/Jack name collision in routing
return new class extends Migration
{
    public function up(): void
    {
        DB::table('chat_sessions')->where('voice', 'jack')->update(['voice' => 'cole']);
        DB::table('chat_messages')->where('voice', 'jack')->update(['voice' => 'cole']);
    }

    public function down(): void
    {
        DB::table('chat_sessions')->where('voice', 'cole')->update(['voice' => 'jack']);
        DB::table('chat_messages')->where('voice', 'cole')->update(['voice' => 'jack']);
    }
};
