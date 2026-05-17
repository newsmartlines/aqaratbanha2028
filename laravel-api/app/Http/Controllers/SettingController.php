<?php

namespace App\Http\Controllers;

use App\Models\SiteSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function publicSettings(): JsonResponse
    {
        $settings = SiteSetting::where('group', 'public')->get()
            ->pluck('value', 'key');

        return response()->json(['success' => true, 'data' => $settings]);
    }

    public function allSettings(): JsonResponse
    {
        $settings = SiteSetting::all()->groupBy('group');
        return response()->json(['success' => true, 'data' => $settings]);
    }

    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'settings'         => 'required|array',
            'settings.*.key'   => 'required|string',
            'settings.*.value' => 'nullable',
        ]);

        foreach ($request->settings as $setting) {
            SiteSetting::set($setting['key'], $setting['value']);
        }

        return response()->json(['success' => true, 'message' => 'تم تحديث الإعدادات']);
    }

    public function set(Request $request): JsonResponse
    {
        $request->validate([
            'key'   => 'required|string',
            'value' => 'nullable',
            'group' => 'nullable|string',
            'type'  => 'nullable|string',
        ]);

        SiteSetting::updateOrCreate(
            ['key' => $request->key],
            [
                'value' => $request->value,
                'group' => $request->input('group', 'general'),
                'type'  => $request->input('type', 'string'),
            ]
        );

        return response()->json(['success' => true, 'message' => 'تم الحفظ']);
    }
}
