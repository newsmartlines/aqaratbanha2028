<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProviderResource;
use App\Http\Resources\ReviewResource;
use App\Http\Resources\ServiceResource;
use App\Models\Interaction;
use App\Models\Provider;
use App\Models\Review;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProviderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Provider::with(['category', 'region', 'city', 'package'])
            ->where('status', 'active');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('subcategory_id')) {
            $query->where('subcategory_id', $request->subcategory_id);
        }
        if ($request->filled('region_id')) {
            $query->where('region_id', $request->region_id);
        }
        if ($request->filled('city_id')) {
            $query->where('city_id', $request->city_id);
        }
        if ($request->filled('area_id')) {
            $query->where('area_id', $request->area_id);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn ($q) =>
                $q->where('business_name', 'like', "%{$s}%")
                  ->orWhere('description', 'like', "%{$s}%")
            );
        }
        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }
        if ($request->filled('sort')) {
            match ($request->sort) {
                'rating'  => $query->orderByDesc('rating'),
                'newest'  => $query->latest(),
                'reviews' => $query->orderByDesc('reviews_count'),
                default   => $query->orderByDesc('is_featured')->orderByDesc('rating'),
            };
        } else {
            $query->orderByDesc('is_featured')->orderByDesc('rating');
        }

        $providers = $query->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data'    => ProviderResource::collection($providers),
            'meta'    => [
                'total'        => $providers->total(),
                'current_page' => $providers->currentPage(),
                'last_page'    => $providers->lastPage(),
                'per_page'     => $providers->perPage(),
            ],
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $provider = Provider::with([
            'category', 'subcategory', 'region', 'city', 'area',
            'services' => fn ($q) => $q->where('is_active', true),
            'package',
        ])->where('status', 'active')->findOrFail($id);

        $provider->increment('views_count');

        Interaction::create([
            'user_id'           => $request->user()?->id,
            'interactable_type' => Provider::class,
            'interactable_id'   => $provider->id,
            'type'              => 'view',
            'ip_address'        => $request->ip(),
            'user_agent'        => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'data'    => new ProviderResource($provider),
        ]);
    }

    public function nearby(Request $request): JsonResponse
    {
        $request->validate([
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'radius'    => 'nullable|numeric|min:1|max:200',
        ]);

        $lat    = $request->latitude;
        $lng    = $request->longitude;
        $radius = $request->input('radius', 20);

        $providers = Provider::with(['category', 'region', 'city'])
            ->where('status', 'active')
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->selectRaw("*, (6371 * acos(cos(radians(?)) * cos(radians(latitude))
                * cos(radians(longitude) - radians(?)) + sin(radians(?))
                * sin(radians(latitude)))) AS distance", [$lat, $lng, $lat])
            ->having('distance', '<', $radius)
            ->orderBy('distance')
            ->when($request->filled('category_id'), fn ($q) => $q->where('category_id', $request->category_id))
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'data'    => ProviderResource::collection($providers),
        ]);
    }

    public function reviews(int $id, Request $request): JsonResponse
    {
        $provider = Provider::findOrFail($id);

        $reviews = Review::with('user')
            ->where('provider_id', $provider->id)
            ->where('is_approved', true)
            ->where('is_hidden', false)
            ->latest()
            ->paginate($request->input('per_page', 10));

        return response()->json([
            'success' => true,
            'data'    => ReviewResource::collection($reviews),
            'meta'    => [
                'total'        => $reviews->total(),
                'current_page' => $reviews->currentPage(),
                'last_page'    => $reviews->lastPage(),
            ],
        ]);
    }

    public function myProfile(Request $request): JsonResponse
    {
        $provider = $request->user()->provider()->with([
            'category', 'subcategory', 'region', 'city', 'area', 'package',
            'balance', 'activeSubscription.package',
        ])->first();

        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'لم يتم العثور على ملف مزود الخدمة'], 404);
        }

        return response()->json(['success' => true, 'data' => new ProviderResource($provider)]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $provider = $request->user()->provider;

        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'غير مصرح'], 403);
        }

        $request->validate([
            'business_name'    => 'sometimes|string|max:255',
            'business_name_en' => 'nullable|string|max:255',
            'description'      => 'nullable|string|max:2000',
            'phone'            => 'nullable|string|max:20',
            'whatsapp'         => 'nullable|string|max:20',
            'website'          => 'nullable|url|max:255',
            'address'          => 'nullable|string|max:500',
            'latitude'         => 'nullable|numeric|between:-90,90',
            'longitude'        => 'nullable|numeric|between:-180,180',
            'working_hours'    => 'nullable|array',
            'payment_methods'  => 'nullable|array',
            'subcategory_id'   => 'nullable|exists:subcategories,id',
            'area_id'          => 'nullable|exists:areas,id',
        ]);

        $provider->update($request->only([
            'business_name', 'business_name_en', 'description', 'phone', 'whatsapp',
            'website', 'address', 'latitude', 'longitude', 'working_hours',
            'payment_methods', 'subcategory_id', 'area_id',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث الملف الشخصي',
            'data'    => new ProviderResource($provider->fresh()->load('category', 'region', 'city')),
        ]);
    }

    public function stats(Request $request): JsonResponse
    {
        $provider = $request->user()->provider;
        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'غير مصرح'], 403);
        }

        $totalRequests    = $provider->serviceRequests()->count();
        $completedReqs    = $provider->serviceRequests()->where('status', 'completed')->count();
        $pendingReqs      = $provider->serviceRequests()->where('status', 'pending')->count();
        $totalRevenue     = $provider->serviceRequests()->where('status', 'completed')->sum('provider_amount');
        $totalReviews     = $provider->reviews()->where('is_approved', true)->count();
        $avgRating        = $provider->reviews()->where('is_approved', true)->avg('rating') ?? 0;
        $thisMonthReqs    = $provider->serviceRequests()->whereMonth('created_at', now()->month)->count();
        $thisMonthRevenue = $provider->serviceRequests()
            ->where('status', 'completed')
            ->whereMonth('created_at', now()->month)
            ->sum('provider_amount');

        return response()->json([
            'success' => true,
            'data'    => [
                'total_requests'     => $totalRequests,
                'completed_requests' => $completedReqs,
                'pending_requests'   => $pendingReqs,
                'total_revenue'      => round($totalRevenue, 2),
                'total_reviews'      => $totalReviews,
                'avg_rating'         => round($avgRating, 2),
                'views_count'        => $provider->views_count,
                'this_month'         => [
                    'requests' => $thisMonthReqs,
                    'revenue'  => round($thisMonthRevenue, 2),
                ],
                'balance'            => $provider->balance,
            ],
        ]);
    }
}
