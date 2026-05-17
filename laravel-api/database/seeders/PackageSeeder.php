<?php

namespace Database\Seeders;

use App\Models\Package;
use Illuminate\Database\Seeder;

class PackageSeeder extends Seeder
{
    public function run(): void
    {
        $packages = [
            [
                'name'                   => 'المجاني',
                'name_en'                => 'Free',
                'tier'                   => 'free',
                'price'                  => 0,
                'yearly_price'           => 0,
                'duration_days'          => 36500,
                'max_services'           => 3,
                'max_images_per_service' => 2,
                'featured_listing'       => false,
                'priority_support'       => false,
                'analytics_access'       => false,
                'verified_badge'         => false,
                'features'               => ['3 خدمات', '2 صور لكل خدمة', 'ظهور أساسي'],
                'sort_order'             => 1,
            ],
            [
                'name'                   => 'برونزي',
                'name_en'                => 'Bronze',
                'tier'                   => 'bronze',
                'price'                  => 99,
                'yearly_price'           => 999,
                'duration_days'          => 30,
                'max_services'           => 10,
                'max_images_per_service' => 5,
                'featured_listing'       => false,
                'priority_support'       => true,
                'analytics_access'       => true,
                'verified_badge'         => false,
                'features'               => ['10 خدمات', '5 صور لكل خدمة', 'دعم أولوية', 'إحصائيات'],
                'sort_order'             => 2,
            ],
            [
                'name'                   => 'مميز',
                'name_en'                => 'Premium',
                'tier'                   => 'premium',
                'price'                  => 199,
                'yearly_price'           => 1999,
                'duration_days'          => 30,
                'max_services'           => 50,
                'max_images_per_service' => 10,
                'featured_listing'       => true,
                'priority_support'       => true,
                'analytics_access'       => true,
                'verified_badge'         => true,
                'features'               => [
                    '50 خدمة', '10 صور لكل خدمة', 'ظهور مميز',
                    'شارة التحقق', 'دعم أولوية', 'إحصائيات متقدمة',
                ],
                'sort_order'             => 3,
            ],
        ];

        foreach ($packages as $pkg) {
            Package::create($pkg);
        }
    }
}
