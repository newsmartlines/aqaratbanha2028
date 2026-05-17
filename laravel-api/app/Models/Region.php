<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Region extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'name_en', 'is_active', 'sort_order'];

    protected $casts = ['is_active' => 'boolean'];

    public function cities()
    {
        return $this->hasMany(City::class);
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
