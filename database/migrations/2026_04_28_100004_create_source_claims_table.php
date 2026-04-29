<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('source_claims', function (Blueprint $table) {
            $table->id();
            $table->char('source_id', 36);
            $table->unsignedBigInteger('tenant_id');
            $table->text('claim_text');
            $table->char('attributed_actor_id', 36)->nullable();
            $table->string('attributed_actor_name', 255)->nullable();
            $table->text('context')->nullable();
            $table->enum('confidence', ['high', 'medium', 'low']);
            $table->boolean('committed')->default(false);
            $table->timestamps();

            $table->foreign('source_id')->references('id')->on('sources')->cascadeOnDelete();
            $table->index(['source_id', 'committed']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('source_claims');
    }
};
