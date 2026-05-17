<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MessageController extends Controller
{
    public function conversations(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $conversations = DB::select("
            SELECT
                u.id, u.name, u.avatar, u.role,
                m.body AS last_message,
                m.created_at AS last_message_at,
                SUM(CASE WHEN m2.is_read = 0 AND m2.receiver_id = ? THEN 1 ELSE 0 END) AS unread_count
            FROM (
                SELECT
                    CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS partner_id,
                    MAX(id) AS last_msg_id
                FROM messages
                WHERE sender_id = ? OR receiver_id = ?
                GROUP BY partner_id
            ) AS convs
            JOIN messages m ON m.id = convs.last_msg_id
            JOIN users u ON u.id = convs.partner_id
            LEFT JOIN messages m2 ON (
                (m2.sender_id = convs.partner_id AND m2.receiver_id = ?)
                OR (m2.sender_id = ? AND m2.receiver_id = convs.partner_id)
            )
            GROUP BY u.id, u.name, u.avatar, u.role, m.body, m.created_at
            ORDER BY last_message_at DESC
        ", [$userId, $userId, $userId, $userId, $userId, $userId]);

        $conversations = collect($conversations)->map(function ($conv) {
            $conv->avatar = $conv->avatar ? asset('storage/' . $conv->avatar) : null;
            return $conv;
        });

        return response()->json(['success' => true, 'data' => $conversations]);
    }

    public function thread(Request $request, int $partnerId): JsonResponse
    {
        $userId  = $request->user()->id;
        $partner = User::findOrFail($partnerId);

        $messages = Message::where(function ($q) use ($userId, $partnerId) {
                $q->where('sender_id', $userId)->where('receiver_id', $partnerId);
            })->orWhere(function ($q) use ($userId, $partnerId) {
                $q->where('sender_id', $partnerId)->where('receiver_id', $userId);
            })
            ->orderBy('created_at')
            ->paginate($request->input('per_page', 50));

        Message::where('sender_id', $partnerId)
            ->where('receiver_id', $userId)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return response()->json([
            'success' => true,
            'data'    => $messages->items(),
            'partner' => [
                'id'     => $partner->id,
                'name'   => $partner->name,
                'avatar' => $partner->avatar ? asset('storage/' . $partner->avatar) : null,
                'role'   => $partner->role,
            ],
            'meta' => [
                'total'        => $messages->total(),
                'current_page' => $messages->currentPage(),
                'last_page'    => $messages->lastPage(),
            ],
        ]);
    }

    public function send(Request $request): JsonResponse
    {
        $request->validate([
            'receiver_id' => 'required|exists:users,id',
            'body'        => 'required_without:attachment|nullable|string|max:5000',
            'attachment'  => 'nullable|string',
        ]);

        if ($request->receiver_id === $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'لا يمكنك مراسلة نفسك'], 422);
        }

        $message = Message::create([
            'sender_id'   => $request->user()->id,
            'receiver_id' => $request->receiver_id,
            'body'        => $request->body ?? '',
            'attachment'  => $request->attachment,
        ]);

        return response()->json([
            'success' => true,
            'data'    => $message->load('sender', 'receiver'),
        ], 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $message = Message::where('sender_id', $request->user()->id)->findOrFail($id);
        $message->delete();
        return response()->json(['success' => true, 'message' => 'تم الحذف']);
    }
}
