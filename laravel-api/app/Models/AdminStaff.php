<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdminStaff extends Model
{
    use HasFactory;

    protected $table = 'admin_staff';

    protected $fillable = [
        'user_id', 'department', 'permissions', 'is_active', 'last_active_at',
    ];

    protected $casts = [
        'permissions'    => 'array',
        'is_active'      => 'boolean',
        'last_active_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function hasPermission(string $permission): bool
    {
        $perms = $this->permissions ?? [];
        return in_array('all', $perms) || in_array($permission, $perms);
    }
}
