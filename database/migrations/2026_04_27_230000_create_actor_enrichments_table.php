<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create("actor_enrichments", function (Blueprint $table) {
            $table->uuid("id")->primary();
            $table->string("tenant_id");
            $table->uuid("actor_id");
            $table->string("status")->default("pending"); // pending|running|done|failed
            $table->json("enrichment_fields")->nullable();
            $table->json("leverage_read_suggestion")->nullable();
            $table->string("job_id")->nullable();
            $table->timestamps();
            $table->index(["actor_id", "created_at"]);
        });
    }
    public function down(): void { Schema::dropIfExists("actor_enrichments"); }
};
