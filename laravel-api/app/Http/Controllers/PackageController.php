<?php

namespace App\Http\Controllers;

use App\Models\Package;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PackageController extends Controller
{
    public function index(): JsonResponse
    {
        $packages = Package::active()->get();
        return response()->json(['success' => true, 'data' => $packages]);
    }

    public function show(int $id): JsonResponse
    {
        $package = Package::findOrFail($id);
        return response()->json(['success' => true, 'data' => $package]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'                   => 'required|string|max:255',
            'tier'                   => 'required|in:free,bronze,premium',
            'price'                  => 'required|numeric|min:0',
            'yearly_price'           => 'nullable|numeric|min:0',
            'duration_days'          => 'required|integer|min:1',
            'max_services'           => 'required|integer|min:1',
            'max_images_per_service' => 'required|integer|min:1',
        ]);

        $package = Package::create($request->all());
        return response()->json(['success' => true, 'data' => $package], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $package = Package::findOrFail($id);
        $package->update($request->all());
        return response()->json(['success' => true, 'data' => $package]);
    }

    public function destroy(int $id): JsonResponse
    {
        Package::findOrFail($id)->update(['is_active' => false]);
        return response()->json(['success' => true, 'message' => 'تم الحذف']);
    }

    public function subscribe(Request $request, int $id): JsonResponse
    {
        $request->validate(['billing_cycle' => 'required|in:monthly,yearly']);

        $package  = Package::findOrFail($id);
        $provider = $request->user()->provider;

        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'لا يوجد حساب مزود خدمة'], 403);
        }

        $amount = $request->billing_cycle === 'yearly' && $package->yearly_price
            ? $package->yearly_price
            : $package->price;

        return response()->json([
            'success' => true,
            'message' => 'يرجى المتابعة للدفع',
            'data'    => [
                'package'       => $package,
                'amount'        => $amount,
                'billing_cycle' => $request->billing_cycle,
                'provider_id'   => $provider->id,
            ],
        ]);
    }
}
