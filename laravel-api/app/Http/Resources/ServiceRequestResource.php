<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'public_id'        => $this->public_id,
            'user'             => new UserResource($this->whenLoaded('user')),
            'provider'         => new ProviderResource($this->whenLoaded('provider')),
            'service'          => new ServiceResource($this->whenLoaded('service')),
            'title'            => $this->title,
            'description'      => $this->description,
            'budget'           => $this->budget,
            'final_price'      => $this->final_price,
            'status'           => $this->status,
            'rejection_reason' => $this->rejection_reason,
            'scheduled_at'     => $this->scheduled_at?->toISOString(),
            'completed_at'     => $this->completed_at?->toISOString(),
            'address'          => $this->address,
            'attachments'      => collect($this->attachments ?? [])->map(fn ($a) => asset('storage/' . $a)),
            'commission_rate'  => $this->commission_rate,
            'commission_amount' => $this->commission_amount,
            'provider_amount'  => $this->provider_amount,
            'is_paid'          => $this->is_paid,
            'review'           => new ReviewResource($this->whenLoaded('review')),
            'created_at'       => $this->created_at->toISOString(),
        ];
    }
}
