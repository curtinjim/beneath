<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('actors', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->unsignedBigInteger('tenant_id');
            $table->enum('actor_type', ['person', 'organisation', 'government']);
            $table->enum('pool', ['commons', 'vault']);
            $table->char('project_id', 36)->nullable();
            $table->string('display_name');
            $table->json('aliases')->nullable();
            $table->string('primary_email')->nullable();
            $table->json('additional_emails')->nullable();
            $table->enum('reliability_profile', ['bedrock', 'rock', 'sand', 'mud', 'fog'])->default('sand');
            $table->enum('trajectory', ['ascending', 'stable', 'declining', 'unclear'])->default('unclear');
            $table->enum('dormancy_state', ['active', 'dormant'])->default('active');
            $table->enum('importance_tier', ['tier_1', 'tier_2', 'tier_3', 'unclassified'])->default('unclassified');
            $table->json('tags')->nullable();
            $table->text('notes')->nullable();
            $table->json('subtype_data')->nullable();
            $table->char('merged_into_id', 36)->nullable();
            $table->timestamp('last_enriched_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->nullOnDelete();
            $table->index(['tenant_id', 'pool', 'project_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('actors');
    }
};
