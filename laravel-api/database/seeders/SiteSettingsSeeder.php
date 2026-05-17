<?php

namespace Database\Seeders;

use App\Models\SiteSetting;
use Illuminate\Database\Seeder;

class SiteSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // General
            ['key' => 'site_name',           'value' => 'دليل الخدمات',     'group' => 'public',  'type' => 'string'],
            ['key' => 'site_name_en',        'value' => 'Daleel Services',  'group' => 'public',  'type' => 'string'],
            ['key' => 'site_description',    'value' => 'منصة لربط مزودي الخدمات بالعملاء', 'group' => 'public', 'type' => 'string'],
            ['key' => 'site_email',          'value' => 'info@daleel.sa',   'group' => 'public',  'type' => 'string'],
            ['key' => 'site_phone',          'value' => '+966500000000',    'group' => 'public',  'type' => 'string'],
            ['key' => 'site_logo',           'value' => null,               'group' => 'public',  'type' => 'image'],
            ['key' => 'site_favicon',        'value' => null,               'group' => 'public',  'type' => 'image'],

            // Social
            ['key' => 'twitter_url',         'value' => null,               'group' => 'social',  'type' => 'url'],
            ['key' => 'instagram_url',       'value' => null,               'group' => 'social',  'type' => 'url'],
            ['key' => 'snapchat_url',        'value' => null,               'group' => 'social',  'type' => 'url'],
            ['key' => 'whatsapp_number',     'value' => '+966500000000',    'group' => 'social',  'type' => 'string'],

            // Business
            ['key' => 'commission_rate',     'value' => '10',               'group' => 'business', 'type' => 'number'],
            ['key' => 'vat_rate',            'value' => '15',               'group' => 'business', 'type' => 'number'],
            ['key' => 'min_withdrawal',      'value' => '100',              'group' => 'business', 'type' => 'number'],
            ['key' => 'currency',            'value' => 'SAR',              'group' => 'business', 'type' => 'string'],
            ['key' => 'currency_symbol',     'value' => 'ر.س',              'group' => 'business', 'type' => 'string'],

            // App
            ['key' => 'maintenance_mode',    'value' => '0',                'group' => 'app',     'type' => 'boolean'],
            ['key' => 'registration_enabled', 'value' => '1',               'group' => 'app',     'type' => 'boolean'],
            ['key' => 'provider_auto_approve', 'value' => '0',              'group' => 'app',     'type' => 'boolean'],
        ];

        foreach ($settings as $setting) {
            SiteSetting::firstOrCreate(['key' => $setting['key']], $setting);
        }
    }
}
