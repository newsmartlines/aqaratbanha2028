<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SupportTicketReply extends Model
{
    use HasFactory;

    protected $table = 'support_ticket_replies';

    protected $fillable = [
        'ticket_id', 'user_id', 'body', 'attachments', 'is_staff_reply',
    ];

    protected $casts = [
        'attachments'    => 'array',
        'is_staff_reply' => 'boolean',
    ];

    public function ticket()
    {
        return $this->belongsTo(SupportTicket::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
