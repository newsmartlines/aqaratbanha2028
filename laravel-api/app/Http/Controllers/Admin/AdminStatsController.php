<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Provider;
use App\Models\ServiceRequest;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminStatsController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $now           = now();
        $startOfMonth  = $now->startOfMonth()->copy();

        $stats = [
            'users' => [
                'total'       => User::count(),
                'providers'   => User::where('role', 'provider')->count(),
                'regular'     => User::where('role', 'user')->count(),
                'this_month'  => User::whereMonth('created_at', $now->month)->count(),
            ],
            'providers' => [
                'total'     => Provider::count(),
                'active'    => Provider::where('status', 'active')->count(),
                'pending'   => Provider::where('status', 'pending')->count(),
                'suspended' => Provider::where('status', 'suspended')->count(),
                'featured'  => Provider::where('is_featured', true)->count(),
                'premium'   => Provider::where('package_tier', 'premium')->count(),
            ],
            'requests' => [
                'total'      => ServiceRequest::count(),
                'pending'    => ServiceRequest::where('status', 'pending')->count(),
                'completed'  => ServiceRequest::where('status', 'completed')->count(),
                'this_month' => ServiceRequest::whereMonth('created_at', $now->month)->count(),
            ],
            'revenue' => [
                'total'           => Payment::where('status', 'completed')->sum('amount'),
                'this_month'      => Payment::where('status', 'completed')
                    ->whereMonth('paid_at', $now->month)->sum('amount'),
                'subscriptions'   => Payment::where('status', 'completed')
                    ->where('type', 'subscription')->sum('amount'),
                'service_requests' => Payment::where('status', 'completed')
                    ->where('type', 'service_request')->sum('amount'),
            ],
            'subscriptions' => [
                'active'   => Subscription::where('status', 'active')->count(),
                'expired'  => Subscription::where('status', 'expired')->count(),
                'bronze'   => Subscription::where('status', 'active')
                    ->whereHas('package', fn ($q) => $q->where('tier', 'bronze'))->count(),
                'premium'  => Subscription::where('status', 'active')
                    ->whereHas('package', fn ($q) => $q->where('tier', 'premium'))->count(),
            ],
        ];

        $monthlyRevenue = Payment::where('status', 'completed')
            ->selectRaw('YEAR(paid_at) as year, MONTH(paid_at) as month, SUM(amount) as total')
            ->groupByRaw('YEAR(paid_at), MONTH(paid_at)')
            ->orderByRaw('YEAR(paid_at) DESC, MONTH(paid_at) DESC')
            ->limit(12)
            ->get();

        $topProviders = Provider::where('status', 'active')
            ->orderByDesc('reviews_count')
            ->orderByDesc('rating')
            ->with('category')
            ->limit(10)
            ->get(['id', 'business_name', 'rating', 'reviews_count', 'views_count', 'category_id']);

        return response()->json([
            'success' => true,
            'data'    => compact('stats', 'monthlyRevenue', 'topProviders'),
        ]);
    }

    public function payments(Request $request): JsonResponse
    {
        $query = Payment::with(['user', 'provider', 'package'])
            ->latest('paid_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->to . ' 23:59:59');
        }

        $payments = $query->paginate($request->input('per_page', 20));

        if ($request->boolean('export')) {
            return $this->exportCsv($query->get());
        }

        return response()->json([
            'success' => true,
            'data'    => $payments->items(),
            'meta'    => [
                'total'        => $payments->total(),
                'current_page' => $payments->currentPage(),
                'last_page'    => $payments->lastPage(),
                'totals'       => [
                    'completed' => $query->clone()->where('status', 'completed')->sum('amount'),
                    'pending'   => $query->clone()->where('status', 'pending')->sum('amount'),
                ],
            ],
        ]);
    }

    private function exportCsv($payments): \Illuminate\Http\Response
    {
        $csv  = "ID,Reference,User,Provider,Type,Amount,Status,Date\n";
        foreach ($payments as $p) {
            $csv .= implode(',', [
                $p->id,
                $p->payment_ref,
                $p->user?->name ?? '',
                $p->provider?->business_name ?? '',
                $p->type,
                $p->amount,
                $p->status,
                $p->created_at->format('Y-m-d H:i:s'),
            ]) . "\n";
        }

        return response($csv, 200)->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="payments.csv"');
    }
}
