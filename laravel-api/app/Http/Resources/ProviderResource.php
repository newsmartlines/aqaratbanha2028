<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProviderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'user_id'          => $this->user_id,
            'business_name'    => $this->business_name,
            'business_name_en' => $this->business_name_en,
            'description'      => $this->description,
            'phone'            => $this->phone,
            'whatsapp'         => $this->whatsapp,
            'email'            => $this->email,
            'website'          => $this->website,
            'avatar'           => $this->avatar ? asset('storage/' . $this->avatar) : null,
            'banner'           => $this->banner ? asset('storage/' . $this->banner) : null,
            'category'         => $this->whenLoaded('category'),
            'subcategory'      => $this->whenLoaded('subcategory'),
            'region'           => $this->whenLoaded('region'),
            'city'             => $this->whenLoaded('city'),
            'area'             => $this->whenLoaded('area'),
            'address'          => $this->address,
            'latitude'         => $this->latitude,
            'longitude'        => $this->longitude,
            'status'           => $this->status,
            'is_featured'      => $this->is_featured,
            'is_verified'      => $this->is_verified,
            'rating'           => round($this->rating, 2),
            'reviews_count'    => $this->reviews_count,
            'views_count'      => $this->views_count,
            'package_tier'     => $this->package_tier,
            'package_expires_at' => $this->package_expires_at?->toISOString(),
            'package_active'   => $this->isPackageActive(),
            'working_hours'    => $this->working_hours,
            'payment_methods'  => $this->payment_methods,
            'cr_number'        => $this->cr_number,
            'vat_number'       => $this->vat_number,
            'services'         => ServiceResource::collection($this->whenLoaded('services')),
            'created_at'       => $this->created_at->toISOString(),
        ];
    }
}
