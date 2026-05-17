<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'name'           => $this->name,
            'email'          => $this->email,
            'phone'          => $this->phone,
            'role'           => $this->role,
            'avatar'         => $this->avatar ? asset('storage/' . $this->avatar) : null,
            'city'           => $this->city,
            'is_active'      => $this->is_active,
            'email_verified' => $this->email_verified,
            'last_login_at'  => $this->last_login_at?->toISOString(),
            'created_at'     => $this->created_at->toISOString(),
        ];
    }
}
