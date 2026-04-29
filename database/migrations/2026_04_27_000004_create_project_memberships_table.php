<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('project_memberships', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->char('project_id', 36);
            $table->unsignedBigInteger('user_id');
            $table->enum('member_role', ['analyst', 'reviewer']);
            $table->unsignedBigInteger('granted_by');
            $table->timestamp('granted_at');
            $table->timestamp('revoked_at')->nullable();

            $table->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('granted_by')->references('id')->on('users');
            $table->unique(['project_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_memberships');
    }
};
