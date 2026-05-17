<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Interaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'interactable_type', 'interactable_id', 'type', 'ip_address', 'user_agent',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function interactable()
    {
        return $this->morphTo();
    }
}
