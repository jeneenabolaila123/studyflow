<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CardTranslatorService
{
    protected string $ollamaUrl;
    protected string $modelName;

    public const SUPPORTED_LANGUAGES = [
        'Spanish',
        'French',
        'German',
        'Italian',
        'Portuguese',
        'Dutch',
        'Russian',
        'Chinese',
        'Japanese',
        'Korean',
        'Arabic',
        'Hindi',
    ];

    public function __construct(
        ?string $ollamaUrl = null,
        ?string $modelName = null
    ) {
        $this->ollamaUrl = $ollamaUrl ?: env('OLLAMA_URL', 'http://127.0.0.1:11434');
        $this->modelName = $modelName ?: env('OLLAMA_MODEL', 'qwen3:1.7b');
    }

    public function translateQuestion(array $question, string $targetLanguage): array
    {
        $questionText = trim((string)($question['question_text'] ?? $question['question'] ?? ''));
        $options = $question['options'] ?? [];

        if ($questionText === '') {
            throw new \InvalidArgumentException('Question cannot be empty');
        }

        $prompt = <<<PROMPT
Translate this question to {$targetLanguage}:

Question: {$questionText}

Return JSON:
{"translated_question":"text"}
PROMPT;

        try {
            $response = $this->generateText($prompt);

            if (str_contains($response, '{')) {
                $response = substr($response, strpos($response, '{'));
            }

            if (str_contains($response, '}')) {
                $response = substr($response, 0, strrpos($response, '}') + 1);
            }

            $data = json_decode($response, true);

            if (!is_array($data)) {
                throw new \RuntimeException('Invalid translation JSON');
            }

            return [
                'original_question' => $questionText,
                'translated_question' => $data['translated_question'] ?? $questionText,
                'original_options' => is_array($options) ? array_values($options) : [],
                'translated_options' => is_array($options) ? array_values($options) : [],
                'target_language' => $targetLanguage,
                'confidence' => 0.9,
            ];
        } catch (\Throwable $e) {
            Log::warning('Card translation failed', [
                'error' => $e->getMessage(),
                'target_language' => $targetLanguage,
            ]);

            return [
                'original_question' => $questionText,
                'translated_question' => '[Translation failed] ' . $questionText,
                'original_options' => is_array($options) ? array_values($options) : [],
                'translated_options' => is_array($options) ? array_values($options) : [],
                'target_language' => $targetLanguage,
                'confidence' => 0.0,
            ];
        }
    }

    public function translateText(string $text, string $targetLanguage): string
    {
        if (trim($text) === '') {
            return $text;
        }

        $prompt = <<<PROMPT
Translate to {$targetLanguage}:

{$text}

Only translation.
PROMPT;

        try {
            return trim($this->generateText($prompt));
        } catch (\Throwable $e) {
            Log::warning('Simple translation failed', [
                'error' => $e->getMessage(),
                'target_language' => $targetLanguage,
            ]);

            return $text;
        }
    }

    public function getSupportedLanguages(): array
    {
        return self::SUPPORTED_LANGUAGES;
    }

    protected function generateText(string $prompt): string
    {
        $response = Http::timeout(120)
            ->connectTimeout(10)
            ->retry(2, 1500)
            ->post($this->ollamaUrl . '/api/generate', [
                'model' => $this->modelName,
                'prompt' => $prompt,
                'stream' => false,
                'options' => [
                    'temperature' => 0.2,
                    'top_p' => 0.9,
                    'num_predict' => 300,
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
