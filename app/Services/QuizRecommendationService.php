<?php

namespace App\Services;

use App\Models\QuizAttempt;
use App\Models\QuizRecommendation;
use App\Models\QuizResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class QuizRecommendationService
{
    public function saveQuizResults(array $data): QuizAttempt
    {
        return DB::transaction(function () use ($data) {
            $attempt = QuizAttempt::create([
                'user_id' => $data['user_id'],
                'note_id' => $data['note_id'],
                'score' => $data['score'],
                'total_questions' => $data['total_questions'],
                'difficulty' => $data['difficulty'] ?? 'medium',
            ]);

            foreach ($data['responses'] as $response) {
                QuizResponse::create([
                    'quiz_attempt_id' => $attempt->id,
                    'question_text' => $response['question_text'],
                    'topic' => $response['topic'] ?? 'General',
                    'selected_answer' => $response['selected_answer'],
                    'correct_answer' => $response['correct_answer'],
                    'is_correct' => $response['is_correct'],
                ]);
            }

            return $attempt;
        });
    }

    public function generateRecommendation(QuizAttempt $attempt): QuizRecommendation
    {
        // 1. Analyze weak areas
        $weakAreas = QuizResponse::where('quiz_attempt_id', $attempt->id)
            ->where('is_correct', false)
            ->pluck('topic')
            ->filter()
            ->unique()
            ->values()
            ->toArray();

        // 2. Prepare AI Analysis
        $subject = $attempt->note->title ?? 'Study Material';
        $scoreText = "{$attempt->score}/{$attempt->total_questions}";
        $levelText = ucfirst($attempt->difficulty);
        $weakList = !empty($weakAreas) ? implode(', ', $weakAreas) : 'None';

        $prompt = $this->buildRecommendationPrompt($subject, $scoreText, $levelText, $weakList);
        $aiResult = $this->queryOllama($prompt);

        // 3. Parse and Store
        $parsed = $this->parseAiResult($aiResult);

        return QuizRecommendation::create([
            'quiz_attempt_id' => $attempt->id,
            'subject' => $subject,
            'weak_areas' => $weakAreas,
            'recommendation_text' => $parsed['recommendation'],
            'exercises' => $parsed['exercises'],
        ]);
    }

    private function buildRecommendationPrompt(string $subject, string $score, string $level, string $weakAreas): string
    {
        return <<<PROMPT
You are an expert academic advisor. Based on a student's quiz performance, provide a personalized study recommendation.

Subject: {$subject}
Overall Score: {$score}
Difficulty Level: {$level}
Weak Topics: {$weakAreas}

Goal: Recommend what the student should study next and provide specific exercises.

Return ONLY valid JSON with the following structure:
{
  "recommendation": "A clear study advice paragraph.",
  "exercises": [
    "Exercise 1 description",
    "Exercise 2 description",
    "Exercise 3 description"
  ]
}

Do not include markdown code fences. Do not include commentary.
PROMPT;
    }

    private function queryOllama(string $prompt): string
    {
        $baseUrl = rtrim(config('services.ollama.base_url', 'http://127.0.0.1:11434'), '/');
        $model = config('services.ollama.model', 'phi3:mini');

        try {
            $response = Http::timeout(60)->post($baseUrl . '/api/generate', [
                'model' => $model,
                'prompt' => $prompt,
                'stream' => false,
                'options' => ['temperature' => 0.4],
            ]);
            return $response->json()['response'] ?? '';
        } catch (\Exception $e) {
            Log::error('Recommendation AI Error: ' . $e->getMessage());
            return '';
        }
    }

    private function parseAiResult(string $raw): array
    {
        $clean = trim($raw);
        $clean = preg_replace('/^```(?:json)?\s*/i', '', $clean);
        $clean = preg_replace('/\s*```\s*$/', '', $clean);

        $decoded = json_decode($clean, true);

        return [
            'recommendation' => $decoded['recommendation'] ?? 'Review your notes and practice more.',
            'exercises' => $decoded['exercises'] ?? ['Review the material', 'Try another quiz'],
        ];
    }
}
