<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RegionSeeder::class,
            CategorySeeder::class,
            PackageSeeder::class,
            AdminSeeder::class,
            SiteSettingsSeeder::class,
        ]);
    }
}
