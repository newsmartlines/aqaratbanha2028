<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PackageController;
use App\Http\Controllers\ProviderController;
use App\Http\Controllers\RegionController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\ServiceRequestController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\SupportTicketController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\Admin\AdminProviderController;
use App\Http\Controllers\Admin\AdminReviewController;
use App\Http\Controllers\Admin\AdminStatsController;
use App\Http\Controllers\Admin\AdminUserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Routes (no auth required)
|--------------------------------------------------------------------------
*/

// Auth
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
    Route::post('register/provider', [AuthController::class, 'registerProvider']);
});

// Public data
Route::get('settings', [SettingController::class, 'publicSettings']);
Route::get('categories', [CategoryController::class, 'index']);
Route::get('categories/{id}', [CategoryController::class, 'show']);
Route::get('categories/{id}/subcategories', [CategoryController::class, 'subcategories']);
Route::get('regions', [RegionController::class, 'regions']);
Route::get('regions/{regionId}/cities', [RegionController::class, 'cities']);
Route::get('cities/{cityId}/areas', [RegionController::class, 'areas']);
Route::get('packages', [PackageController::class, 'index']);
Route::get('packages/{id}', [PackageController::class, 'show']);

// Public providers & services
Route::get('providers', [ProviderController::class, 'index']);
Route::get('providers/{id}', [ProviderController::class, 'show']);
Route::get('providers/{id}/reviews', [ProviderController::class, 'reviews']);
Route::post('providers/nearby', [ProviderController::class, 'nearby']);
Route::get('services', [ServiceController::class, 'index']);
Route::get('services/{id}', [ServiceController::class, 'show']);

