<?php

namespace App\Http\Controllers;

use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = Notification::where('user_id', $request->user()->id)
            ->latest()
            ->paginate($request->input('per_page', 20));

        $unreadCount = Notification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success' => true,
            'data'    => NotificationResource::collection($notifications),
            'meta'    => [
                'total'        => $notifications->total(),
                'unread_count' => $unreadCount,
                'current_page' => $notifications->currentPage(),
                'last_page'    => $notifications->lastPage(),
            ],
        ]);
    }

    public function markRead(Request $request, int $id): JsonResponse
    {
        $notification = Notification::where('user_id', $request->user()->id)->findOrFail($id);
        $notification->update(['is_read' => true, 'read_at' => now()]);

        return response()->json(['success' => true, 'message' => 'تم التحديث']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        Notification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return response()->json(['success' => true, 'message' => 'تم تحديد الكل كمقروء']);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        Notification::where('user_id', $request->user()->id)->findOrFail($id)->delete();
        return response()->json(['success' => true, 'message' => 'تم الحذف']);
    }

    public function send(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'title'   => 'required|string|max:255',
            'body'    => 'required|string',
            'type'    => 'nullable|string',
            'data'    => 'nullable|array',
        ]);

        $notification = Notification::create($request->only('user_id', 'title', 'body', 'type', 'data'));

        return response()->json([
            'success' => true,
            'message' => 'تم الإرسال',
            'data'    => new NotificationResource($notification),
        ], 201);
    }
}
