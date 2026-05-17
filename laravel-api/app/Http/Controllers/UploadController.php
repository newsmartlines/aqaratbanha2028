<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    private array $allowedTypes = [
        'avatar'  => ['jpg', 'jpeg', 'png', 'webp'],
        'banner'  => ['jpg', 'jpeg', 'png', 'webp'],
        'service' => ['jpg', 'jpeg', 'png', 'webp'],
        'document' => ['pdf', 'jpg', 'jpeg', 'png'],
        'attachment' => ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
    ];

    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:5120',
            'type' => 'required|in:avatar,banner,service,document,attachment',
        ]);

        $type      = $request->type;
        $file      = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());

        $allowed = $this->allowedTypes[$type] ?? [];
        if (!in_array($extension, $allowed)) {
            return response()->json([
                'success' => false,
                'message' => "نوع الملف غير مدعوم. المسموح: " . implode(', ', $allowed),
            ], 422);
        }

        $filename = Str::uuid() . '.' . $extension;
        $path     = $file->storeAs($type . 's', $filename, 'public');

        if ($type === 'avatar') {
            $request->user()->update(['avatar' => $path]);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'path' => $path,
                'url'  => asset('storage/' . $path),
            ],
        ]);
    }

    public function uploadProviderImage(Request $request, string $imageType): JsonResponse
    {
        $request->validate(['file' => 'required|image|max:5120']);

        if (!in_array($imageType, ['avatar', 'banner'])) {
            return response()->json(['success' => false, 'message' => 'نوع الصورة غير صالح'], 422);
        }

        $provider = $request->user()->provider;
        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'لا يوجد حساب مزود خدمة'], 403);
        }

        $file     = $request->file('file');
        $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path     = $file->storeAs($imageType . 's', $filename, 'public');

        if ($provider->$imageType) {
            Storage::disk('public')->delete($provider->$imageType);
        }

        $provider->update([$imageType => $path]);

        return response()->json([
            'success' => true,
            'data'    => ['path' => $path, 'url' => asset('storage/' . $path)],
        ]);
    }

    public function uploadServiceImages(Request $request, int $serviceId): JsonResponse
    {
        $request->validate([
            'images'   => 'required|array|max:10',
            'images.*' => 'image|max:5120',
        ]);

        $provider = $request->user()->provider;
        $service  = $provider?->services()->findOrFail($serviceId);
        $maxImages = $provider->package?->max_images_per_service ?? 3;

        $existingImages = $service->images ?? [];
        $uploadedPaths  = [];

        foreach ($request->file('images') as $image) {
            if (count($existingImages) + count($uploadedPaths) >= $maxImages) {
                break;
            }
            $filename = Str::uuid() . '.' . $image->getClientOriginalExtension();
            $path     = $image->storeAs('services', $filename, 'public');
            $uploadedPaths[] = $path;
        }

        $allImages = array_merge($existingImages, $uploadedPaths);
        $service->update(['images' => $allImages]);

        return response()->json([
            'success' => true,
            'data'    => [
                'images' => collect($allImages)->map(fn ($p) => asset('storage/' . $p)),
            ],
        ]);
    }
}
