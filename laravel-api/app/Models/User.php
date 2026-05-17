<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'phone', 'password', 'role',
        'avatar', 'city', 'is_active', 'email_verified', 'last_login_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'is_active'      => 'boolean',
        'email_verified' => 'boolean',
        'last_login_at'  => 'datetime',
    ];

    public function provider()
    {
        return $this->hasOne(Provider::class);
    }

    public function adminStaff()
    {
        return $this->hasOne(AdminStaff::class);
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    public function sentMessages()
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    public function receivedMessages()
    {
        return $this->hasMany(Message::class, 'receiver_id');
    }

    public function favorites()
    {
        return $this->hasMany(Favorite::class);
    }

    public function serviceRequests()
    {
        return $this->hasMany(ServiceRequest::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function supportTickets()
    {
        return $this->hasMany(SupportTicket::class);
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, ['admin', 'moderator']);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isProvider(): bool
    {
        return $this->role === 'provider';
    }

    public function hasPermission(string $permission): bool
    {
        if ($this->role === 'admin') {
            return true;
        }
        if ($this->role === 'moderator' && $this->adminStaff) {
            $perms = $this->adminStaff->permissions ?? [];
            return in_array($permission, $perms) || in_array('all', $perms);
        }
        return false;
    }
}
