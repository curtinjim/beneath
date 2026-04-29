<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('project_signal_scores', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->char('project_id', 36);
            $table->char('signal_id', 36);
            $table->unsignedTinyInteger('relevance_score')->default(0); // 0–100
            $table->text('relevance_note')->nullable();
            $table->timestamp('scored_at')->useCurrent();

            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->unique(['project_id', 'signal_id']);
            $table->index('project_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_signal_scores');
    }
};
