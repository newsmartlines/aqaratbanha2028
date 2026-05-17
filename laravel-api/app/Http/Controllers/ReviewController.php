<?php

namespace App\Http\Controllers;

use App\Http\Resources\ReviewResource;
use App\Models\Provider;
use App\Models\Review;
use App\Models\ServiceRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'provider_id'        => 'required|exists:providers,id',
            'service_request_id' => 'nullable|exists:service_requests,id',
            'rating'             => 'required|integer|min:1|max:5',
            'comment'            => 'nullable|string|max:1000',
        ]);

        $user = $request->user();

        $existing = Review::where('user_id', $user->id)
            ->where('provider_id', $request->provider_id)
            ->when($request->service_request_id, fn ($q) =>
                $q->where('service_request_id', $request->service_request_id)
            )
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'لقد قمت بتقييم هذا المزود مسبقاً',
            ], 422);
        }

        if ($request->service_request_id) {
            $sr = ServiceRequest::where('id', $request->service_request_id)
                ->where('user_id', $user->id)
                ->where('provider_id', $request->provider_id)
                ->where('status', 'completed')
                ->first();

            if (!$sr) {
                return response()->json([
                    'success' => false,
                    'message' => 'يمكنك التقييم فقط بعد اكتمال الخدمة',
                ], 422);
            }
        }

        $review = Review::create([
            'user_id'            => $user->id,
            'provider_id'        => $request->provider_id,
            'service_request_id' => $request->service_request_id,
            'rating'             => $request->rating,
            'comment'            => $request->comment,
        ]);

        $this->updateProviderRating($request->provider_id);

        return response()->json([
            'success' => true,
            'message' => 'تم إرسال تقييمك بنجاح',
            'data'    => new ReviewResource($review->load('user')),
        ], 201);
    }

    public function reply(Request $request, int $id): JsonResponse
    {
        $request->validate(['reply' => 'required|string|max:1000']);

        $review   = Review::findOrFail($id);
        $provider = $request->user()->provider;

        if (!$provider || $review->provider_id !== $provider->id) {
            return response()->json(['success' => false, 'message' => 'غير مصرح'], 403);
        }

        $review->update([
            'provider_reply' => $request->reply,
            'replied_at'     => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إضافة ردك بنجاح',
            'data'    => new ReviewResource($review->fresh()->load('user')),
        ]);
    }

    private function updateProviderRating(int $providerId): void
    {
        $stats = Review::where('provider_id', $providerId)
            ->where('is_approved', true)
            ->where('is_hidden', false)
            ->selectRaw('AVG(rating) as avg_rating, COUNT(*) as count')
            ->first();

        Provider::where('id', $providerId)->update([
            'rating'        => round($stats->avg_rating ?? 0, 2),
            'reviews_count' => $stats->count ?? 0,
        ]);
    }
}
