<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'provider_id', 'package_id', 'payment_id', 'status', 'amount_paid',
        'billing_cycle', 'starts_at', 'expires_at', 'cancelled_at', 'auto_renew',
    ];

    protected $casts = [
        'starts_at'    => 'datetime',
        'expires_at'   => 'datetime',
        'cancelled_at' => 'datetime',
        'auto_renew'   => 'boolean',
        'amount_paid'  => 'float',
    ];

    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }

    public function package()
    {
        return $this->belongsTo(Package::class);
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active' && $this->expires_at?->isFuture();
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active')->where('expires_at', '>', now());
    }
}
