<?php

namespace App\Services;

class QuestionSimplifierService
{
    protected OllamaClientService $api;

    public function __construct()
    {
        $this->api = new OllamaClientService(
            env('OLLAMA_URL', 'http://127.0.0.1:11434'),
            'qwen3:1.7b',
            40
        );
    }

    public function simplifyQuestion(array $question, string $targetLevel = 'beginner'): array
    {
        $text = $question['question_text'] ?? $question['question'] ?? '';
        $options = $question['options'] ?? [];

        if (!$text) {
            throw new \InvalidArgumentException("Question cannot be empty");
        }

        // ⚡ fast bypass
        if (strlen($text) < 80) {
            return [
                'original_question' => $text,
                'simplified_question' => $text,
                'original_options' => $options,
                'simplified_options' => $options,
                'complexity_reduction' => 0.0,
                'readability_score' => 0.85,
            ];
        }

        $prompt = $this->buildPrompt($text, $options, $targetLevel);

        try {
            $response = $this->api->generateText($prompt);
            return $this->parseResponse($response, $text, $options);
        } catch (\Throwable $e) {
            return $this->fallback($text, $options);
        }
    }

    protected function buildPrompt(string $text, array $options, string $level): string
    {
        $optionsText = '';

        foreach ($options as $opt) {
            $optionsText .= "- {$opt}\n";
        }

        return <<<PROMPT
Simplify this question for {$level} level.

Q: {$text}

Options:
{$optionsText}

Keep meaning same.

Return format:
Q: simplified question
Options:
- option1
- option2
PROMPT;
    }

    protected function parseResponse(string $text, string $original, array $originalOptions): array
    {
        $lines = explode("\n", trim($text));

        $simplifiedQ = $original;
        $options = [];

        foreach ($lines as $line) {
            $line = trim($line);

            if (stripos($line, 'Q:') === 0) {
                $simplifiedQ = trim(substr($line, 2));
            } elseif (str_starts_with($line, '-')) {
                $options[] = trim(substr($line, 1));
            }
        }

        return [
            'original_question' => $original,
            'simplified_question' => $simplifiedQ,
            'original_options' => $originalOptions,
            'simplified_options' => !empty($options) ? $options : $originalOptions,
            'complexity_reduction' => 0.5,
            'readability_score' => 0.75,
        ];
    }

    protected function fallback(string $text, array $options): array
    {
        return [
            'original_question' => $text,
            'simplified_question' => $text,
            'original_options' => $options,
            'simplified_options' => $options,
            'complexity_reduction' => 0.0,
            'readability_score' => 0.5,
        ];
    }

    public function simplifyMultiple(array $questions, string $level = 'beginner'): array
    {
        $results = [];

        foreach ($questions as $q) {
            try {
                $results[] = $this->simplifyQuestion($q, $level);
            } catch (\Throwable $e) {
                $results[] = $this->fallback(
                    $q['question_text'] ?? '',
                    $q['options'] ?? []
                );
            }
        }

        return $results;
    }

    public function quickSimplifyText(string $text): string
    {
        if (!$text) {
            return $text;
        }

        try {
            return trim($this->api->generateText("Simplify:\n{$text}"));
        } catch (\Throwable $e) {
            return $text;
        }
    }

    public function analyzeReadability(string $text): array
    {
        $words = explode(' ', trim($text));
        $length = count($words);

        if ($length < 10) {
            $score = 0.9;
        } elseif ($length < 20) {
            $score = 0.75;
        } elseif ($length < 40) {
            $score = 0.6;
        } else {
            $score = 0.4;
        }

        return [
            'readability_score' => $score,
            'complexity_level' => 1 - $score,
        ];
    }

    public function suggestLevel(array $question): string
    {
        $text = $question['question_text'] ?? '';
        $difficulty = $question['difficulty'] ?? 'easy';

        $length = strlen($text);

        if ($length > 200 || $difficulty === 'hard') {
            return 'beginner';
        }

        if ($length > 100 || $difficulty === 'medium') {
            return 'intermediate';
        }

        return 'advanced';
    }

    public function getDifficultyLevels(): array
    {
        return ['beginner', 'intermediate', 'advanced'];
    }
}
