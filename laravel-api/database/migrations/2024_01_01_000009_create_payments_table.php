<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('payment_ref')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('provider_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('type', ['subscription', 'service_request', 'wallet_topup'])->default('subscription');
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('SAR');
            $table->enum('status', ['pending', 'completed', 'failed', 'refunded', 'cancelled'])->default('pending');
            $table->string('gateway')->default('stcpay');
            $table->string('gateway_ref')->nullable();
            $table->json('gateway_response')->nullable();
            $table->foreignId('package_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('service_request_id')->nullable()->constrained()->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });

        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained()->cascadeOnDelete();
            $table->string('transaction_ref')->unique();
            $table->decimal('amount', 10, 2);
            $table->enum('status', ['initiated', 'pending', 'success', 'failed', 'expired'])->default('initiated');
            $table->string('stcpay_session_id')->nullable();
            $table->string('stcpay_checkout_url')->nullable();
            $table->json('raw_response')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_transactions');
        Schema::dropIfExists('payments');
    }
};
