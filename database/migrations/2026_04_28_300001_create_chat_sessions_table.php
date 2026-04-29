<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('chat_sessions', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('user_id')->index();
            $table->char('project_id', 36)->nullable();
            $table->string('title')->default('New chat');
            $table->enum('voice', ['maisie','pippa','cate','lance','jack','jackson'])->default('maisie');
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->nullOnDelete();
            $table->index(['tenant_id', 'user_id', 'archived_at']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('chat_sessions');
    }
};
