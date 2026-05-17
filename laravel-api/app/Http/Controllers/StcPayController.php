<?php

namespace App\Http\Controllers;

use App\Models\Package;
use App\Models\Payment;
use App\Models\PaymentTransaction;
use App\Models\Provider;
use App\Models\Subscription;
use App\Services\StcPayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StcPayController extends Controller
{
    public function __construct(private StcPayService $stcPay) {}

    public function initiateSubscription(Request $request): JsonResponse
    {
        $request->validate([
            'package_id'    => 'required|exists:packages,id',
            'billing_cycle' => 'required|in:monthly,yearly',
        ]);

        $provider = $request->user()->provider;
        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'حساب مزود الخدمة غير موجود'], 403);
        }

        $package = Package::findOrFail($request->package_id);
        $amount  = $request->billing_cycle === 'yearly' && $package->yearly_price
            ? $package->yearly_price
            : $package->price;

        $payment = Payment::create([
            'user_id'     => $request->user()->id,
            'provider_id' => $provider->id,
            'type'        => 'subscription',
            'amount'      => $amount,
            'gateway'     => 'stcpay',
            'package_id'  => $package->id,
            'notes'       => "اشتراك {$package->name} - {$request->billing_cycle}",
        ]);

        $result = $this->stcPay->createSession($amount, $payment->payment_ref, "اشتراك {$package->name}");

        if (!$result['success']) {
            $payment->update(['status' => 'failed']);
            return response()->json(['success' => false, 'message' => $result['message']], 502);
        }

        PaymentTransaction::create([
            'payment_id'          => $payment->id,
            'amount'              => $amount,
            'status'              => 'initiated',
            'stcpay_session_id'   => $result['session_id'],
            'stcpay_checkout_url' => $result['checkout_url'],
            'raw_response'        => $result['raw'] ?? null,
            'expires_at'          => now()->addMinutes(30),
        ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'payment_ref'  => $payment->payment_ref,
                'checkout_url' => $result['checkout_url'],
                'amount'       => $amount,
                'test_mode'    => $result['test_mode'] ?? false,
            ],
        ]);
    }

    public function initiateServiceRequest(Request $request): JsonResponse
    {
        $request->validate([
            'service_request_id' => 'required|exists:service_requests,id',
        ]);

        $sr = \App\Models\ServiceRequest::where('user_id', $request->user()->id)
            ->where('status', 'accepted')
            ->findOrFail($request->service_request_id);

        if ($sr->is_paid) {
            return response()->json(['success' => false, 'message' => 'تم دفع هذا الطلب مسبقاً'], 422);
        }

        $amount = $sr->final_price ?? $sr->budget ?? 0;
        if ($amount <= 0) {
            return response()->json(['success' => false, 'message' => 'لم يتم تحديد السعر النهائي'], 422);
        }

        $payment = Payment::create([
            'user_id'            => $request->user()->id,
            'provider_id'        => $sr->provider_id,
            'type'               => 'service_request',
            'amount'             => $amount,
            'gateway'            => 'stcpay',
            'service_request_id' => $sr->id,
        ]);

        $result = $this->stcPay->createSession($amount, $payment->payment_ref, "طلب خدمة #{$sr->public_id}");

        if (!$result['success']) {
            return response()->json(['success' => false, 'message' => $result['message']], 502);
        }

        PaymentTransaction::create([
            'payment_id'          => $payment->id,
            'amount'              => $amount,
            'status'              => 'initiated',
            'stcpay_session_id'   => $result['session_id'],
            'stcpay_checkout_url' => $result['checkout_url'],
            'raw_response'        => $result['raw'] ?? null,
            'expires_at'          => now()->addMinutes(30),
        ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'payment_ref'  => $payment->payment_ref,
                'checkout_url' => $result['checkout_url'],
                'amount'       => $amount,
            ],
        ]);
    }

    public function returnCallback(Request $request): \Illuminate\Http\RedirectResponse|\Illuminate\Http\JsonResponse
    {
        $paymentRef = $request->input('ref');
        $payment    = Payment::with('latestTransaction')->where('payment_ref', $paymentRef)->first();

        if (!$payment) {
            return redirect(config('app.frontend_url', '/') . '/payment/failed?reason=not_found');
        }

        $txn    = $payment->latestTransaction;
        $result = $this->stcPay->checkStatus($txn->stcpay_session_id ?? '');

        if ($result['success'] && $result['status'] === 'success') {
            $this->activatePayment($payment);
            return redirect(config('app.frontend_url', '/') . '/payment/success?ref=' . $paymentRef);
        }

        return redirect(config('app.frontend_url', '/') . '/payment/pending?ref=' . $paymentRef);
    }

    public function webhook(Request $request): JsonResponse
    {
        $signature = $request->header('X-STCPay-Signature', '');
        if (!$this->stcPay->verifyWebhook($request->all(), $signature)) {
            return response()->json(['success' => false, 'message' => 'Invalid signature'], 401);
        }

        $paymentRef = $request->input('RefNum') ?? $request->input('reference');
        $status     = $request->input('PaymentStatus') ?? $request->input('status');
        $payment    = Payment::where('payment_ref', $paymentRef)->first();

        if (!$payment) {
            return response()->json(['received' => true]);
        }

        if (in_array(strtolower($status), ['paid', 'success', 'completed'])) {
            $this->activatePayment($payment);
        }

        return response()->json(['received' => true]);
    }

    public function checkStatus(Request $request, string $paymentRef): JsonResponse
    {
        $user    = $request->user();
        $payment = Payment::where('payment_ref', $paymentRef)
            ->where('user_id', $user->id)
            ->with('latestTransaction')
            ->firstOrFail();

        $txn    = $payment->latestTransaction;
        $result = $this->stcPay->checkStatus($txn?->stcpay_session_id ?? '');

        if ($result['success'] && $result['status'] === 'success' && $payment->status !== 'completed') {
            $this->activatePayment($payment);
            $payment->refresh();
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'payment_ref' => $payment->payment_ref,
                'status'      => $payment->status,
                'amount'      => $payment->amount,
                'paid_at'     => $payment->paid_at?->toISOString(),
            ],
        ]);
    }

    public function simulator(Request $request): \Illuminate\Http\Response
    {
        if (!config('services.stcpay.test_mode')) {
            abort(404);
        }

        $session = $request->input('session');
        $ref     = $request->input('ref');
        $amount  = $request->input('amount');

        $html = <<<HTML
<!DOCTYPE html><html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><title>STC Pay Simulator</title>
<style>body{font-family:Arial,sans-serif;max-width:400px;margin:50px auto;text-align:center;background:#f5f5f5}
.card{background:#fff;padding:30px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.1)}
.logo{font-size:24px;color:#6b4fa0;font-weight:bold;margin-bottom:20px}
.amount{font-size:36px;font-weight:bold;color:#333;margin:20px 0}
.sar{font-size:18px;color:#666}
.btn{display:block;width:100%;padding:14px;border:none;border-radius:8px;font-size:16px;cursor:pointer;margin-top:10px}
.btn-pay{background:#6b4fa0;color:#fff}
.btn-fail{background:#e53e3e;color:#fff}
</style></head>
<body><div class="card">
<div class="logo">STC Pay Test</div>
<div class="sar">المبلغ</div>
<div class="amount">{$amount} ر.س</div>
<p>المرجع: {$ref}</p>
<form method="GET" action="/api/stcpay/return">
<input type="hidden" name="ref" value="{$ref}">
<input type="hidden" name="session" value="{$session}">
<button type="submit" class="btn btn-pay">✅ دفع ناجح</button>
</form>
<a href="/api/stcpay/return?ref={$ref}&failed=1" style="text-decoration:none">
<button class="btn btn-fail" style="margin-top:8px">❌ فشل الدفع</button>
</a>
</div></body></html>
HTML;

        return response($html, 200)->header('Content-Type', 'text/html');
    }

    private function activatePayment(Payment $payment): void
    {
        DB::transaction(function () use ($payment) {
            $payment->update(['status' => 'completed', 'paid_at' => now()]);

            $txn = $payment->latestTransaction;
            if ($txn) {
                $txn->update(['status' => 'success']);
            }

            if ($payment->type === 'subscription' && $payment->package_id && $payment->provider_id) {
                $package  = Package::find($payment->package_id);
                $provider = Provider::find($payment->provider_id);

                if ($package && $provider) {
                    Subscription::create([
                        'provider_id'  => $provider->id,
                        'package_id'   => $package->id,
                        'payment_id'   => $payment->id,
                        'status'       => 'active',
                        'amount_paid'  => $payment->amount,
                        'billing_cycle' => 'monthly',
                        'starts_at'    => now(),
                        'expires_at'   => now()->addDays($package->duration_days),
                    ]);

                    $provider->update([
                        'package_id'         => $package->id,
                        'package_tier'       => $package->tier,
                        'package_expires_at' => now()->addDays($package->duration_days),
                        'is_verified'        => $package->verified_badge ? true : $provider->is_verified,
                    ]);
                }
            }

            if ($payment->type === 'service_request' && $payment->service_request_id) {
                \App\Models\ServiceRequest::where('id', $payment->service_request_id)
                    ->update(['is_paid' => true]);
            }
        });
    }
}
