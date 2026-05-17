<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ServiceRequest extends Model
{
    use HasFactory;

    protected $table = 'service_requests';

    protected $fillable = [
        'public_id', 'user_id', 'provider_id', 'service_id', 'title',
        'description', 'budget', 'status', 'rejection_reason',
        'scheduled_at', 'completed_at', 'address', 'latitude', 'longitude',
        'attachments', 'final_price', 'commission_rate', 'commission_amount',
        'provider_amount', 'is_paid',
    ];

    protected $casts = [
        'attachments'      => 'array',
        'is_paid'          => 'boolean',
        'scheduled_at'     => 'datetime',
        'completed_at'     => 'datetime',
        'budget'           => 'float',
        'final_price'      => 'float',
        'commission_rate'  => 'float',
        'commission_amount' => 'float',
        'provider_amount'  => 'float',
        'latitude'         => 'float',
        'longitude'        => 'float',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->public_id)) {
                $model->public_id = 'REQ-' . strtoupper(Str::random(8));
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

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function review()
    {
        return $this->hasOne(Review::class);
    }

    public function payment()
    {
        return $this->hasOne(Payment::class);
    }
}
