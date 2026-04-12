<?php

namespace App\Services;

use Illuminate\Support\Facades\File;

class PerformanceAnalyzerService
{
    protected string $logPath;
    protected OllamaClientService $api;
    protected array $records = [];

    public function __construct(?string $logPath = null)
    {
        $this->logPath = $logPath ?: storage_path('app/review_logs.json');
        $this->api = new OllamaClientService(
            env('OLLAMA_URL', 'http://127.0.0.1:11434'),
            'gemma:2b',
            40
        );

        $this->records = $this->loadLogs();
    }

    protected function loadLogs(): array
    {
        if (File::exists($this->logPath)) {
            try {
                $data = json_decode(File::get($this->logPath), true);
                return is_array($data) ? $data : [];
            } catch (\Throwable $e) {
                return [];
            }
        }

        return [];
    }

    protected function saveLogs(): void
    {
        File::put(
            $this->logPath,
            json_encode($this->records, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );
    }

    public function logReview(array $question, bool $wasCorrect, float $timeSpent): void
    {
        $this->records[] = [
            'question_text' => $question['question_text'] ?? $question['question'] ?? '',
            'was_correct' => $wasCorrect,
            'time_spent' => $timeSpent,
            'timestamp' => now()->toIso8601String(),
        ];

        $this->saveLogs();
    }

    public function analyzeFast(array $deck = []): array
    {
        $perQuestion = [];
        $totalTime = 0;

        foreach ($this->records as $rec) {
            $q = $rec['question_text'] ?? '';

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

            $perQuestion[$q]['time'][] = (float)($rec['time_spent'] ?? 0);
            $totalTime += (float)($rec['time_spent'] ?? 0);
        }

        $weak = [];
        $strong = [];
        $leech = [];

        foreach ($perQuestion as $q => $data) {
            $accuracy = $data['total'] > 0
                ? $data['correct'] / $data['total']
                : 0;

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
            : 0;

        return [
            'weak' => array_slice($weak, 0, 5),
            'strong' => array_slice($strong, 0, 5),
            'leech' => array_slice($leech, 0, 5),
            'avg_time' => round($avgTime, 2),
            'total_reviews' => count($this->records),
        ];
    }

    public function generateFeedback(array $stats): string
    {
        $prompt = <<<PROMPT
Give short study advice.

Weak topics: {$this->stringify($stats['weak'] ?? [])}
Strong topics: {$this->stringify($stats['strong'] ?? [])}
Leech cards: {$this->stringify($stats['leech'] ?? [])}
Average time: {$stats['avg_time'] ?? 0}

Keep it short.
PROMPT;

        try {
            return trim($this->api->generateText($prompt));
        } catch (\Throwable $e) {
            return 'No feedback available.';
        }
    }

    public function getSmartFeedback(array $deck = []): array
    {
        $stats = $this->analyzeFast($deck);
        $feedback = $this->generateFeedback($stats);

        return [
            'stats' => $stats,
            'feedback' => $feedback,
        ];
    }

    protected function stringify(array $items): string
    {
        return empty($items) ? 'None' : implode(', ', $items);
    }
}