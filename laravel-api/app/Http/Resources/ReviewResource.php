<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'user'            => new UserResource($this->whenLoaded('user')),
            'provider_id'     => $this->provider_id,
            'rating'          => $this->rating,
            'comment'         => $this->comment,
            'provider_reply'  => $this->provider_reply,
            'replied_at'      => $this->replied_at?->toISOString(),
            'is_approved'     => $this->is_approved,
            'created_at'      => $this->created_at->toISOString(),
        ];
    }
}
