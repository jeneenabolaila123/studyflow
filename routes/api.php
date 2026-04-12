<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Api\NoteController;
use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\FeedbackController;
use App\Http\Controllers\Api\QuizResultController;
use App\Http\Controllers\Api\RecommendationController;
use App\Http\Controllers\Api\SummaryController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminUsersController;
use App\Http\Controllers\Api\Admin\AdminNotesController;
use App\Support\ApiResponse;

/*
|--------------------------------------------------------------------------
| CORS Preflight (IMPORTANT)
|--------------------------------------------------------------------------
*/

Route::options('/{any}', function () {
    return response()->json([], 200);
})->where('any', '.*');

/*
|--------------------------------------------------------------------------
| Public test routes
|--------------------------------------------------------------------------
*/
Route::get('/ping', function () {
    return response()->json([
        'ok' => true,
        'message' => 'API is working',
    ]);
});

/*
|--------------------------------------------------------------------------
| AI routes (PUBLIC for now)
|--------------------------------------------------------------------------
*/
Route::post('/ai/reset', [AiController::class, 'reset']);
Route::post('/ai/summarize', [AiController::class, 'summarize'])->middleware('auth:sanctum');

/*
|--------------------------------------------------------------------------
| Other AI routes
|--------------------------------------------------------------------------
*/
Route::prefix('ai')->group(function () {
    Route::get('/test', [AiController::class, 'testOllama']);
    Route::post('/generate-one', [AiController::class, 'generateQuestion']);
    Route::post('/check-answer', [AiController::class, 'checkAnswer']);
    Route::post('/quiz', [AiController::class, 'quiz']);
});

/*
|--------------------------------------------------------------------------
| Auth routes
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/send-verification-code', [AuthController::class, 'sendVerificationCode'])
        ->middleware('throttle:6,1');
    Route::post('/verify-code', [AuthController::class, 'verifyCode'])
        ->middleware('throttle:10,1');

    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:login');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

/*
|--------------------------------------------------------------------------
| Authenticated routes
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', fn(\Illuminate\Http\Request $request) => $request->user());

    // 🔴 شلنا summarize من هون
    Route::post('/ai/chat', [AiController::class, 'chat']);

    Route::get('/recommendations', [RecommendationController::class, 'index']);

    Route::post('/feedback', [FeedbackController::class, 'store']);
    Route::get('/feedback/recent', [FeedbackController::class, 'recent']);

    Route::post('/quiz-results', [QuizResultController::class, 'store']);

    Route::get('/notes', [NoteController::class, 'index']);
    Route::post('/notes', [NoteController::class, 'store']);
    Route::get('/notes/{id}', [NoteController::class, 'show']);
    Route::put('/notes/{id}', [NoteController::class, 'update']);
    Route::delete('/notes/{id}', [NoteController::class, 'destroy']);
    Route::get('/notes/{id}/download', [NoteController::class, 'download']);

    // Summaries
    Route::get('/summaries', [SummaryController::class, 'index']);
    Route::get('/summaries/{id}', [SummaryController::class, 'show']);
    Route::post('/summaries', [SummaryController::class, 'store']);
    Route::delete('/summaries/{id}', [SummaryController::class, 'destroy']);
});

/*
|--------------------------------------------------------------------------
| Admin routes
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('/dashboard', [AdminDashboardController::class, 'dashboard']);

    Route::get('/users', [AdminUsersController::class, 'index']);
    Route::post('/users', [AdminUsersController::class, 'store']);
    Route::put('/users/{user}', [AdminUsersController::class, 'update']);
    Route::delete('/users/{user}', [AdminUsersController::class, 'destroy']);
    Route::patch('/users/{user}/toggle-admin', [AdminUsersController::class, 'toggleAdmin']);
    Route::patch('/users/{user}/toggle-status', [AdminUsersController::class, 'toggleStatus']);

    Route::get('/notes', [AdminNotesController::class, 'index']);
    Route::put('/notes/{note}', [AdminNotesController::class, 'update']);
    Route::delete('/notes/{note}', [AdminNotesController::class, 'destroy']);
    Route::patch('/notes/{note}/toggle-featured', [AdminNotesController::class, 'toggleFeatured']);
});
