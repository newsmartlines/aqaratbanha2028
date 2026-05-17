<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use HasFactory;

    protected $fillable = [
        'provider_id', 'category_id', 'subcategory_id', 'title', 'description',
        'price', 'price_max', 'price_type', 'price_unit', 'images',
        'is_active', 'is_featured', 'sort_order', 'views_count',
    ];

    protected $casts = [
        'images'     => 'array',
        'is_active'  => 'boolean',
        'is_featured' => 'boolean',
        'price'      => 'float',
        'price_max'  => 'float',
    ];

    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function subcategory()
    {
        return $this->belongsTo(Subcategory::class);
    }

    public function requests()
    {
        return $this->hasMany(ServiceRequest::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
