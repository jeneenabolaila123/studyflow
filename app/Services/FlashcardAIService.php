<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FlashcardAIService
{
    protected string $ollamaUrl;
    protected string $modelName;

    public function __construct(
        ?string $ollamaUrl = null,
        ?string $modelName = null
    ) {
        $this->ollamaUrl = $ollamaUrl ?: env('OLLAMA_URL', 'http://127.0.0.1:11434');
        $this->modelName = $modelName ?: env('OLLAMA_MODEL', 'qwen3:1.7b');
    }

    public function explainAnswer(string $question, string $answer): string
    {
        $prompt = <<<PROMPT
Explain briefly why this answer is correct.

Q: {$question}
A: {$answer}

Explanation:
PROMPT;

        try {
            return trim($this->generateText($prompt));
        } catch (\Throwable $e) {
            Log::warning('Flashcard explain answer failed', [
                'error' => $e->getMessage(),
            ]);

            return 'Explanation not available.';
        }
    }

    public function simplifyQuestion(string $question): string
    {
        $prompt = <<<PROMPT
Rewrite this question in a simpler way.

Q: {$question}

Simple:
PROMPT;

        try {
            return trim($this->generateText($prompt));
        } catch (\Throwable $e) {
            Log::warning('Flashcard simplify question failed', [
                'error' => $e->getMessage(),
            ]);

            return $question;
        }
    }

    public function translateCard(string $front, string $back, string $language): array
    {
        $prompt = <<<PROMPT
Translate to {$language}.

Front: {$front}
Back: {$back}

Respond exactly:
Front: ...
Back: ...
PROMPT;

        try {
            $text = $this->generateText($prompt);
            return $this->parseTranslation($text);
        } catch (\Throwable $e) {
            Log::warning('Flashcard translate card failed', [
                'error' => $e->getMessage(),
                'language' => $language,
            ]);

            return [
                'front' => $front,
                'back' => $back,
            ];
        }
    }

    public function quizMe(?array $topics = null): array
    {
        $topicString = !empty($topics)
            ? implode(', ', array_map('strval', $topics))
            : 'general knowledge';

        $prompt = <<<PROMPT
Generate ONE short question and answer about {$topicString}.

Format:
Q: ...
A: ...
PROMPT;

        try {
            $text = $this->generateText($prompt);
            return $this->parseQa($text);
        } catch (\Throwable $e) {
            Log::warning('Flashcard quizMe failed', [
                'error' => $e->getMessage(),
            ]);

            return [
                'question' => 'Question not available.',
                'answer' => '',
            ];
        }
    }

    protected function parseTranslation(string $text): array
    {
        preg_match('/Front\s*:\s*(.*)/i', $text, $frontMatch);
        preg_match('/Back\s*:\s*(.*)/i', $text, $backMatch);

        $front = isset($frontMatch[1]) ? trim($frontMatch[1]) : trim($text);
        $back = isset($backMatch[1]) ? trim($backMatch[1]) : '';

        return [
            'front' => $front,
            'back' => $back,
        ];
    }

    protected function parseQa(string $text): array
    {
        preg_match('/Q\s*:\s*(.*)/i', $text, $qMatch);
        preg_match('/A\s*:\s*(.*)/i', $text, $aMatch);

        $question = isset($qMatch[1]) ? trim($qMatch[1]) : trim($text);
        $answer = isset($aMatch[1]) ? trim($aMatch[1]) : '';

        return [
            'question' => $question,
            'answer' => $answer,
        ];
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
