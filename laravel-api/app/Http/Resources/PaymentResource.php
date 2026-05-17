<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'payment_ref'        => $this->payment_ref,
            'user'               => new UserResource($this->whenLoaded('user')),
            'provider'           => new ProviderResource($this->whenLoaded('provider')),
            'type'               => $this->type,
            'amount'             => $this->amount,
            'currency'           => $this->currency,
            'status'             => $this->status,
            'gateway'            => $this->gateway,
            'gateway_ref'        => $this->gateway_ref,
            'package'            => $this->whenLoaded('package'),
            'service_request_id' => $this->service_request_id,
            'notes'              => $this->notes,
            'paid_at'            => $this->paid_at?->toISOString(),
            'latest_transaction' => $this->whenLoaded('latestTransaction'),
            'created_at'         => $this->created_at->toISOString(),
        ];
    }
}