/*
|--------------------------------------------------------------------------
| Authenticated Routes
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // Auth actions
    Route::prefix('auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::put('profile', [AuthController::class, 'updateProfile']);
        Route::post('change-password', [AuthController::class, 'changePassword']);
    });

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::post('{id}/read', [NotificationController::class, 'markRead']);
        Route::post('read-all', [NotificationController::class, 'markAllRead']);
        Route::delete('{id}', [NotificationController::class, 'destroy']);
    });

    // Messages
    Route::prefix('messages')->group(function () {
        Route::get('conversations', [MessageController::class, 'conversations']);
        Route::get('{partnerId}/thread', [MessageController::class, 'thread']);
        Route::post('/', [MessageController::class, 'send']);
        Route::delete('{id}', [MessageController::class, 'destroy']);
    });

    // Favorites
    Route::prefix('favorites')->group(function () {
        Route::get('/', [FavoriteController::class, 'index']);
        Route::post('toggle', [FavoriteController::class, 'toggle']);
        Route::get('{providerId}/check', [FavoriteController::class, 'check']);
    });

    // Reviews (post review)
    Route::post('reviews', [ReviewController::class, 'store']);

    // Support Tickets (user)
    Route::prefix('support-tickets')->group(function () {
        Route::get('/', [SupportTicketController::class, 'index']);
        Route::post('/', [SupportTicketController::class, 'store']);
        Route::get('{id}', [SupportTicketController::class, 'show']);
        Route::post('{id}/reply', [SupportTicketController::class, 'reply']);
    });

    // Service Requests (user)
    Route::prefix('requests')->group(function () {
        Route::get('/', [ServiceRequestController::class, 'index']);
        Route::post('/', [ServiceRequestController::class, 'store']);
        Route::get('{id}', [ServiceRequestController::class, 'show']);
        Route::put('{id}/status', [ServiceRequestController::class, 'updateStatus']);
    });

    // File uploads
    Route::prefix('upload')->group(function () {
        Route::post('/', [UploadController::class, 'upload']);
        Route::post('provider/{type}', [UploadController::class, 'uploadProviderImage']);
        Route::post('service/{serviceId}/images', [UploadController::class, 'uploadServiceImages']);
    });

    // Packages subscribe
    Route::post('packages/{id}/subscribe', [PackageController::class, 'subscribe']);

    /*
    |--------------------------------------------------------------------------
    | Provider Routes
    |--------------------------------------------------------------------------
    */
    Route::middleware('provider')->prefix('provider')->group(function () {
        Route::get('profile', [ProviderController::class, 'myProfile']);
        Route::put('profile', [ProviderController::class, 'updateProfile']);
        Route::get('stats', [ProviderController::class, 'stats']);

        Route::prefix('services')->group(function () {
            Route::get('/', [ServiceController::class, 'index']);
            Route::post('/', [ServiceController::class, 'store']);
            Route::put('{id}', [ServiceController::class, 'update']);
            Route::delete('{id}', [ServiceController::class, 'destroy']);
        });

        Route::post('reviews/{id}/reply', [ReviewController::class, 'reply']);
    });

    /*
    |--------------------------------------------------------------------------
    | Admin Routes
    |--------------------------------------------------------------------------
    */
    Route::middleware('admin')->prefix('admin')->group(function () {

        // Dashboard & Stats
        Route::get('stats', [AdminStatsController::class, 'dashboard']);
        Route::get('payments', [AdminStatsController::class, 'payments']);

        // Providers management
        Route::prefix('providers')->group(function () {
            Route::get('/', [AdminProviderController::class, 'index']);
            Route::get('{id}', [AdminProviderController::class, 'show']);
            Route::put('{id}', [AdminProviderController::class, 'update']);
            Route::post('{id}/approve', [AdminProviderController::class, 'approve']);
            Route::post('{id}/reject', [AdminProviderController::class, 'reject']);
            Route::post('{id}/suspend', [AdminProviderController::class, 'suspend']);
            Route::post('{id}/featured', [AdminProviderController::class, 'setFeatured']);
        });

        // Users & Staff management
        Route::prefix('users')->group(function () {
            Route::get('/', [AdminUserController::class, 'index']);
            Route::get('{id}', [AdminUserController::class, 'show']);
            Route::post('{id}/toggle-active', [AdminUserController::class, 'toggleActive']);
        });
        Route::prefix('staff')->group(function () {
            Route::post('/', [AdminUserController::class, 'createStaff']);
            Route::put('{id}', [AdminUserController::class, 'updateStaff']);
            Route::delete('{id}', [AdminUserController::class, 'deleteStaff']);
        });

        // Reviews management
        Route::prefix('reviews')->group(function () {
            Route::get('/', [AdminReviewController::class, 'index']);
            Route::post('{id}/toggle-visibility', [AdminReviewController::class, 'toggleVisibility']);
            Route::post('{id}/toggle-approval', [AdminReviewController::class, 'toggleApproval']);
            Route::delete('{id}', [AdminReviewController::class, 'destroy']);
        });

        // Support Tickets (admin view)
        Route::prefix('support-tickets')->group(function () {
            Route::get('/', [SupportTicketController::class, 'index']);
            Route::get('{id}', [SupportTicketController::class, 'show']);
            Route::post('{id}/reply', [SupportTicketController::class, 'reply']);
            Route::put('{id}/status', [SupportTicketController::class, 'updateStatus']);
        });

        // Categories management
        Route::post('categories', [CategoryController::class, 'store']);
        Route::put('categories/{id}', [CategoryController::class, 'update']);
        Route::delete('categories/{id}', [CategoryController::class, 'destroy']);

        // Regions management
        Route::post('regions', [RegionController::class, 'storeRegion']);
        Route::put('regions/{id}', [RegionController::class, 'updateRegion']);
        Route::delete('regions/{id}', [RegionController::class, 'deleteRegion']);
        Route::post('cities', [RegionController::class, 'storeCity']);
        Route::put('cities/{id}', [RegionController::class, 'updateCity']);
        Route::delete('cities/{id}', [RegionController::class, 'deleteCity']);
        Route::post('areas', [RegionController::class, 'storeArea']);

        // Packages management
        Route::post('packages', [PackageController::class, 'store']);
        Route::put('packages/{id}', [PackageController::class, 'update']);
        Route::delete('packages/{id}', [PackageController::class, 'destroy']);

        // Settings management
        Route::get('settings', [SettingController::class, 'allSettings']);
        Route::post('settings', [SettingController::class, 'update']);
        Route::post('settings/set', [SettingController::class, 'set']);

        // Notifications (send to user)
        Route::post('notifications/send', [NotificationController::class, 'send']);

        // Service Requests admin view
        Route::get('requests', [ServiceRequestController::class, 'index']);
        Route::get('requests/{id}', [ServiceRequestController::class, 'show']);
    });
});
