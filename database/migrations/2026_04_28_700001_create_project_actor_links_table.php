<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('project_actor_links', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->unsignedBigInteger('tenant_id');
            $table->char('project_id', 36);
            $table->char('actor_id', 36);
            $table->enum('stance', ['party_line','independent','divergent','unknown'])->nullable();
            $table->string('predicted_reaction', 500)->nullable();
            $table->text('linkage_notes')->nullable();
            $table->timestamps();

            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign('actor_id')->references('id')->on('actors')->onDelete('cascade');
            $table->unique(['project_id', 'actor_id']);
            $table->index(['project_id', 'tenant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_actor_links');
    }
};
