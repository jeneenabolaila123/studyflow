<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIAnswerEvaluatorService
{
    protected string $ollamaUrl;
    protected string $modelName;
    protected string $hintModelName;

    public function __construct(
        ?string $ollamaUrl = null,
        ?string $modelName = null
    ) {
        $this->ollamaUrl = $ollamaUrl ?: env('OLLAMA_URL', 'http://127.0.0.1:11434');
        $this->modelName = $modelName ?: env('OLLAMA_MODEL', 'qwen3:1.7b');
        $this->hintModelName = $this->modelName;
    }

    public function setModel(string $modelName): void
    {
        $modelName = trim($modelName);

        if ($modelName !== '') {
            $this->modelName = $modelName;
            $this->hintModelName = $modelName;
        }
    }

    public function getModelName(): string
    {
        return $this->modelName;
    }

    public function evaluateShortAnswer(
        string $question,
        string $expected,
        string $user,
        ?string $modelName = null
    ): array {
        if ($modelName) {
            $this->setModel($modelName);
        }

        $prompt = <<<PROMPT
Check if the answer is correct.

Question: {$question}
Correct Answer: {$expected}
User Answer: {$user}

Reply ONLY JSON:
{"is_correct": true/false}
PROMPT;

        try {
            $responseText = trim($this->generateText($this->modelName, $prompt));

            if (str_contains($responseText, '{')) {
                $responseText = substr($responseText, strpos($responseText, '{'));
            }

            if (str_contains($responseText, '}')) {
                $responseText = substr($responseText, 0, strrpos($responseText, '}') + 1);
            }

            $result = json_decode($responseText, true);

            if (!is_array($result)) {
                throw new \RuntimeException('Invalid JSON response');
            }
        } catch (\Throwable $e) {
            $isCorrect = mb_strtolower(trim($user)) === mb_strtolower(trim($expected));
            $result = ['is_correct' => $isCorrect];

            Log::warning('Short answer evaluation fallback used', [
                'error' => $e->getMessage(),
            ]);
        }

        return [
            'is_correct' => (bool)($result['is_correct'] ?? false),
            'corrected_answer' => null,
            'explanation' => null,
        ];
    }

    public function explainChoice(
        string $question,
        string $chosen,
        string $correct,
        ?string $modelName = null
    ): string {
        if ($modelName) {
            $this->setModel($modelName);
        }

        $prompt = <<<PROMPT
Explain briefly:

Question: {$question}
User Answer: {$chosen}
Correct Answer: {$correct}

Answer in 1 sentence.
PROMPT;

        try {
            return trim($this->generateText($this->modelName, $prompt));
        } catch (\Throwable $e) {
            Log::warning('Explain choice failed', [
                'error' => $e->getMessage(),
            ]);

            return 'Explanation not available';
        }
    }

    public function generateHint(
        string $question,
        string $questionType,
        array $options = [],
        ?string $context = null,
        ?string $modelName = null
    ): string {
        if ($modelName) {
            $this->setModel($modelName);
        }

        $optionsText = '';
        if (!empty($options)) {
            $optionsText = "Options:\n- " . implode("\n- ", array_map('strval', $options));
        }

        $contextText = $context ? "\nContext: {$context}" : '';

        $prompt = <<<PROMPT
Give a short hint.

Question: {$question}
Question Type: {$questionType}
{$optionsText}{$contextText}

Hint:
PROMPT;

        try {
            $hint = trim($this->generateText($this->hintModelName, $prompt));

            if (str_contains($hint, 'Hint:')) {
                $parts = explode('Hint:', $hint, 2);
                $hint = trim($parts[1] ?? $hint);
            }

            return $hint !== '' ? $hint : 'Think about the key concept.';
        } catch (\Throwable $e) {
            Log::warning('Generate hint failed', [
                'error' => $e->getMessage(),
            ]);

            return 'Think about the key concept.';
        }
    }

    protected function generateText(string $model, string $prompt): string
    {
        $response = Http::timeout(120)
            ->connectTimeout(10)
            ->retry(2, 1500)
            ->post($this->ollamaUrl . '/api/generate', [
                'model' => $model,
                'prompt' => $prompt,
                'stream' => false,
                'options' => [
                    'temperature' => 0.2,
                    'top_p' => 0.9,
                    'num_predict' => 120,
                    'num_ctx' => 1024,
                ],
            ]);

        if (!$response->ok()) {
            throw new \RuntimeException('Ollama request failed with status ' . $response->status());
        }

        $body = $response->json();
        $text = trim((string)($body['response'] ?? ''));

        if ($text === '') {
            throw new \RuntimeException('Empty model response');
        }

        return $text;
    }
}
