<?php

namespace Database\Seeders;

use App\Models\AdminStaff;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@daleel.sa'],
            [
                'name'           => 'مدير النظام',
                'email'          => 'admin@daleel.sa',
                'password'       => Hash::make('Admin@123456'),
                'role'           => 'admin',
                'is_active'      => true,
                'email_verified' => true,
            ]
        );

        $moderator = User::firstOrCreate(
            ['email' => 'moderator@daleel.sa'],
            [
                'name'           => 'مشرف',
                'email'          => 'moderator@daleel.sa',
                'password'       => Hash::make('Mod@123456'),
                'role'           => 'moderator',
                'is_active'      => true,
                'email_verified' => true,
            ]
        );

        AdminStaff::firstOrCreate(
            ['user_id' => $moderator->id],
            [
                'department'  => 'operations',
                'permissions' => [
                    'manage_providers', 'manage_reviews',
                    'manage_tickets', 'view_payments',
                ],
                'is_active' => true,
            ]
        );

        $this->command->info("Admin created: admin@daleel.sa / Admin@123456");
        $this->command->info("Moderator created: moderator@daleel.sa / Mod@123456");
    }
}
