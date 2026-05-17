<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_requests', function (Blueprint $table) {
            $table->id();
            $table->string('public_id')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('provider_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('budget', 10, 2)->nullable();
            $table->enum('status', [
                'pending', 'accepted', 'rejected', 'in_progress',
                'completed', 'cancelled', 'disputed'
            ])->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->string('address')->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->json('attachments')->nullable();
            $table->decimal('final_price', 10, 2)->nullable();
            $table->decimal('commission_rate', 5, 2)->default(10);
            $table->decimal('commission_amount', 10, 2)->default(0);
            $table->decimal('provider_amount', 10, 2)->default(0);
            $table->boolean('is_paid')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_requests');
    }
};
