<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('source_entities', function (Blueprint $table) {
            $table->id();
            $table->char('source_id', 36);
            $table->unsignedBigInteger('tenant_id');
            $table->string('entity_name', 255);
            $table->enum('actor_type', ['person', 'organisation', 'government'])->nullable();
            $table->char('actor_id', 36)->nullable();
            $table->text('context')->nullable();
            $table->enum('match_type', ['matched', 'candidate']);
            $table->enum('confidence', ['high', 'medium', 'low'])->nullable();
            $table->boolean('committed')->default(false);
            $table->char('committed_actor_id', 36)->nullable();
            $table->timestamps();

            $table->foreign('source_id')->references('id')->on('sources')->cascadeOnDelete();
            $table->index(['source_id', 'committed']);
            $table->index(['tenant_id', 'actor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('source_entities');
    }
};
