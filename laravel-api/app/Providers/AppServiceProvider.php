<?php

namespace App\Providers;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(\App\Services\StcPayService::class, function () {
            return new \App\Services\StcPayService();
        });
    }

    public function boot(): void
    {
        JsonResource::withoutWrapping();
    }
}
