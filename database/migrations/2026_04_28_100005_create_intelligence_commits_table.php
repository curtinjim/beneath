<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('intelligence_commits', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->char('source_id', 36);
            $table->enum('commit_type', ['actor_created', 'event_created']);
            $table->string('entity_type', 50);
            $table->char('entity_id', 36);
            $table->string('source_record_type', 50);
            $table->unsignedBigInteger('source_record_id');
            $table->unsignedBigInteger('committed_by')->nullable();
            $table->timestamp('reverted_at')->nullable();
            $table->timestamps();

            $table->foreign('source_id')->references('id')->on('sources')->cascadeOnDelete();
            $table->index(['tenant_id', 'source_id']);
            $table->index(['tenant_id', 'reverted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('intelligence_commits');
    }
};
