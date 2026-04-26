<?php

namespace App\Services;

use Illuminate\Support\Facades\File;

class PerformanceAnalyzerService
{
    protected $logPath;
    protected $api;
    protected $records = [];

    public function __construct($logPath = null)
    {
        $this->logPath = $logPath ?: storage_path('app/review_logs.json');

        $this->api = new OllamaClientService(
            env('OLLAMA_URL', 'http://127.0.0.1:11434'),
            env('OLLAMA_MODEL', 'phi3:mini'),
            40
        );

        $this->records = $this->loadLogs();
    }

    protected function loadLogs()
    {
        if (!File::exists($this->logPath)) {
            return [];
        }

        try {
            $data = json_decode(File::get($this->logPath), true);
            return is_array($data) ? $data : [];
        } catch (\Throwable $e) {
            return [];
        }
    }

    protected function saveLogs()
    {
        File::put(
            $this->logPath,
            json_encode($this->records, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );
    }

    public function logReview(array $question, $wasCorrect, $timeSpent)
    {
        $this->records[] = [
            'question_text' => (string) ($question['question_text'] ?? ($question['question'] ?? '')),
            'was_correct' => (bool) $wasCorrect,
            'time_spent' => (float) $timeSpent,
            'timestamp' => now()->toIso8601String(),
        ];

        $this->saveLogs();
    }

    public function analyzeFast(array $deck = [])
    {
        $perQuestion = [];
        $totalTime = 0.0;

        foreach ($this->records as $rec) {
            $q = trim((string) ($rec['question_text'] ?? ''));

            if ($q === '') {
                continue;
            }

            if (!isset($perQuestion[$q])) {
                $perQuestion[$q] = [
                    'correct' => 0,
                    'total' => 0,
                    'fails' => 0,
                    'time' => [],
                ];
            }

            $perQuestion[$q]['total'] += 1;

            if (!empty($rec['was_correct'])) {
                $perQuestion[$q]['correct'] += 1;
            } else {
                $perQuestion[$q]['fails'] += 1;
            }

            $spent = (float) ($rec['time_spent'] ?? 0);
            $perQuestion[$q]['time'][] = $spent;
            $totalTime += $spent;
        }

        $weak = [];
        $strong = [];
        $leech = [];

        foreach ($perQuestion as $q => $data) {
            $accuracy = $data['total'] > 0
                ? $data['correct'] / $data['total']
                : 0.0;

            if ($accuracy < 0.5) {
                $weak[] = $q;
            } elseif ($accuracy > 0.8) {
                $strong[] = $q;
            }

            if ($data['fails'] >= 3) {
                $leech[] = $q;
            }
        }

        $avgTime = count($this->records) > 0
            ? $totalTime / count($this->records)
            : 0.0;

        return [
            'weak' => array_slice(array_values($weak), 0, 5),
            'strong' => array_slice(array_values($strong), 0, 5),
            'leech' => array_slice(array_values($leech), 0, 5),
            'avg_time' => round($avgTime, 2),
            'total_reviews' => count($this->records),
        ];
    }

    public function generateFeedback(array $stats): string
    {
        $weakTopics = $this->stringify(isset($stats['weak']) && is_array($stats['weak']) ? $stats['weak'] : []);
        $strongTopics = $this->stringify(isset($stats['strong']) && is_array($stats['strong']) ? $stats['strong'] : []);
        $leechCards = $this->stringify(isset($stats['leech']) && is_array($stats['leech']) ? $stats['leech'] : []);
        $avgTime = isset($stats['avg_time']) ? $stats['avg_time'] : 0;
        $totalReviews = isset($stats['total_reviews']) ? $stats['total_reviews'] : 0;

        $prompt = <<<PROMPT
Give short study advice for a student based on flashcard review performance.

Weak topics: {$weakTopics}
Strong topics: {$strongTopics}
Leech cards: {$leechCards}
Average time: {$avgTime}
Total reviews: {$totalReviews}

Rules:
- Keep it short.
- Be encouraging.
- Mention weak areas first.
- Mention one practical next step.
- Plain text only.
PROMPT;

        try {
            $result = trim((string) $this->api->generateText($prompt));
            return $result !== '' ? $result : 'No feedback available.';
        } catch (\Throwable $e) {
            return 'No feedback available.';
        }
    }

    public function getSmartFeedback(array $deck = [])
    {
        $stats = $this->analyzeFast($deck);
        $feedback = $this->generateFeedback($stats);

        return [
            'stats' => $stats,
            'feedback' => $feedback,
        ];
    }

    protected function stringify(array $items)
    {
        $cleaned = [];

        foreach ($items as $item) {
            $value = trim((string) $item);
            if ($value !== '') {
                $cleaned[] = $value;
            }
        }

        return empty($cleaned) ? 'None' : implode(', ', $cleaned);
    }
}
