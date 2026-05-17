<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class StcPayService
{
    private string $merchantId;
    private string $apiKey;
    private string $baseUrl;
    private bool $testMode;
    private string $returnUrl;

    public function __construct()
    {
        $this->merchantId = config('services.stcpay.merchant_id', '');
        $this->apiKey     = config('services.stcpay.api_key', '');
        $this->baseUrl    = config('services.stcpay.base_url', 'https://api.stcpay.com.sa');
        $this->testMode   = config('services.stcpay.test_mode', true);
        $this->returnUrl  = config('services.stcpay.return_url', '');
    }

    public function createSession(float $amount, string $reference, string $description = ''): array
    {
        if ($this->testMode) {
            return $this->simulateSession($amount, $reference);
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type'  => 'application/json',
            ])->post("{$this->baseUrl}/payment/initiate", [
                'MerchantId'   => $this->merchantId,
                'BranchId'     => '1',
                'TellerId'     => '1',
                'DeviceId'     => '1',
                'RefNum'       => $reference,
                'BillNumber'   => $reference,
                'Amount'       => $amount,
                'Currency'     => 'SAR',
                'Description'  => $description,
                'ReturnUrl'    => $this->returnUrl . '?ref=' . $reference,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'success'      => true,
                    'session_id'   => $data['SessionId'] ?? null,
                    'checkout_url' => $data['PaymentUrl'] ?? null,
                    'raw'          => $data,
                ];
            }

            Log::error('STCPay create session failed', ['response' => $response->body()]);
            return ['success' => false, 'message' => 'فشل إنشاء جلسة الدفع'];
        } catch (\Exception $e) {
            Log::error('STCPay exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    public function checkStatus(string $sessionId): array
    {
        if ($this->testMode) {
            return $this->simulateStatus($sessionId);
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type'  => 'application/json',
            ])->post("{$this->baseUrl}/payment/inquiry", [
                'MerchantId' => $this->merchantId,
                'SessionId'  => $sessionId,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'success' => true,
                    'status'  => $this->mapStatus($data['PaymentStatus'] ?? ''),
                    'raw'     => $data,
                ];
            }

            return ['success' => false, 'message' => 'فشل التحقق من حالة الدفع'];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    private function mapStatus(string $stcStatus): string
    {
        return match (strtolower($stcStatus)) {
            'paid', 'success', 'completed' => 'success',
            'pending', 'initiated'         => 'pending',
            'failed', 'declined'           => 'failed',
            'expired'                      => 'expired',
            default                        => 'pending',
        };
    }

    private function simulateSession(float $amount, string $reference): array
    {
        $sessionId   = 'SIM_' . strtoupper(substr(md5($reference . time()), 0, 16));
        $checkoutUrl = url("/api/stcpay/simulator?session={$sessionId}&ref={$reference}&amount={$amount}");

        return [
            'success'      => true,
            'session_id'   => $sessionId,
            'checkout_url' => $checkoutUrl,
            'test_mode'    => true,
            'raw'          => ['simulated' => true, 'session_id' => $sessionId],
        ];
    }

    private function simulateStatus(string $sessionId): array
    {
        return [
            'success' => true,
            'status'  => str_starts_with($sessionId, 'SIM_') ? 'success' : 'pending',
            'raw'     => ['simulated' => true],
        ];
    }

    public function verifyWebhook(array $payload, string $signature): bool
    {
        if ($this->testMode) {
            return true;
        }

        $computed = hash_hmac('sha256', json_encode($payload), $this->apiKey);
        return hash_equals($computed, $signature);
    }
}
