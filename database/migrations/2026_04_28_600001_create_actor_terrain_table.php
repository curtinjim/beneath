<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('actor_terrain', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->unsignedBigInteger('tenant_id');
            $table->char('actor_id', 36);
            $table->enum('category', ['location','access_zone','affiliation','background','operational','personnel']);
            $table->string('label', 200);
            $table->text('value');
            $table->char('related_actor_id', 36)->nullable();
            $table->text('notes')->nullable();
            $table->enum('reliability_grade', ['bedrock','rock','sand','mud','fog'])->default('sand');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('actor_id')->references('id')->on('actors')->onDelete('cascade');
            $table->index(['actor_id', 'category']);
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('actor_terrain');
    }
};
