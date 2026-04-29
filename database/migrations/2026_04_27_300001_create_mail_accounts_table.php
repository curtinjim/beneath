<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('mail_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('user_id');
            $table->enum('provider', ['gmail', 'm365']);
            $table->string('email_address');
            $table->string('display_name')->nullable();
            $table->text('access_token');
            $table->text('refresh_token')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->enum('status', ['active', 'error', 'disconnected'])->default('active');
            $table->string('error_message')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->json('sync_settings')->nullable();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->unique(['user_id', 'provider', 'email_address']);
        });
    }
    public function down(): void { Schema::dropIfExists('mail_accounts'); }
};
