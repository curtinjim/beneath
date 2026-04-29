<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('actors', function (Blueprint $table) {
            $table->boolean('split_suggested')->default(false)->after('trajectory_computed_at');
            $table->text('split_rationale')->nullable()->after('split_suggested');
            $table->boolean('canary_marker')->default(false)->after('split_rationale');
            $table->text('canary_rationale')->nullable()->after('canary_marker');
        });
    }

    public function down(): void {
        Schema::table('actors', function (Blueprint $table) {
            $table->dropColumn(['split_suggested', 'split_rationale', 'canary_marker', 'canary_rationale']);
        });
    }
};
