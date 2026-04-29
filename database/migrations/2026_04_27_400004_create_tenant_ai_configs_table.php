<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_ai_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('provider', 32)->default('ollama'); // ollama|openai|anthropic
            $table->string('endpoint')->nullable();            // custom Ollama URL
            $table->string('model', 128)->nullable();          // e.g. llama3, gpt-4o, claude-3-5-sonnet
            $table->text('api_key_enc')->nullable();           // AES-256-CBC encrypted
            $table->boolean('fallback_to_default')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_ai_configs');
    }
};
