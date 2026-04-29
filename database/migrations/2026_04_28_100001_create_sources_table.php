<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sources', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->unsignedBigInteger('tenant_id');
            $table->enum('pool', ['commons', 'vault']);
            $table->char('project_id', 36)->nullable();
            $table->enum('source_type', ['url', 'file', 'meeting_note', 'observation', 'voice']);
            $table->string('title', 255)->nullable();
            $table->text('url')->nullable();
            $table->text('file_path')->nullable();
            $table->string('file_mime', 100)->nullable();
            $table->unsignedInteger('file_size')->nullable();
            $table->longText('raw_text')->nullable();
            $table->enum('status', ['pending', 'processing', 'done', 'failed'])->default('pending');
            $table->enum('distil_status', ['pending', 'processing', 'done', 'failed', 'skipped'])->default('pending');
            $table->text('distil_error')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->timestamp('processed_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->nullOnDelete();
            $table->index(['tenant_id', 'source_type', 'status']);
            $table->index(['tenant_id', 'distil_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sources');
    }
};
