<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'provider_id'  => $this->provider_id,
            'provider'     => new ProviderResource($this->whenLoaded('provider')),
            'category'     => $this->whenLoaded('category'),
            'subcategory'  => $this->whenLoaded('subcategory'),
            'title'        => $this->title,
            'description'  => $this->description,
            'price'        => $this->price,
            'price_max'    => $this->price_max,
            'price_type'   => $this->price_type,
            'price_unit'   => $this->price_unit,
            'images'       => collect($this->images ?? [])->map(fn ($img) => asset('storage/' . $img)),
            'is_active'    => $this->is_active,
            'is_featured'  => $this->is_featured,
            'views_count'  => $this->views_count,
            'created_at'   => $this->created_at->toISOString(),
        ];
    }
}
