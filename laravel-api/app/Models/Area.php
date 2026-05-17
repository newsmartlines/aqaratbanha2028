<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Area extends Model
{
    use HasFactory;

    protected $fillable = ['city_id', 'name', 'name_en', 'is_active', 'sort_order'];

    protected $casts = ['is_active' => 'boolean'];

    public function city()
    {
        return $this->belongsTo(City::class);
    }

    public function providers()
    {
        return $this->hasMany(Provider::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('sort_order');
    }
}
