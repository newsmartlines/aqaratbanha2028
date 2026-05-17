<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProviderBalance extends Model
{
    use HasFactory;

    protected $table = 'provider_balances';

    protected $fillable = [
        'provider_id', 'available_balance', 'pending_balance',
        'total_earned', 'total_withdrawn',
    ];

    protected $casts = [
        'available_balance' => 'float',
        'pending_balance'   => 'float',
        'total_earned'      => 'float',
        'total_withdrawn'   => 'float',
    ];

    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }
}
