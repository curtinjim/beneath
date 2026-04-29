<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('mail_threads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('tenant_id');
            $table->uuid('mail_account_id');
            $table->string('provider_thread_id');
            $table->string('subject')->nullable();
            $table->json('participants');          // [{email, name}]
            $table->integer('message_count')->default(0);
            $table->timestamp('last_message_at')->nullable();
            $table->boolean('has_unread')->default(false);
            $table->json('labels')->nullable();
            $table->boolean('significance_assessed')->default(false);
            $table->decimal('significance_score', 4, 2)->nullable();
            $table->string('significance_summary')->nullable();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->unique(['mail_account_id', 'provider_thread_id']);
            $table->index(['tenant_id', 'last_message_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('mail_threads'); }
};
