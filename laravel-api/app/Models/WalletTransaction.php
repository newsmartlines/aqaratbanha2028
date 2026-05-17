<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WalletTransaction extends Model
{
    use HasFactory;

    protected $table = 'wallet_transactions';

    protected $fillable = [
        'provider_id', 'type', 'amount', 'balance_after',
        'description', 'reference_type', 'reference_id', 'status',
    ];

    protected $casts = [
        'amount'       => 'float',
        'balance_after' => 'float',
    ];

    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }
}
