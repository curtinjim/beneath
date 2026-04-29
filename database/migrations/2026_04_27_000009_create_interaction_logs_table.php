<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('interaction_logs', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->unsignedBigInteger('tenant_id');
            $table->char('primary_actor_id', 36);
            $table->json('related_actor_ids')->nullable();
            $table->enum('interaction_type', ['meeting', 'call', 'encounter', 'event']);
            $table->string('location_or_platform')->nullable();
            $table->date('date');
            $table->integer('duration_minutes')->nullable();
            $table->string('subject');
            $table->text('content')->nullable();
            $table->text('outcomes')->nullable();
            $table->char('project_id', 36)->nullable();
            $table->enum('pool', ['vault', 'commons'])->default('vault');
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('primary_actor_id')->references('id')->on('actors')->cascadeOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interaction_logs');
    }
};
