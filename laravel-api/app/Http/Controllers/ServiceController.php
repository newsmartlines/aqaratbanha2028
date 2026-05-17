<?php

namespace App\Http\Controllers;

use App\Http\Resources\ServiceResource;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Service::with(['provider.category', 'provider.city', 'category', 'subcategory'])
            ->where('is_active', true)
            ->whereHas('provider', fn ($q) => $q->where('status', 'active'));

        if ($request->filled('provider_id')) {
            $query->where('provider_id', $request->provider_id);
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('subcategory_id')) {
            $query->where('subcategory_id', $request->subcategory_id);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn ($q) =>
                $q->where('title', 'like', "%{$s}%")->orWhere('description', 'like', "%{$s}%")
            );
        }
        if ($request->filled('price_type')) {
            $query->where('price_type', $request->price_type);
        }
        if ($request->filled('price_min')) {
            $query->where('price', '>=', $request->price_min);
        }
        if ($request->filled('price_max')) {
            $query->where('price', '<=', $request->price_max);
        }
        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        $query->orderByDesc('is_featured')->orderByDesc('created_at');

        $services = $query->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data'    => ServiceResource::collection($services),
            'meta'    => [
                'total'        => $services->total(),
                'current_page' => $services->currentPage(),
                'last_page'    => $services->lastPage(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $service = Service::with(['provider.category', 'provider.city', 'category', 'subcategory'])
            ->where('is_active', true)
            ->findOrFail($id);

        $service->increment('views_count');

        return response()->json(['success' => true, 'data' => new ServiceResource($service)]);
    }

    public function store(Request $request): JsonResponse
    {
        $provider = $request->user()->provider;
        if (!$provider || $provider->status !== 'active') {
            return response()->json(['success' => false, 'message' => 'حساب مزود الخدمة غير نشط'], 403);
        }

        $maxServices = $provider->package?->max_services ?? 5;
        if ($provider->services()->where('is_active', true)->count() >= $maxServices) {
            return response()->json([
                'success' => false,
                'message' => "لقد تجاوزت الحد الأقصى لعدد الخدمات ({$maxServices}) في باقتك الحالية",
            ], 422);
        }

        $request->validate([
            'title'          => 'required|string|max:255',
            'description'    => 'nullable|string|max:2000',
            'price'          => 'nullable|numeric|min:0',
            'price_max'      => 'nullable|numeric|min:0',
            'price_type'     => 'required|in:fixed,range,negotiable,free',
            'price_unit'     => 'nullable|string|max:50',
            'category_id'    => 'nullable|exists:categories,id',
            'subcategory_id' => 'nullable|exists:subcategories,id',
        ]);

        $service = Service::create([
            'provider_id'    => $provider->id,
            'title'          => $request->title,
            'description'    => $request->description,
            'price'          => $request->price,
            'price_max'      => $request->price_max,
            'price_type'     => $request->price_type,
            'price_unit'     => $request->price_unit,
            'category_id'    => $request->category_id ?? $provider->category_id,
            'subcategory_id' => $request->subcategory_id ?? $provider->subcategory_id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إضافة الخدمة بنجاح',
            'data'    => new ServiceResource($service->load('category', 'subcategory')),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $provider = $request->user()->provider;
        $service  = Service::where('provider_id', $provider?->id)->findOrFail($id);

        $request->validate([
            'title'       => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:2000',
            'price'       => 'nullable|numeric|min:0',
            'price_max'   => 'nullable|numeric|min:0',
            'price_type'  => 'sometimes|in:fixed,range,negotiable,free',
            'price_unit'  => 'nullable|string|max:50',
            'is_active'   => 'sometimes|boolean',
        ]);

        $service->update($request->only([
            'title', 'description', 'price', 'price_max', 'price_type', 'price_unit', 'is_active',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث الخدمة',
            'data'    => new ServiceResource($service->fresh()),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $provider = $request->user()->provider;
        $service  = Service::where('provider_id', $provider?->id)->findOrFail($id);
        $service->update(['is_active' => false]);

        return response()->json(['success' => true, 'message' => 'تم حذف الخدمة']);
    }
}
