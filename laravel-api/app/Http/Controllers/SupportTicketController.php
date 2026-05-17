<?php

namespace App\Http\Controllers;

use App\Http\Resources\SupportTicketResource;
use App\Models\SupportTicket;
use App\Models\SupportTicketReply;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupportTicketController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = SupportTicket::with(['user', 'assignedTo']);

        if (!$user->isAdmin()) {
            $query->where('user_id', $user->id);
        } else {
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            if ($request->filled('priority')) {
                $query->where('priority', $request->priority);
            }
            if ($request->filled('assigned_to')) {
                $query->where('assigned_to', $request->assigned_to);
            }
        }

        $tickets = $query->latest()->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data'    => SupportTicketResource::collection($tickets),
            'meta'    => [
                'total'        => $tickets->total(),
                'current_page' => $tickets->currentPage(),
                'last_page'    => $tickets->lastPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'subject'     => 'required|string|max:255',
            'body'        => 'required|string',
            'priority'    => 'nullable|in:low,medium,high,urgent',
            'category'    => 'nullable|string|max:100',
            'attachments' => 'nullable|array',
        ]);

        $ticket = SupportTicket::create([
            'user_id'     => $request->user()->id,
            'subject'     => $request->subject,
            'body'        => $request->body,
            'priority'    => $request->input('priority', 'medium'),
            'category'    => $request->category,
            'attachments' => $request->attachments,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إرسال تذكرة الدعم بنجاح',
            'data'    => new SupportTicketResource($ticket->load('user')),
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $ticket = SupportTicket::with(['user', 'assignedTo', 'replies.user'])->findOrFail($id);
        $user   = $request->user();

        if (!$user->isAdmin() && $ticket->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'غير مصرح'], 403);
        }

        return response()->json(['success' => true, 'data' => new SupportTicketResource($ticket)]);
    }

    public function reply(Request $request, int $id): JsonResponse
    {
        $request->validate(['body' => 'required|string']);

        $ticket = SupportTicket::findOrFail($id);
        $user   = $request->user();

        if (!$user->isAdmin() && $ticket->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'غير مصرح'], 403);
        }

        $reply = SupportTicketReply::create([
            'ticket_id'      => $ticket->id,
            'user_id'        => $user->id,
            'body'           => $request->body,
            'is_staff_reply' => $user->isAdmin(),
        ]);

        if ($user->isAdmin() && $ticket->status === 'open') {
            $ticket->update(['status' => 'in_progress']);
        }

        return response()->json([
            'success' => true,
            'message' => 'تم إرسال الرد',
            'data'    => $reply->load('user'),
        ], 201);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $request->validate(['status' => 'required|in:open,in_progress,resolved,closed']);

        $ticket = SupportTicket::findOrFail($id);
        $updates = ['status' => $request->status];

        if ($request->status === 'resolved') {
            $updates['resolved_at'] = now();
        } elseif ($request->status === 'closed') {
            $updates['closed_at'] = now();
        }

        if ($request->filled('assigned_to')) {
            $updates['assigned_to'] = $request->assigned_to;
        }

        $ticket->update($updates);

        return response()->json(['success' => true, 'message' => 'تم تحديث التذكرة', 'data' => new SupportTicketResource($ticket->fresh())]);
    }
}
