<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\City;
use App\Models\Region;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RegionController extends Controller
{
    public function regions(): JsonResponse
    {
        $regions = Region::active()->with(['cities' => fn ($q) => $q->active()])->get();
        return response()->json(['success' => true, 'data' => $regions]);
    }

    public function cities(int $regionId): JsonResponse
    {
        $cities = City::where('region_id', $regionId)->active()->get();
        return response()->json(['success' => true, 'data' => $cities]);
    }

    public function areas(int $cityId): JsonResponse
    {
        $areas = Area::where('city_id', $cityId)->active()->get();
        return response()->json(['success' => true, 'data' => $areas]);
    }

    public function storeRegion(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required|string|max:255', 'name_en' => 'nullable|string|max:255']);
        $region = Region::create($request->only('name', 'name_en', 'sort_order'));
        return response()->json(['success' => true, 'data' => $region], 201);
    }

    public function storeCity(Request $request): JsonResponse
    {
        $request->validate([
            'region_id' => 'required|exists:regions,id',
            'name'      => 'required|string|max:255',
            'name_en'   => 'nullable|string|max:255',
        ]);
        $city = City::create($request->only('region_id', 'name', 'name_en', 'sort_order'));
        return response()->json(['success' => true, 'data' => $city], 201);
    }

    public function storeArea(Request $request): JsonResponse
    {
        $request->validate([
            'city_id' => 'required|exists:cities,id',
            'name'    => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
        ]);
        $area = Area::create($request->only('city_id', 'name', 'name_en', 'sort_order'));
        return response()->json(['success' => true, 'data' => $area], 201);
    }

    public function updateRegion(Request $request, int $id): JsonResponse
    {
        $region = Region::findOrFail($id);
        $region->update($request->only('name', 'name_en', 'is_active', 'sort_order'));
        return response()->json(['success' => true, 'data' => $region]);
    }

    public function updateCity(Request $request, int $id): JsonResponse
    {
        $city = City::findOrFail($id);
        $city->update($request->only('name', 'name_en', 'is_active', 'sort_order'));
        return response()->json(['success' => true, 'data' => $city]);
    }

    public function deleteCity(int $id): JsonResponse
    {
        City::findOrFail($id)->delete();
        return response()->json(['success' => true, 'message' => 'تم الحذف']);
    }

    public function deleteRegion(int $id): JsonResponse
    {
        Region::findOrFail($id)->delete();
        return response()->json(['success' => true, 'message' => 'تم الحذف']);
    }
}
