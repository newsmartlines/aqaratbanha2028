<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\Provider;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Review::with(['user', 'provider']);

        if ($request->filled('provider_id')) {
            $query->where('provider_id', $request->provider_id);
        }
        if ($request->filled('is_approved')) {
            $query->where('is_approved', $request->boolean('is_approved'));
        }
        if ($request->boolean('hidden')) {
            $query->where('is_hidden', true);
        }

        $reviews = $query->latest()->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data'    => ReviewResource::collection($reviews),
            'meta'    => ['total' => $reviews->total(), 'current_page' => $reviews->currentPage()],
        ]);
    }

    public function toggleVisibility(int $id): JsonResponse
    {
        $review = Review::findOrFail($id);
        $review->update(['is_hidden' => !$review->is_hidden]);
        $this->recalcProviderRating($review->provider_id);
        return response()->json(['success' => true, 'is_hidden' => $review->is_hidden]);
    }

    public function toggleApproval(int $id): JsonResponse
    {
        $review = Review::findOrFail($id);
        $review->update(['is_approved' => !$review->is_approved]);
        $this->recalcProviderRating($review->provider_id);
        return response()->json(['success' => true, 'is_approved' => $review->is_approved]);
    }

    public function destroy(int $id): JsonResponse
    {
        $review = Review::findOrFail($id);
        $pid    = $review->provider_id;
        $review->delete();
        $this->recalcProviderRating($pid);
        return response()->json(['success' => true, 'message' => 'تم الحذف']);
    }

    private function recalcProviderRating(int $providerId): void
    {
        $stats = Review::where('provider_id', $providerId)
            ->where('is_approved', true)->where('is_hidden', false)
            ->selectRaw('AVG(rating) as avg, COUNT(*) as cnt')->first();

        Provider::where('id', $providerId)->update([
            'rating'        => round($stats->avg ?? 0, 2),
            'reviews_count' => $stats->cnt ?? 0,
        ]);
    }
}
