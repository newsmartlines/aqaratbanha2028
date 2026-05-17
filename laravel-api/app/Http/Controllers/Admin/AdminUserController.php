<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\AdminStaff;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn ($q) =>
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%")
            );
        }
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $users = $query->latest()->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data'    => UserResource::collection($users),
            'meta'    => [
                'total'        => $users->total(),
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $user = User::with(['provider', 'adminStaff'])->findOrFail($id);
        return response()->json(['success' => true, 'data' => new UserResource($user)]);
    }

    public function toggleActive(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->update(['is_active' => !$user->is_active]);

        return response()->json([
            'success'   => true,
            'message'   => $user->is_active ? 'تم تفعيل الحساب' : 'تم تعليق الحساب',
            'is_active' => $user->is_active,
        ]);
    }

    public function createStaff(Request $request): JsonResponse
    {
        $request->validate([
            'name'        => 'required|string|max:255',
            'email'       => 'required|email|unique:users,email',
            'password'    => 'required|string|min:8',
            'department'  => 'nullable|string|max:100',
            'permissions' => 'nullable|array',
        ]);

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'role'     => 'moderator',
        ]);

        AdminStaff::create([
            'user_id'     => $user->id,
            'department'  => $request->department,
            'permissions' => $request->permissions ?? [],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إنشاء حساب الموظف',
            'data'    => new UserResource($user->load('adminStaff')),
        ], 201);
    }

    public function updateStaff(Request $request, int $id): JsonResponse
    {
        $user  = User::where('role', 'moderator')->findOrFail($id);
        $staff = $user->adminStaff;

        if ($request->filled('permissions')) {
            $staff->update(['permissions' => $request->permissions]);
        }
        if ($request->filled('department')) {
            $staff->update(['department' => $request->department]);
        }
        if ($request->filled('is_active')) {
            $staff->update(['is_active' => $request->boolean('is_active')]);
        }

        return response()->json(['success' => true, 'data' => new UserResource($user->fresh()->load('adminStaff'))]);
    }

    public function deleteStaff(int $id): JsonResponse
    {
        $user = User::where('role', 'moderator')->findOrFail($id);
        $user->adminStaff?->delete();
        $user->update(['is_active' => false]);
        return response()->json(['success' => true, 'message' => 'تم الحذف']);
    }
}
