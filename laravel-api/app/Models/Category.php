<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'name_en', 'icon', 'image', 'description', 'is_active', 'sort_order',
    ];

    protected $casts = ['is_active' => 'boolean'];

    public function subcategories()
    {
        return $this->hasMany(Subcategory::class);
    }

    public function providers()
    {
        return $this->hasMany(Provider::class);
    }

    public function services()
    {
        return $this->hasMany(Service::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('sort_order');
    }
}
