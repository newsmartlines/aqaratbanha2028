<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Package extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'name_en', 'tier', 'price', 'yearly_price', 'duration_days',
        'max_services', 'max_images_per_service', 'featured_listing',
        'priority_support', 'analytics_access', 'verified_badge',
        'features', 'is_active', 'sort_order',
    ];

    protected $casts = [
        'features'           => 'array',
        'featured_listing'   => 'boolean',
        'priority_support'   => 'boolean',
        'analytics_access'   => 'boolean',
        'verified_badge'     => 'boolean',
        'is_active'          => 'boolean',
        'price'              => 'float',
        'yearly_price'       => 'float',
    ];

    public function providers()
    {
        return $this->hasMany(Provider::class);
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('sort_order');
    }
}
