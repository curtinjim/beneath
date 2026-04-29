<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('task_records', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->unsignedBigInteger('tenant_id');
            $table->char('actor_id', 36);
            $table->json('related_actor_ids')->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('due_date')->nullable();
            $table->enum('status', ['open', 'completed', 'dismissed'])->default('open');
            $table->timestamp('completed_at')->nullable();
            $table->char('source_interaction_id', 36)->nullable();
            $table->char('source_event_id', 36)->nullable();
            $table->char('project_id', 36)->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('actor_id')->references('id')->on('actors')->cascadeOnDelete();
            $table->foreign('source_interaction_id')->references('id')->on('interaction_logs')->nullOnDelete();
            $table->foreign('source_event_id')->references('id')->on('behavioural_events')->nullOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_records');
    }
};
