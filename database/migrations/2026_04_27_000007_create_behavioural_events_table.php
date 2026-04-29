<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('behavioural_events', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->unsignedBigInteger('tenant_id');
            $table->char('actor_id', 36);
            $table->enum('pool', ['commons', 'vault']);
            $table->char('project_id', 36)->nullable();
            $table->enum('event_type', ['claim', 'commitment', 'admission', 'denial', 'action', 'silence', 'position', 'affiliation_change', 'communication', 'signal', 'meeting', 'operator_note']);
            $table->string('summary', 200);
            $table->text('content');
            $table->text('supporting_text')->nullable();
            $table->enum('reliability_grade', ['bedrock', 'rock', 'sand', 'mud', 'fog']);
            $table->date('event_date')->nullable();
            $table->enum('date_precision', ['exact', 'approximate', 'year_only', 'unknown'])->default('unknown');
            $table->enum('source_type', ['document', 'email', 'harvest', 'operator']);
            $table->char('source_id', 36)->nullable();
            $table->json('related_actor_ids')->nullable();
            $table->json('related_event_ids')->nullable();
            $table->boolean('promoted')->default(false);
            $table->text('operator_annotation')->nullable();
            $table->string('canary_marker')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('actor_id')->references('id')->on('actors')->cascadeOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->nullOnDelete();
            $table->index(['tenant_id', 'actor_id', 'event_date']);
            $table->index(['tenant_id', 'pool', 'project_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('behavioural_events');
    }
};
