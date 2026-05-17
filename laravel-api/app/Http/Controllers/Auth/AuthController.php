<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\RegisterProviderRequest;
use App\Http\Resources\UserResource;
use App\Models\Provider;
use App\Models\ProviderBalance;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'phone'    => $request->phone,
            'password' => Hash::make($request->password),
            'role'     => 'user',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'تم إنشاء الحساب بنجاح',
            'data'    => [
                'user'  => new UserResource($user),
                'token' => $token,
            ],
        ], 201);
    }

    public function registerProvider(RegisterProviderRequest $request): JsonResponse
    {
        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'phone'    => $request->phone,
            'password' => Hash::make($request->password),
            'role'     => 'provider',
        ]);

        $provider = Provider::create([
            'user_id'          => $user->id,
            'business_name'    => $request->business_name,
            'business_name_en' => $request->business_name_en,
            'description'      => $request->description,
            'phone'            => $request->phone ?? $user->phone,
            'whatsapp'         => $request->whatsapp,
            'category_id'      => $request->category_id,
            'subcategory_id'   => $request->subcategory_id,
            'region_id'        => $request->region_id,
            'city_id'          => $request->city_id,
            'area_id'          => $request->area_id,
            'address'          => $request->address,
            'latitude'         => $request->latitude,
            'longitude'        => $request->longitude,
            'cr_number'        => $request->cr_number,
            'status'           => 'pending',
            'package_tier'     => 'free',
        ]);

        ProviderBalance::create(['provider_id' => $provider->id]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'تم تسجيل مزود الخدمة بنجاح، في انتظار المراجعة',
            'data'    => [
                'user'     => new UserResource($user),
                'provider' => $provider->load('category', 'region', 'city'),
                'token'    => $token,
            ],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'تم تعليق هذا الحساب. تواصل مع الدعم.',
            ], 403);
        }

        $user->update(['last_login_at' => now()]);
        $token = $user->createToken('auth_token')->plainTextToken;

        $userData = new UserResource($user);

        if ($user->role === 'provider') {
            $provider = $user->provider()->with('category', 'region', 'city', 'package')->first();
            return response()->json([
                'success' => true,
                'data'    => [
                    'user'     => $userData,
                    'provider' => $provider,
                    'token'    => $token,
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'user'  => $userData,
                'token' => $token,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'تم تسجيل الخروج بنجاح',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = ['user' => new UserResource($user)];

        if ($user->role === 'provider') {
            $data['provider'] = $user->provider()->with('category', 'region', 'city', 'package')->first();
        }

        if (in_array($user->role, ['admin', 'moderator'])) {
            $data['staff'] = $user->adminStaff;
        }

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'name'  => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:20',
            'city'  => 'sometimes|string|max:100',
        ]);

        $user->update($request->only('name', 'phone', 'city'));

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث الملف الشخصي',
            'data'    => new UserResource($user->fresh()),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'كلمة المرور الحالية غير صحيحة',
            ], 422);
        }

        $user->update(['password' => Hash::make($request->new_password)]);

        return response()->json([
            'success' => true,
            'message' => 'تم تغيير كلمة المرور بنجاح',
        ]);
    }
}
