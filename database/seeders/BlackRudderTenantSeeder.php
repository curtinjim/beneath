<?php
namespace Database\Seeders;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
class BlackRudderTenantSeeder extends Seeder {
    public function run(): void {
        $tenant = Tenant::create([
            'uuid'     => (string) Str::uuid(),
            'name'     => 'Black Rudder Advisory',
            'slug'     => 'black-rudder',
            'plan'     => 'solo',
            'active'   => true,
            'settings' => [
                'ai_provider' => 'anthropic',
            ],
        ]);
        User::withoutGlobalScopes()->create([
            'uuid'      => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'name'      => 'Jim Curtin',
            'email'     => 'jim@blackrudder.com',
            'password'  => Hash::make('ChangeMe!'),
            'role'      => 'owner',
            'is_active' => true,
        ]);
        $this->command->info("Black Rudder tenant seeded. Login: jim@blackrudder.com / ChangeMe!");
    }
}
