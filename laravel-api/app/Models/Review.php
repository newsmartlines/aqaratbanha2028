<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'provider_id', 'service_request_id', 'rating',
        'comment', 'provider_reply', 'replied_at', 'is_approved', 'is_hidden',
    ];

    protected $casts = [
        'is_approved' => 'boolean',
        'is_hidden'   => 'boolean',
        'replied_at'  => 'datetime',
        'rating'      => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }

    public function serviceRequest()
    {
        return $this->belongsTo(ServiceRequest::class);
    }

    public function scopeApproved($query)
    {
        return $query->where('is_approved', true)->where('is_hidden', false);
    }
}
