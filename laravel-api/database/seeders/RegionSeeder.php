<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\City;
use App\Models\Region;
use Illuminate\Database\Seeder;

class RegionSeeder extends Seeder
{
    public function run(): void
    {
        $regions = [
            ['name' => 'منطقة الرياض',     'name_en' => 'Riyadh Region',         'cities' => [
                ['name' => 'الرياض',     'name_en' => 'Riyadh',     'areas' => ['العليا', 'النزهة', 'الملز', 'الروضة', 'الورود', 'الصحافة', 'حي الجامعة']],
                ['name' => 'الخرج',     'name_en' => 'Al Kharj',   'areas' => []],
                ['name' => 'المجمعة',   'name_en' => 'Majmaah',    'areas' => []],
            ]],
            ['name' => 'منطقة مكة المكرمة', 'name_en' => 'Makkah Region',         'cities' => [
                ['name' => 'جدة',      'name_en' => 'Jeddah',     'areas' => ['الحمراء', 'الروضة', 'السلامة', 'الزهراء', 'النزلة']],
                ['name' => 'مكة المكرمة', 'name_en' => 'Makkah',  'areas' => []],
                ['name' => 'الطائف',   'name_en' => 'Taif',       'areas' => []],
            ]],
            ['name' => 'المنطقة الشرقية',   'name_en' => 'Eastern Province',      'cities' => [
                ['name' => 'الدمام',   'name_en' => 'Dammam',     'areas' => ['الفيصلية', 'الشاطئ', 'العدامة']],
                ['name' => 'الخبر',    'name_en' => 'Al Khobar',  'areas' => []],
                ['name' => 'الأحساء',  'name_en' => 'Al Ahsa',    'areas' => []],
            ]],
            ['name' => 'منطقة المدينة المنورة', 'name_en' => 'Madinah Region',    'cities' => [
                ['name' => 'المدينة المنورة', 'name_en' => 'Madinah', 'areas' => []],
                ['name' => 'ينبع',     'name_en' => 'Yanbu',      'areas' => []],
            ]],
            ['name' => 'منطقة القصيم',      'name_en' => 'Al Qassim Region',      'cities' => [
                ['name' => 'بريدة',    'name_en' => 'Buraydah',   'areas' => []],
                ['name' => 'عنيزة',    'name_en' => 'Unaizah',    'areas' => []],
            ]],
            ['name' => 'منطقة عسير',        'name_en' => 'Asir Region',           'cities' => [
                ['name' => 'أبها',     'name_en' => 'Abha',       'areas' => []],
                ['name' => 'خميس مشيط', 'name_en' => 'Khamis Mushait', 'areas' => []],
            ]],
            ['name' => 'منطقة تبوك',        'name_en' => 'Tabuk Region',          'cities' => [
                ['name' => 'تبوك',     'name_en' => 'Tabuk',      'areas' => []],
            ]],
            ['name' => 'منطقة حائل',        'name_en' => 'Hail Region',           'cities' => [
                ['name' => 'حائل',     'name_en' => 'Hail',       'areas' => []],
            ]],
            ['name' => 'منطقة جازان',       'name_en' => 'Jizan Region',          'cities' => [
                ['name' => 'جازان',    'name_en' => 'Jizan',      'areas' => []],
            ]],
            ['name' => 'منطقة نجران',       'name_en' => 'Najran Region',         'cities' => [
                ['name' => 'نجران',    'name_en' => 'Najran',     'areas' => []],
            ]],
            ['name' => 'منطقة الباحة',      'name_en' => 'Al Bahah Region',       'cities' => [
                ['name' => 'الباحة',   'name_en' => 'Al Bahah',   'areas' => []],
            ]],
            ['name' => 'منطقة الجوف',       'name_en' => 'Al Jawf Region',        'cities' => [
                ['name' => 'سكاكا',    'name_en' => 'Sakaka',     'areas' => []],
            ]],
            ['name' => 'منطقة الحدود الشمالية', 'name_en' => 'Northern Borders', 'cities' => [
                ['name' => 'عرعر',     'name_en' => 'Arar',       'areas' => []],
            ]],
        ];

        foreach ($regions as $i => $regionData) {
            $region = Region::create([
                'name'       => $regionData['name'],
                'name_en'    => $regionData['name_en'],
                'sort_order' => $i + 1,
            ]);

            foreach ($regionData['cities'] as $j => $cityData) {
                $city = City::create([
                    'region_id'  => $region->id,
                    'name'       => $cityData['name'],
                    'name_en'    => $cityData['name_en'],
                    'sort_order' => $j + 1,
                ]);

                foreach ($cityData['areas'] as $k => $areaName) {
                    Area::create([
                        'city_id'    => $city->id,
                        'name'       => $areaName,
                        'sort_order' => $k + 1,
                    ]);
                }
            }
        }
    }
}
