<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('harvesting_runs', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->unsignedBigInteger('tenant_id');
            $table->char('actor_id', 36);
            $table->enum('trigger', ['creation', 'interval', 'manual']);
            $table->enum('status', ['running', 'completed', 'failed', 'partial']);
            $table->json('sources_queried')->nullable();
            $table->integer('signals_found')->default(0);
            $table->integer('signals_reviewed')->default(0);
            $table->integer('signals_accepted')->default(0);
            $table->integer('signals_dismissed')->default(0);
            $table->integer('duplicates_suppressed')->default(0);
            $table->text('error_message')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('actor_id')->references('id')->on('actors')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('harvesting_runs');
    }
};
