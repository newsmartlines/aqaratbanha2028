<?php

use Illuminate\Support\Facades\Facade;
use Illuminate\Support\ServiceProvider;

return [
    'name'     => env('APP_NAME', 'دليل الخدمات'),
    'env'      => env('APP_ENV', 'production'),
    'debug'    => (bool) env('APP_DEBUG', false),
    'url'      => env('APP_URL', 'http://localhost'),
    'timezone' => 'Asia/Riyadh',
    'locale'   => 'ar',
    'fallback_locale' => 'en',
    'faker_locale'    => 'ar_SA',
    'cipher'   => 'AES-256-CBC',
    'key'      => env('APP_KEY'),

    'frontend_url' => env('FRONTEND_URL', env('APP_URL', 'http://localhost')),

    'commission_rate' => env('DEFAULT_COMMISSION_RATE', 10),

    'maintenance' => [
        'driver' => 'file',
    ],

    'providers' => ServiceProvider::defaultProviders()->merge([
        App\Providers\AppServiceProvider::class,
    ])->toArray(),

    'aliases' => Facade::defaultAliases()->merge([
        // 'Example' => App\Facades\Example::class,
    ])->toArray(),
];
