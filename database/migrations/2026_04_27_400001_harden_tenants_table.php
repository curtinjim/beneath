<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Modify existing plan enum to include new plan names
        DB::statement("ALTER TABLE tenants MODIFY COLUMN plan ENUM('solo','team','enterprise','trial','starter','growth') NOT NULL DEFAULT 'trial'");

        Schema::table('tenants', function (Blueprint $table) {
            $existing = $this->existingColumns();

            if (!in_array('seat_limit', $existing))
                $table->unsignedSmallInteger('seat_limit')->default(3)->after('plan');

            if (!in_array('billing_email', $existing))
                $table->string('billing_email')->nullable()->after('seat_limit');

            if (!in_array('stripe_customer_id', $existing))
                $table->string('stripe_customer_id', 64)->nullable()->unique()->after('billing_email');

            if (!in_array('stripe_subscription_id', $existing))
                $table->string('stripe_subscription_id', 64)->nullable()->unique()->after('stripe_customer_id');

            if (!in_array('stripe_price_id', $existing))
                $table->string('stripe_price_id', 64)->nullable()->after('stripe_subscription_id');

            if (!in_array('trial_ends_at', $existing))
                $table->timestamp('trial_ends_at')->nullable()->after('stripe_price_id');

            if (!in_array('onboarding_completed_at', $existing))
                $table->timestamp('onboarding_completed_at')->nullable()->after('trial_ends_at');

            if (!in_array('suspended_at', $existing))
                $table->timestamp('suspended_at')->nullable()->after('onboarding_completed_at');

            if (!in_array('subdomain', $existing))
                $table->string('subdomain', 63)->nullable()->unique()->after('suspended_at');

            if (!in_array('timezone', $existing))
                $table->string('timezone', 64)->default('UTC')->after('subdomain');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(array_filter([
                'seat_limit', 'billing_email', 'stripe_customer_id',
                'stripe_subscription_id', 'stripe_price_id',
                'trial_ends_at', 'onboarding_completed_at', 'suspended_at',
                'subdomain', 'timezone',
            ], fn($col) => in_array($col, $this->existingColumns())));
        });

        DB::statement("ALTER TABLE tenants MODIFY COLUMN plan ENUM('solo','team','enterprise') NOT NULL DEFAULT 'solo'");
    }

    private function existingColumns(): array
    {
        return array_column(DB::select('DESCRIBE tenants'), 'Field');
    }
};
