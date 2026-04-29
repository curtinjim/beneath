<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('harvesting_signals', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->unsignedBigInteger('tenant_id');
            $table->char('actor_id', 36);
            $table->char('harvesting_run_id', 36);
            $table->string('source_id', 64);
            $table->enum('signal_type', ['field_value', 'news_item', 'flag']);
            $table->string('field_name', 64)->nullable();
            $table->text('proposed_value');
            $table->enum('confidence', ['high', 'medium', 'low']);
            $table->enum('reliability_grade', ['bedrock', 'rock', 'sand', 'mud', 'fog']);
            $table->string('source_label', 128);
            $table->text('source_url')->nullable();
            $table->json('raw_data');
            $table->enum('status', ['pending', 'accepted', 'dismissed', 'auto_applied'])->default('pending');
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('actor_id')->references('id')->on('actors')->cascadeOnDelete();
            $table->foreign('harvesting_run_id')->references('id')->on('harvesting_runs')->cascadeOnDelete();
            $table->foreign('reviewed_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['tenant_id', 'actor_id', 'status']);
            $table->index(['tenant_id', 'status', 'created_at']);
        });

        Schema::create('harvesting_source_suppressions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->char('actor_id', 36);
            $table->string('source_id', 64);
            $table->timestamp('suppress_until');
            $table->timestamps();

            $table->index(['tenant_id', 'actor_id', 'source_id'], 'hss_tenant_actor_source_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('harvesting_source_suppressions');
        Schema::dropIfExists('harvesting_signals');
    }
};
