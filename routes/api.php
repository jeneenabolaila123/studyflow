<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Api\NoteController;

Route::get('/ping', function () {
    return response()->json([
        'ok' => true,
        'message' => 'API is working',
    ], 200);
});

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/notes', [NoteController::class, 'index']);
    Route::post('/notes', [NoteController::class, 'store']);
    Route::get('/notes/{id}', [NoteController::class, 'show']);
    Route::put('/notes/{id}', [NoteController::class, 'update']); // ✅ update (واحد فقط)
    Route::delete('/notes/{id}', [NoteController::class, 'destroy']);
    Route::get('/notes/{id}/download', [NoteController::class, 'download']);
});

Route::middleware(['auth:sanctum', 'throttle:ai'])->prefix('ai')->group(function () {
    Route::post('/summarize', [\App\Http\Controllers\Api\AiController::class, 'summarize']);
    Route::post('/quiz', [\App\Http\Controllers\Api\AiController::class, 'quiz']);
    Route::post('/chat', [\App\Http\Controllers\Api\AiController::class, 'chat']);
});
