<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('actors', function (Blueprint $table) {
            $table->text('trajectory_rationale')->nullable()->after('trajectory');
            $table->timestamp('trajectory_computed_at')->nullable()->after('trajectory_rationale');
        });
    }

    public function down(): void
    {
        Schema::table('actors', function (Blueprint $table) {
            $table->dropColumn(['trajectory_rationale', 'trajectory_computed_at']);
        });
    }
};
