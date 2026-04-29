<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// BD-133: add tenant_id to chat_messages; backfill via chat_sessions join
// Fix v2: idempotent — column may already exist nullable from first failed run
//         (first run used wrong FK 'chat_session_id'; this uses correct 'session_id')
return new class extends Migration
{
    public function up(): void
    {
        // Guard: first attempt left a nullable column behind when the UPDATE failed.
        // Skip ADD COLUMN if it already exists to avoid "Duplicate column" error.
        if (!Schema::hasColumn('chat_messages', 'tenant_id')) {
            Schema::table('chat_messages', function (Blueprint $table) {
                $table->unsignedBigInteger('tenant_id')->nullable()->after('id')->index();
            });
        }

        // Backfill from the parent session (column is session_id, confirmed from migration)
        DB::statement('
            UPDATE chat_messages cm
            JOIN chat_sessions cs ON cs.id = cm.session_id
            SET cm.tenant_id = cs.tenant_id
            WHERE cm.tenant_id IS NULL
        ');

        Schema::table('chat_messages', function (Blueprint $table) {
            $table->unsignedBigInteger('tenant_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->dropColumn('tenant_id');
        });
    }
};
