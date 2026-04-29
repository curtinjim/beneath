<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('mail_actor_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('tenant_id');
            $table->uuid('mail_thread_id');
            $table->uuid('actor_id');
            $table->string('matched_email');
            $table->enum('match_confidence', ['confirmed', 'auto', 'suggested'])->default('auto');
            $table->boolean('boundary_crossed')->default(false);
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->unique(['mail_thread_id', 'actor_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('mail_actor_links'); }
};
