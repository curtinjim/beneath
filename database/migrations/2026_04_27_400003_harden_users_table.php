<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $existing = array_column(DB::select('DESCRIBE users'), 'Field');

        // Expand role enum to include any new values we need
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('owner','admin','analyst','reviewer','guest','member') NOT NULL DEFAULT 'member'");

        Schema::table('users', function (Blueprint $table) use ($existing) {
            // status — we use is_active already; add a string status col only if absent
            if (!in_array('status', $existing))
                $table->string('status', 32)->default('active')->after('role');

            if (!in_array('invited_by', $existing))
                $table->foreignId('invited_by')->nullable()->constrained('users')->nullOnDelete()->after('status');
        });
    }

    public function down(): void
    {
        $existing = array_column(DB::select('DESCRIBE users'), 'Field');

        Schema::table('users', function (Blueprint $table) use ($existing) {
            if (in_array('invited_by', $existing))
                $table->dropForeign(['invited_by']);
            if (in_array('invited_by', $existing))
                $table->dropColumn('invited_by');
            if (in_array('status', $existing))
                $table->dropColumn('status');
        });

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('owner','admin','analyst','reviewer','guest') NOT NULL DEFAULT 'guest'");
    }
};
