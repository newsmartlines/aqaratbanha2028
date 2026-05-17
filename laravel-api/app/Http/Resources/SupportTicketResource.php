<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SupportTicketResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'public_id'   => $this->public_id,
            'user'        => new UserResource($this->whenLoaded('user')),
            'assigned_to' => new UserResource($this->whenLoaded('assignedTo')),
            'subject'     => $this->subject,
            'body'        => $this->body,
            'status'      => $this->status,
            'priority'    => $this->priority,
            'category'    => $this->category,
            'attachments' => collect($this->attachments ?? [])->map(fn ($a) => asset('storage/' . $a)),
            'replies'     => $this->whenLoaded('replies', fn () =>
                $this->replies->map(fn ($r) => [
                    'id'             => $r->id,
                    'body'           => $r->body,
                    'is_staff_reply' => $r->is_staff_reply,
                    'user'           => new UserResource($r->user),
                    'created_at'     => $r->created_at->toISOString(),
                ])
            ),
            'resolved_at' => $this->resolved_at?->toISOString(),
            'created_at'  => $this->created_at->toISOString(),
        ];
    }
}
