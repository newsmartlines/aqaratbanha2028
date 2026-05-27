<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PaymentTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_id', 'transaction_ref', 'amount', 'status',
        'raw_response', 'expires_at',
    ];

    protected $casts = [
        'raw_response' => 'array',
        'amount'       => 'float',
        'expires_at'   => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->transaction_ref)) {
                $model->transaction_ref = 'TXN-' . strtoupper(Str::random(12));
            }
        });
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }
}
