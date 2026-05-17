<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Provider extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'business_name', 'business_name_en', 'description',
        'phone', 'whatsapp', 'email', 'website', 'avatar', 'banner',
        'category_id', 'subcategory_id', 'region_id', 'city_id', 'area_id',
        'address', 'latitude', 'longitude', 'status', 'is_featured',
        'is_verified', 'rating', 'reviews_count', 'views_count',
        'package_id', 'package_tier', 'package_expires_at',
        'working_hours', 'payment_methods', 'cr_number', 'vat_number',
        'rejection_reason',
    ];

    protected $casts = [
        'is_featured'        => 'boolean',
        'is_verified'        => 'boolean',
        'working_hours'      => 'array',
        'payment_methods'    => 'array',
        'package_expires_at' => 'datetime',
        'latitude'           => 'float',
        'longitude'          => 'float',
        'rating'             => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function subcategory()
    {
        return $this->belongsTo(Subcategory::class);
    }

    public function region()
    {
        return $this->belongsTo(Region::class);
    }

    public function city()
    {
        return $this->belongsTo(City::class);
    }

    public function area()
    {
        return $this->belongsTo(Area::class);
    }

    public function package()
    {
        return $this->belongsTo(Package::class);
    }

    public function services()
    {
        return $this->hasMany(Service::class);
    }

    public function serviceRequests()
    {
        return $this->hasMany(ServiceRequest::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscription()
    {
        return $this->hasOne(Subscription::class)->where('status', 'active')->latest();
    }

    public function balance()
    {
        return $this->hasOne(ProviderBalance::class);
    }

    public function walletTransactions()
    {
        return $this->hasMany(WalletTransaction::class);
    }

    public function serviceAreas()
    {
        return $this->belongsToMany(Area::class, 'provider_service_areas');
    }

    public function favorites()
    {
        return $this->hasMany(Favorite::class);
    }

    public function isPackageActive(): bool
    {
        return $this->package_expires_at && $this->package_expires_at->isFuture();
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }
}
