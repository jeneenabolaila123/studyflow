<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WeakTopic;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuizResultController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'results' => 'required|array|min:1',
            'results.*.topic' => 'nullable|string|max:120',
            'results.*.is_correct' => 'nullable|boolean',
            'results.*.selected_answer' => 'nullable|string|max:255',
            'results.*.correct_answer' => 'nullable|string|max:255',
        ]);

        $user = $request->user();
        $results = $validated['results'];

        $touched = [];

        DB::transaction(function () use ($user, $results, &$touched) {
            foreach ($results as $row) {
                $topic = isset($row['topic']) ? trim((string) $row['topic']) : '';
                $topic = preg_replace('/\s+/', ' ', $topic ?? '');
                $topic = $topic ?: 'General';

                $isCorrect = null;
                if (array_key_exists('is_correct', $row)) {
                    $isCorrect = (bool) $row['is_correct'];
                } elseif (!empty($row['selected_answer']) || !empty($row['correct_answer'])) {
                    $isCorrect = trim((string) ($row['selected_answer'] ?? '')) === trim((string) ($row['correct_answer'] ?? ''));
                }

                if ($isCorrect === null) {
                    // If caller didn't provide correctness, skip (cannot compute weakness).
                    continue;
                }

                $weak = WeakTopic::firstOrCreate(
                    ['user_id' => $user->id, 'topic' => $topic],
                    ['wrong_count' => 0, 'total_count' => 0, 'weakness_percent' => 0, 'recommendation' => null]
                );

                $weak->total_count = (int) $weak->total_count + 1;
                if (!$isCorrect) {
                    $weak->wrong_count = (int) $weak->wrong_count + 1;
                }

                $weak->weakness_percent = $weak->total_count > 0
                    ? round(((int) $weak->wrong_count / (int) $weak->total_count) * 100, 2)
                    : 0;

                $weak->recommendation = $this->makeRecommendation((float) $weak->weakness_percent);

                $weak->save();

                $touched[$weak->id] = true;
            }
        });

        $items = WeakTopic::query()
            ->where('user_id', $user->id)
            ->whereIn('id', array_keys($touched))
            ->orderByDesc('weakness_percent')
            ->get(['id', 'topic', 'wrong_count', 'total_count', 'weakness_percent', 'recommendation', 'updated_at'])
            ->values();

        return ApiResponse::success($items, 'Quiz results saved');
    }

    private function makeRecommendation(float $weaknessPercent): string
    {
        if ($weaknessPercent >= 70) {
            return 'You need more revision in this topic. Review the basics and take another quiz in StudyFlow.';
        }

        if ($weaknessPercent >= 40) {
            return 'The system found that you need more practice in this topic. Revise it and try more questions.';
        }

        return 'Keep practicing — you are doing well, but a bit more repetition will help.';
    }
}
