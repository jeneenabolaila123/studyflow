<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Throwable;

class ExternalQuizController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $amount = max(1, min((int) $request->query('amount', 5), 20));
        $category = $request->query('category');
        $difficulty = $request->query('difficulty');

        $key = 'external_quiz_' . md5(json_encode([$amount, $category, $difficulty]));

        try {
            $result = Cache::remember($key, 300, function () use ($amount, $category, $difficulty) {
                $response = Http::timeout(10)
                    ->acceptJson()
                    ->get(env('MCQ_API_URL', 'https://your-api-url.com/questions'), [
                        'amount' => $amount,
                        'category' => $category,
                        'difficulty' => $difficulty,
                    ]);

                if (!$response->successful()) {
                    throw new \Exception('Failed to fetch quiz questions from external API.');
                }

                $data = $response->json();

                $questions = collect($data)->map(function ($item, $index) {
                    return [
                        'id' => $index + 1,
                        'question' => $item['question'] ?? '',
                        'options' => $item['choices'] ?? [],
                        'correct_answer' => $item['answer'] ?? '',
                        'category' => $item['category'] ?? null,
                        'difficulty' => $item['difficulty'] ?? null,
                    ];
                })->values();

                return [
                    'questions' => $questions,
                    'count' => $questions->count(),
                ];
            });

            return response()->json($result);
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'Quiz API error.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
