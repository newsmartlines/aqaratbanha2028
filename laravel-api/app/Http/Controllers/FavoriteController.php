<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProviderResource;
use App\Models\Favorite;
use App\Models\Provider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $favorites = Favorite::where('user_id', $request->user()->id)
            ->with(['provider' => fn ($q) => $q->with('category', 'city')])
            ->latest()
            ->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data'    => $favorites->map(fn ($f) => new ProviderResource($f->provider)),
            'meta'    => [
                'total'        => $favorites->total(),
                'current_page' => $favorites->currentPage(),
                'last_page'    => $favorites->lastPage(),
            ],
        ]);
    }

    public function toggle(Request $request): JsonResponse
    {
        $request->validate(['provider_id' => 'required|exists:providers,id']);

        $user = $request->user();

        $existing = Favorite::where('user_id', $user->id)
            ->where('provider_id', $request->provider_id)
            ->first();

        if ($existing) {
            $existing->delete();
            return response()->json(['success' => true, 'is_favorite' => false, 'message' => 'تمت الإزالة من المفضلة']);
        }

        Favorite::create(['user_id' => $user->id, 'provider_id' => $request->provider_id]);
        return response()->json(['success' => true, 'is_favorite' => true, 'message' => 'تمت الإضافة للمفضلة']);
    }

    public function check(Request $request, int $providerId): JsonResponse
    {
        $isFavorite = Favorite::where('user_id', $request->user()->id)
            ->where('provider_id', $providerId)
            ->exists();

        return response()->json(['success' => true, 'is_favorite' => $isFavorite]);
    }
}
