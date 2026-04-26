<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Note;
use App\Models\WeakTopic;
use App\Services\QuizRecommendationService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuizResultController extends Controller
{
    public function __construct(
        private QuizRecommendationService $recommendationService
    ) {}

    public function store(Request $request)
    {
        $validated = $request->validate([
            'note_id' => 'required|exists:notes,id',
            'results' => 'required|array|min:1',
            'results.*.question_text' => 'required|string',
            'results.*.topic' => 'nullable|string|max:120',
            'results.*.is_correct' => 'required|boolean',
            'results.*.selected_answer' => 'nullable|string|max:255',
            'results.*.correct_answer' => 'required|string|max:255',
            'difficulty' => 'nullable|string'
        ]);

        $user = $request->user();
        $results = $validated['results'];
        $score = collect($results)->where('is_correct', true)->count();
        $total = count($results);

        // Save Attempt & Responses
        $attempt = $this->recommendationService->saveQuizResults([
            'user_id' => $user->id,
            'note_id' => $validated['note_id'],
            'score' => $score,
            'total_questions' => $total,
            'difficulty' => $validated['difficulty'] ?? 'medium',
            'responses' => $results,
        ]);

        // Generate AI Recommendation
        $recommendation = $this->recommendationService->generateRecommendation($attempt);

        // Update Legacy WeakTopic table for compatibility if needed
        $this->updateLegacyWeakTopics($user->id, $results);

        return ApiResponse::success([
            'attempt' => $attempt->load('responses'),
            'recommendation' => $recommendation,
            'summary' => [
                'score' => $score,
                'total' => $total,
                'percentage' => round(($score / $total) * 100, 2)
            ]
        ], 'Quiz results saved and recommendation generated');
    }

    private function updateLegacyWeakTopics(int $userId, array $results)
    {
        foreach ($results as $row) {
            $topic = trim((string) ($row['topic'] ?? 'General'));
            $isCorrect = (bool) $row['is_correct'];

            $weak = WeakTopic::firstOrCreate(
                ['user_id' => $userId, 'topic' => $topic],
                ['wrong_count' => 0, 'total_count' => 0, 'weakness_percent' => 0]
            );

            $weak->total_count++;
            if (!$isCorrect) {
                $weak->wrong_count++;
            }

            $weak->weakness_percent = round(($weak->wrong_count / $weak->total_count) * 100, 2);
            $weak->save();
        }
    }
}
