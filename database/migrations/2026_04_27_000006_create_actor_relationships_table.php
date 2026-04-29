<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('actor_relationships', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->unsignedBigInteger('tenant_id');
            $table->char('source_actor_id', 36);
            $table->char('target_actor_id', 36);
            $table->enum('relationship_type', ['affiliation', 'coalition', 'adversarial', 'subsidiary', 'contractual', 'regulatory', 'lobbying', 'personal', 'intermediary', 'ownership']);
            $table->enum('direction', ['directed', 'bidirectional']);
            $table->enum('status', ['active', 'historical', 'alleged', 'refuted'])->default('active');
            $table->enum('reliability_grade', ['bedrock', 'rock', 'sand', 'mud', 'fog']);
            $table->boolean('acknowledged')->default(false);
            $table->enum('stance', ['party_line', 'independent', 'divergent', 'unknown'])->default('unknown')->nullable();
            $table->enum('actual_influence', ['high', 'medium', 'low', 'unknown'])->default('unknown')->nullable();
            $table->enum('posture_toward_operator', ['ally', 'neutral', 'adversarial', 'unknown'])->default('unknown')->nullable();
            $table->enum('leverage_read', ['channel', 'signal', 'risk', 'none'])->default('none')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->date('last_confirmed_at')->nullable();
            $table->json('source_event_ids')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('source_actor_id')->references('id')->on('actors')->cascadeOnDelete();
            $table->foreign('target_actor_id')->references('id')->on('actors')->cascadeOnDelete();
            $table->index(['tenant_id', 'source_actor_id']);
            $table->index(['tenant_id', 'target_actor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('actor_relationships');
    }
};
