<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('mail_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('tenant_id');
            $table->uuid('mail_thread_id');
            $table->string('provider_message_id');
            $table->string('from_email');
            $table->string('from_name')->nullable();
            $table->json('to_recipients');
            $table->json('cc_recipients')->nullable();
            $table->string('subject')->nullable();
            $table->longText('body_text')->nullable();
            $table->longText('body_html')->nullable();
            $table->timestamp('sent_at');
            $table->boolean('is_read')->default(false);
            $table->boolean('is_outbound')->default(false);
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->unique(['mail_thread_id', 'provider_message_id']);
            $table->index(['tenant_id', 'sent_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('mail_messages'); }
};
