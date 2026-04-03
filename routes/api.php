<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Api\NoteController;
use App\Http\Controllers\Api\AiController;

/* ADD THIS BLOCK HERE */
Route::options('/{any}', function () {
    return response()->json([], 200);
})->where('any', '.*');

Route::get('/ping', function () {
    return response()->json([
        'ok' => true,
        'message' => 'API is working',
    ], 200);
});
Route::get('/ai/test', function () {

    $response = \Illuminate\Support\Facades\Http::post('http://127.0.0.1:11434/api/generate', [
        'model' => 'qwen:0.5b',
        'prompt' => 'Say hello in one sentence',
        'stream' => false,
    ]);

    return $response->json();
});
Route::prefix('auth')->group(function () {

    Route::post('/register', [AuthController::class, 'register']);

    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:login');

    Route::middleware('auth:sanctum')->group(function () {

        Route::post('/logout', [AuthController::class, 'logout']);

        Route::get('/me', [AuthController::class, 'me']);

    });
});


Route::middleware('auth:sanctum')->group(function () {

    Route::get('/notes', [NoteController::class, 'index']);

    Route::post('/notes', [NoteController::class, 'store']);

    Route::get('/notes/{id}', [NoteController::class, 'show']);

    Route::put('/notes/{id}', [NoteController::class, 'update']);

    Route::delete('/notes/{id}', [NoteController::class, 'destroy']);

    Route::get('/notes/{id}/download', [NoteController::class, 'download']);

});


Route::prefix('ai')->group(function () {
Route::post('/generate-quiz', [AiController::class, 'generateQuiz']);
    Route::post('/summarize', [AiController::class, 'summarize']);
    Route::post('/quiz', [AiController::class, 'quiz']);
    Route::post('/chat', [AiController::class, 'chat']);
Route::post('/questions', [AiController::class, 'generateQuestions']);
Route::post('/check-answer', [AiController::class, 'checkAnswer']);
Route::post('/generate-one', [AiController::class, 'generateQuestion']);
});
