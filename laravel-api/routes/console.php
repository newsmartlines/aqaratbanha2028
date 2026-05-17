<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

Schedule::call(function () {
    \App\Models\Subscription::where('status', 'active')
        ->where('expires_at', '<', now())
        ->update(['status' => 'expired']);

    \App\Models\Provider::where('package_tier', '!=', 'free')
        ->where('package_expires_at', '<', now())
        ->update(['package_tier' => 'free', 'package_id' => null]);
})->daily()->name('expire-subscriptions');
