<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProviderResource;
use App\Models\Notification;
use App\Models\Provider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminProviderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Provider::with(['user', 'category', 'region', 'city', 'package']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn ($q) =>
                $q->where('business_name', 'like', "%{$s}%")
                  ->orWhereHas('user', fn ($q2) =>
                      $q2->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")
                  )
            );
        }

        $providers = $query->latest()->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data'    => ProviderResource::collection($providers),
            'meta'    => [
                'total'        => $providers->total(),
                'current_page' => $providers->currentPage(),
                'last_page'    => $providers->lastPage(),
                'counts'       => [
                    'pending'   => Provider::where('status', 'pending')->count(),
                    'active'    => Provider::where('status', 'active')->count(),
                    'suspended' => Provider::where('status', 'suspended')->count(),
                    'rejected'  => Provider::where('status', 'rejected')->count(),
                ],
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $provider = Provider::with([
            'user', 'category', 'subcategory', 'region', 'city', 'area',
            'services', 'package', 'balance', 'subscriptions.package',
        ])->findOrFail($id);

        return response()->json(['success' => true, 'data' => new ProviderResource($provider)]);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $provider = Provider::findOrFail($id);
        $provider->update(['status' => 'active']);

        Notification::create([
            'user_id' => $provider->user_id,
            'title'   => 'تم قبول حسابك',
            'body'    => 'تهانينا! تم قبول حسابك كمزود خدمة. يمكنك الآن إضافة خدماتك.',
            'type'    => 'account_status',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم قبول مزود الخدمة',
            'data'    => new ProviderResource($provider->fresh()),
        ]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $request->validate(['reason' => 'required|string|max:500']);

        $provider = Provider::findOrFail($id);
        $provider->update(['status' => 'rejected', 'rejection_reason' => $request->reason]);

        Notification::create([
            'user_id' => $provider->user_id,
            'title'   => 'تم رفض طلبك',
            'body'    => "للأسف تم رفض طلب تسجيلك. السبب: {$request->reason}",
            'type'    => 'account_status',
        ]);

        return response()->json(['success' => true, 'message' => 'تم الرفض']);
    }

    public function suspend(Request $request, int $id): JsonResponse
    {
        $request->validate(['reason' => 'nullable|string|max:500']);

        $provider = Provider::findOrFail($id);
        $provider->update(['status' => 'suspended']);

        Notification::create([
            'user_id' => $provider->user_id,
            'title'   => 'تم تعليق حسابك',
            'body'    => 'تم تعليق حسابك مؤقتاً. يرجى التواصل مع الدعم.',
            'type'    => 'account_status',
        ]);

        return response()->json(['success' => true, 'message' => 'تم التعليق']);
    }

    public function setFeatured(Request $request, int $id): JsonResponse
    {
        $provider = Provider::findOrFail($id);
        $provider->update(['is_featured' => !$provider->is_featured]);

        return response()->json([
            'success' => true,
            'message' => $provider->is_featured ? 'تم تعيينه كمميز' : 'تم إلغاء التمييز',
            'data'    => ['is_featured' => $provider->is_featured],
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $provider = Provider::findOrFail($id);
        $provider->update($request->only([
            'status', 'is_featured', 'is_verified', 'package_id',
            'package_tier', 'package_expires_at',
        ]));

        return response()->json(['success' => true, 'data' => new ProviderResource($provider->fresh())]);
    }
}
