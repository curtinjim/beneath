<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("ALTER TABLE actors MODIFY COLUMN dormancy_state ENUM('active','dormant','archived') NOT NULL DEFAULT 'active'");
    }

    public function down(): void
    {
        // Move any archived actors back to dormant before removing the value
        DB::statement("UPDATE actors SET dormancy_state = 'dormant' WHERE dormancy_state = 'archived'");
        DB::statement("ALTER TABLE actors MODIFY COLUMN dormancy_state ENUM('active','dormant') NOT NULL DEFAULT 'active'");
    }
};
