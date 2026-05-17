<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('packages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('name_en')->nullable();
            $table->enum('tier', ['free', 'bronze', 'premium'])->default('free');
            $table->decimal('price', 10, 2)->default(0);
            $table->decimal('yearly_price', 10, 2)->nullable();
            $table->integer('duration_days')->default(30);
            $table->integer('max_services')->default(5);
            $table->integer('max_images_per_service')->default(3);
            $table->boolean('featured_listing')->default(false);
            $table->boolean('priority_support')->default(false);
            $table->boolean('analytics_access')->default(false);
            $table->boolean('verified_badge')->default(false);
            $table->json('features')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('packages');
    }
};
