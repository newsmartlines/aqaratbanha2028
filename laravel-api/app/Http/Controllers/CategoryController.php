<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $categories = Category::with(['subcategories' => fn ($q) => $q->active()])
            ->active()
            ->get();

        return response()->json(['success' => true, 'data' => $categories]);
    }

    public function show(int $id): JsonResponse
    {
        $category = Category::with(['subcategories' => fn ($q) => $q->active()])
            ->findOrFail($id);

        return response()->json(['success' => true, 'data' => $category]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'       => 'required|string|max:255',
            'name_en'    => 'nullable|string|max:255',
            'icon'       => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer',
        ]);

        $category = Category::create($request->only('name', 'name_en', 'icon', 'description', 'sort_order'));

        return response()->json([
            'success' => true,
            'message' => 'تم إنشاء التصنيف',
            'data'    => $category,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $category = Category::findOrFail($id);

        $request->validate([
            'name'      => 'sometimes|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $category->update($request->only('name', 'name_en', 'icon', 'description', 'is_active', 'sort_order'));

        return response()->json(['success' => true, 'message' => 'تم التحديث', 'data' => $category]);
    }

    public function destroy(int $id): JsonResponse
    {
        $category = Category::findOrFail($id);
        $category->update(['is_active' => false]);

        return response()->json(['success' => true, 'message' => 'تم حذف التصنيف']);
    }

    public function subcategories(int $categoryId): JsonResponse
    {
        $category = Category::findOrFail($categoryId);
        $subs     = $category->subcategories()->active()->get();

        return response()->json(['success' => true, 'data' => $subs]);
    }
}
