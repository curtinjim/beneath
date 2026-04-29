<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('actors', function (Blueprint $table) {
            $table->json('cross_contradictions')->nullable()->after('canary_rationale');
            $table->timestamp('cross_contradictions_at')->nullable()->after('cross_contradictions');
        });
    }

    public function down(): void
    {
        Schema::table('actors', function (Blueprint $table) {
            $table->dropColumn(['cross_contradictions', 'cross_contradictions_at']);
        });
    }
};
