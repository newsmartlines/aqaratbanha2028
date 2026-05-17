<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_ref', 'user_id', 'provider_id', 'type', 'amount', 'currency',
        'status', 'gateway', 'gateway_ref', 'gateway_response',
        'package_id', 'service_request_id', 'notes', 'paid_at',
    ];

    protected $casts = [
        'gateway_response' => 'array',
        'amount'           => 'float',
        'paid_at'          => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->payment_ref)) {
                $model->payment_ref = 'PAY-' . strtoupper(Str::random(10));
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }

    public function package()
    {
        return $this->belongsTo(Package::class);
    }

    public function serviceRequest()
    {
        return $this->belongsTo(ServiceRequest::class);
    }

    public function transactions()
    {
        return $this->hasMany(PaymentTransaction::class);
    }

    public function latestTransaction()
    {
        return $this->hasOne(PaymentTransaction::class)->latest();
    }

    public function subscription()
    {
        return $this->hasOne(Subscription::class);
    }
}
