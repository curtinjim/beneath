<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('chat_messages', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('session_id', 36)->index();
            $table->enum('role', ['user', 'assistant']);
            $table->longText('content');
            $table->string('voice', 32)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('session_id')->references('id')->on('chat_sessions')->cascadeOnDelete();
        });
    }

    public function down(): void {
        Schema::dropIfExists('chat_messages');
    }
};
