<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Subcategory;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'سباكة', 'name_en' => 'Plumbing', 'icon' => 'pipe', 'subs' => [
                'إصلاح تسربات', 'تركيب أطباق', 'صيانة خزانات', 'تسليك مجاري', 'تركيب سخانات',
            ]],
            ['name' => 'كهرباء', 'name_en' => 'Electricity', 'icon' => 'bolt', 'subs' => [
                'أعطال كهربائية', 'تركيب إضاءة', 'لوحات كهربائية', 'تمديدات كهربائية', 'كاميرات مراقبة',
            ]],
            ['name' => 'نجارة', 'name_en' => 'Carpentry', 'icon' => 'tools', 'subs' => [
                'أبواب ونوافذ', 'أثاث خشبي', 'مطابخ خشبية', 'ديكورات خشبية',
            ]],
            ['name' => 'تكييف وتبريد', 'name_en' => 'HVAC', 'icon' => 'snowflake', 'subs' => [
                'صيانة مكيفات', 'تركيب مكيفات', 'تعبئة فريون', 'تنظيف فلاتر',
            ]],
            ['name' => 'دهانات وديكور', 'name_en' => 'Painting', 'icon' => 'paint-roller', 'subs' => [
                'دهان داخلي', 'دهان خارجي', 'ديكورات جبس', 'ورق جدران',
            ]],
            ['name' => 'تنظيف', 'name_en' => 'Cleaning', 'icon' => 'broom', 'subs' => [
                'تنظيف منازل', 'تنظيف خزانات', 'تنظيف مسابح', 'تنظيف سجاد', 'تنظيف واجهات',
            ]],
            ['name' => 'مكافحة الحشرات', 'name_en' => 'Pest Control', 'icon' => 'bug', 'subs' => [
                'رش مبيدات', 'مكافحة النمل', 'مكافحة الفئران', 'مكافحة البق',
            ]],
            ['name' => 'نقل وشحن', 'name_en' => 'Moving & Shipping', 'icon' => 'truck', 'subs' => [
                'نقل أثاث', 'نقل عفش', 'خدمات التغليف', 'تخزين',
            ]],
            ['name' => 'حدادة وألومنيوم', 'name_en' => 'Metal & Aluminum', 'icon' => 'hammer', 'subs' => [
                'حداد بناء', 'أبواب وشبابيك ألومنيوم', 'مظلات وسواتر',
            ]],
            ['name' => 'صيانة أجهزة', 'name_en' => 'Appliance Repair', 'icon' => 'wrench', 'subs' => [
                'صيانة غسالات', 'صيانة ثلاجات', 'صيانة أفران', 'صيانة أجهزة كهربائية',
            ]],
            ['name' => 'خدمات المسابح', 'name_en' => 'Pool Services', 'icon' => 'water', 'subs' => [
                'تنظيف مسابح', 'صيانة مسابح', 'تركيب مضخات',
            ]],
            ['name' => 'خدمات حدائق', 'name_en' => 'Gardening', 'icon' => 'leaf', 'subs' => [
                'تنسيق حدائق', 'تقليم أشجار', 'ري حدائق', 'تركيب نجيلة',
            ]],
        ];

        foreach ($categories as $i => $cat) {
            $category = Category::create([
                'name'       => $cat['name'],
                'name_en'    => $cat['name_en'],
                'icon'       => $cat['icon'],
                'sort_order' => $i + 1,
            ]);

            foreach ($cat['subs'] as $j => $subName) {
                Subcategory::create([
                    'category_id' => $category->id,
                    'name'        => $subName,
                    'sort_order'  => $j + 1,
                ]);
            }
        }
    }
}
