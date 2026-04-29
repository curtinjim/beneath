<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('source_events', function (Blueprint $table) {
            $table->id();
            $table->char('source_id', 36);
            $table->unsignedBigInteger('tenant_id');
            $table->enum('event_type', [
                'claim','commitment','admission','denial','action',
                'silence','position','affiliation_change','communication',
                'signal','meeting','operator_note',
            ]);
            $table->string('summary', 200);
            $table->text('content')->nullable();
            $table->char('attributed_actor_id', 36)->nullable();
            $table->string('attributed_actor_name', 255)->nullable();
            $table->date('event_date')->nullable();
            $table->enum('reliability_grade', ['bedrock', 'rock', 'sand', 'mud', 'fog']);
            $table->enum('confidence', ['high', 'medium', 'low']);
            $table->boolean('committed')->default(false);
            $table->char('committed_event_id', 36)->nullable();
            $table->timestamps();

            $table->foreign('source_id')->references('id')->on('sources')->cascadeOnDelete();
            $table->index(['source_id', 'committed']);
            $table->index(['tenant_id', 'attributed_actor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('source_events');
    }
};
