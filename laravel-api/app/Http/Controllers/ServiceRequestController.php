<?php

namespace App\Http\Controllers;

use App\Http\Resources\ServiceRequestResource;
use App\Models\Notification;
use App\Models\Provider;
use App\Models\ServiceRequest;
use App\Models\WalletTransaction;
use App\Models\ProviderBalance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ServiceRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = ServiceRequest::with(['user', 'provider', 'service']);

        if ($user->role === 'user') {
            $query->where('user_id', $user->id);
        } elseif ($user->role === 'provider') {
            $query->where('provider_id', $user->provider?->id);
        } elseif ($user->isAdmin()) {
            if ($request->filled('provider_id')) {
                $query->where('provider_id', $request->provider_id);
            }
            if ($request->filled('user_id')) {
                $query->where('user_id', $request->user_id);
            }
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $requests = $query->latest()->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data'    => ServiceRequestResource::collection($requests),
            'meta'    => [
                'total'        => $requests->total(),
                'current_page' => $requests->currentPage(),
                'last_page'    => $requests->lastPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'provider_id' => 'required|exists:providers,id',
            'service_id'  => 'nullable|exists:services,id',
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'budget'      => 'nullable|numeric|min:0',
            'scheduled_at' => 'nullable|date|after:now',
            'address'     => 'nullable|string|max:500',
            'latitude'    => 'nullable|numeric|between:-90,90',
            'longitude'   => 'nullable|numeric|between:-180,180',
        ]);

        $provider = Provider::where('status', 'active')->findOrFail($request->provider_id);

        $serviceRequest = ServiceRequest::create([
            'user_id'      => $request->user()->id,
            'provider_id'  => $provider->id,
            'service_id'   => $request->service_id,
            'title'        => $request->title,
            'description'  => $request->description,
            'budget'       => $request->budget,
            'scheduled_at' => $request->scheduled_at,
            'address'      => $request->address,
            'latitude'     => $request->latitude,
            'longitude'    => $request->longitude,
            'commission_rate' => (float) config('app.commission_rate', 10),
        ]);

        Notification::create([
            'user_id' => $provider->user_id,
            'title'   => 'طلب خدمة جديد',
            'body'    => "لديك طلب خدمة جديد: {$serviceRequest->title}",
            'type'    => 'service_request',
            'data'    => ['request_id' => $serviceRequest->id, 'public_id' => $serviceRequest->public_id],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إرسال طلب الخدمة بنجاح',
            'data'    => new ServiceRequestResource($serviceRequest->load('provider', 'service')),
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user           = $request->user();
        $serviceRequest = ServiceRequest::with(['user', 'provider', 'service', 'review'])->findOrFail($id);

        if ($user->role === 'user' && $serviceRequest->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'غير مصرح'], 403);
        }
        if ($user->role === 'provider' && $serviceRequest->provider_id !== $user->provider?->id) {
            return response()->json(['success' => false, 'message' => 'غير مصرح'], 403);
        }

        return response()->json(['success' => true, 'data' => new ServiceRequestResource($serviceRequest)]);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status'           => 'required|in:accepted,rejected,in_progress,completed,cancelled',
            'rejection_reason' => 'required_if:status,rejected|nullable|string',
            'final_price'      => 'nullable|numeric|min:0',
        ]);

        $serviceRequest = ServiceRequest::findOrFail($id);
        $user           = $request->user();

        if ($user->role === 'provider' && $serviceRequest->provider_id !== $user->provider?->id) {
            return response()->json(['success' => false, 'message' => 'غير مصرح'], 403);
        }
        if ($user->role === 'user' && !in_array($request->status, ['cancelled'])) {
            return response()->json(['success' => false, 'message' => 'غير مصرح'], 403);
        }

        DB::transaction(function () use ($serviceRequest, $request) {
            $updates = ['status' => $request->status];

            if ($request->status === 'rejected') {
                $updates['rejection_reason'] = $request->rejection_reason;
            }

            if ($request->status === 'completed') {
                $updates['completed_at'] = now();

                if ($request->filled('final_price')) {
                    $finalPrice    = (float) $request->final_price;
                    $commRate      = $serviceRequest->commission_rate / 100;
                    $commAmount    = round($finalPrice * $commRate, 2);
                    $providerAmount = round($finalPrice - $commAmount, 2);

                    $updates['final_price']       = $finalPrice;
                    $updates['commission_amount']  = $commAmount;
                    $updates['provider_amount']    = $providerAmount;

                    $balance = ProviderBalance::firstOrCreate(
                        ['provider_id' => $serviceRequest->provider_id],
                        ['available_balance' => 0, 'total_earned' => 0]
                    );
                    $balance->increment('available_balance', $providerAmount);
                    $balance->increment('total_earned', $providerAmount);

                    WalletTransaction::create([
                        'provider_id'      => $serviceRequest->provider_id,
                        'type'             => 'credit',
                        'amount'           => $providerAmount,
                        'balance_after'    => $balance->available_balance,
                        'description'      => "أرباح طلب #{$serviceRequest->public_id}",
                        'reference_type'   => ServiceRequest::class,
                        'reference_id'     => $serviceRequest->id,
                        'status'           => 'completed',
                    ]);
                }
            }

            $serviceRequest->update($updates);

            Notification::create([
                'user_id' => $serviceRequest->user_id,
                'title'   => 'تحديث حالة طلبك',
                'body'    => "تم تحديث حالة طلبك #{$serviceRequest->public_id} إلى: {$request->status}",
                'type'    => 'request_status',
                'data'    => ['request_id' => $serviceRequest->id, 'status' => $request->status],
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث حالة الطلب',
            'data'    => new ServiceRequestResource($serviceRequest->fresh()->load('user', 'provider')),
        ]);
    }
}
