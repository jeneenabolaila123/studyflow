<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;
use RuntimeException;

class AiQuizGeneratorService
{
    protected string $ollamaUrl;
    protected string $modelName;
    protected string $defaultQualityMode;
    protected string $defaultDifficulty;
    protected int $defaultQuestionCount;

    public function __construct(
        ?string $ollamaUrl = null,
        ?string $modelName = null,
        string $defaultQualityMode = 'fast',
        string $defaultDifficulty = 'medium',
        int $defaultQuestionCount = 5
    ) {
        $this->ollamaUrl = $ollamaUrl ?: env('OLLAMA_BASE_URL', 'http://127.0.0.1:11434');
        $this->modelName = $modelName ?: env('OLLAMA_MODEL', 'phi3:mini');
        $this->defaultQualityMode = $this->normalizeQualityMode($defaultQualityMode);
        $this->defaultDifficulty = $this->normalizeDifficulty($defaultDifficulty);
        $this->defaultQuestionCount = max(1, $defaultQuestionCount);
    }

    public function setModel(string $modelName): void
    {
        if (trim($modelName) !== '') {
            $this->modelName = trim($modelName);
            Log::info('Quiz generator model set', ['model' => $this->modelName]);
        }
    }

    public function getModelName(): string
    {
        return $this->modelName;
    }

    public function isAiServiceAvailable(): bool
    {
        try {
            $response = Http::timeout(10)->get($this->ollamaUrl . '/api/tags');
            return $response->ok();
        } catch (\Throwable $e) {
            Log::warning('Ollama unavailable', ['error' => $e->getMessage()]);
            return false;
        }
    }

    public function generateFromText(
        string $text,
        string $difficulty = 'medium',
        ?string $title = null,
        array $existingQuestions = [],
        int $count = 5
    ): array {
        $questions = $this->generateQuestions(
            text: $text,
            modelName: null,
            qualityMode: 'fast',
            difficulty: $difficulty,
            questionCount: $count,
            existingQuestions: $existingQuestions,
            title: $title
        );

        return [
            'difficulty' => $difficulty,
            'questions' => $questions,
        ];
    }

    public function generateQuestions(
        string $text,
        ?string $modelName = null,
        string $qualityMode = 'fast',
        ?string $difficulty = null,
        ?int $questionCount = null,
        array $existingQuestions = [],
        ?string $title = null
    ): array {
        if (trim($text) === '') {
            throw new InvalidArgumentException('Empty text');
        }

        $difficulty = $this->normalizeDifficulty($difficulty ?: $this->defaultDifficulty);
        $qualityMode = $this->normalizeQualityMode($qualityMode ?: $this->defaultQualityMode);
        $questionCount = max(1, min(5, (int) ($questionCount ?: $this->defaultQuestionCount)));

        if ($modelName) {
            $this->setModel($modelName);
        }

        $existingQuestions = array_values(array_filter($existingQuestions, function ($q) {
            return is_array($q) && ! empty($q['question']);
        }));

        $sourceText = $this->prepareGenerationSource($text, $difficulty);
        $title = $title ?: 'Uploaded PDF';

        $prompt = $this->buildPrompt(
            text: $sourceText,
            questionCount: $questionCount,
            difficulty: $difficulty,
            qualityMode: $qualityMode,
            existingQuestions: $existingQuestions,
            title: $title
        );

        $options = $this->qualityProfile($qualityMode, $difficulty, $questionCount);
        $responseText = $this->callModel($prompt, $options);

        $questions = $this->parseQuestions($responseText);
        $questions = $this->filterAgainstExistingQuestions($questions, $existingQuestions, $questionCount);

        if (count($questions) < $questionCount) {
            $fallback = $this->buildFallbackQuestions($sourceText, $questionCount - count($questions), $difficulty);

            foreach ($fallback as $q) {
                if (count($questions) >= $questionCount) {
                    break;
                }

                if (! $this->isDuplicateQuestion($q['question'], $questions)) {
                    $questions[] = $q;
                }
            }
        }

        if (empty($questions)) {
            throw new RuntimeException('No questions generated');
        }

        return array_slice($questions, 0, $questionCount);
    }

    protected function buildPrompt(
        string $text,
        int $questionCount,
        string $difficulty = 'medium',
        string $qualityMode = 'fast',
        array $existingQuestions = [],
        ?string $title = null
    ): string {
        $difficultyHint = match ($difficulty) {
            'easy' => 'Focus on basic understanding, direct concept checks, and core definitions.',
            'hard' => 'Focus on deeper reasoning, comparison, and slightly stronger distractors.',
            default => 'Use a balanced level of understanding and simple application.',
        };

        $existingList = "None";
        if (! empty($existingQuestions)) {
            $lines = [];
            foreach ($existingQuestions as $index => $question) {
                if (! empty($question['question'])) {
                    $lines[] = ($index + 1) . '. ' . trim((string) $question['question']);
                }
            }
            if ($lines !== []) {
                $existingList = implode("\n", $lines);
            }
        }

        $title = $title ?: 'Uploaded PDF';

        return <<<PROMPT
/no_think

You are a strict university instructor creating high-quality multiple-choice questions from study material.

Generate EXACTLY {$questionCount} NEW MCQ questions based ONLY on the source text below.

Rules:
- Use only information clearly supported by the source text.
- Each question must test a DIFFERENT concept or subtopic.
- Do NOT repeat the same idea in different wording.
- Do NOT repeat or rephrase any existing question.
- Prefer conceptual understanding, application, comparison, and interpretation over direct copying.
- Do NOT ask "according to the text".
- Do NOT copy full sentences from the source text.
- Keep the question stem clear and not too long.
- Make distractors plausible and meaningful.
- Each question must have exactly 4 options: A, B, C, D.
- Each question must have exactly 1 correct answer.
- Each question must include a short explanation.
- Return ONLY valid JSON.
- Do NOT use markdown.
- Do NOT wrap the JSON in code fences.
- Do NOT add commentary before or after the JSON.

Difficulty guidance:
{$difficultyHint}

Existing questions to avoid:
{$existingList}

Return EXACTLY this JSON schema:
{
  "questions": [
    {
      "question": "Question text here",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "correct_answer": "A",
      "explanation": "Short explanation here"
    }
  ]
}

Source title:
{$title}

Source text:
{$text}
PROMPT;
    }

    protected function callModel(string $prompt, array $options = []): string
    {
        $started = microtime(true);

        try {
            $response = Http::timeout(180)
                ->connectTimeout(10)
                ->retry(1, 1000)
                ->post($this->ollamaUrl . '/api/generate', [
                    'model' => $this->modelName,
                    'prompt' => $prompt,
                    'stream' => false,
                    'options' => $options,
                ]);

            if (! $response->ok()) {
                throw new RuntimeException('Ollama request failed: ' . $response->status() . ' - ' . $response->body());
            }

            $body = $response->json();
            $text = (string) ($body['response'] ?? '');

            Log::info('[QUIZ_GEN] response', [
                'model' => $this->modelName,
                'time' => round(microtime(true) - $started, 2),
                'chars' => strlen($text),
                'preview' => mb_substr(str_replace("\n", ' ', $text), 0, 250),
            ]);

            return trim($text);
        } catch (\Throwable $e) {
            Log::error('[QUIZ_GEN] model call failed', [
                'model' => $this->modelName,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    protected function parseQuestions(string $response): array
    {
        $response = $this->removeThinkBlocks($response);

        $jsonQuestions = $this->parseJsonQuestions($response);
        if (! empty($jsonQuestions)) {
            return $jsonQuestions;
        }

        return $this->parseTextQuestions($response);
    }

    protected function parseJsonQuestions(string $response): array
    {
        $response = trim($response);

        if ($response === '') {
            return [];
        }

        $candidates = [$response];

        $objStart = strpos($response, '{');
        $objEnd = strrpos($response, '}');
        if ($objStart !== false && $objEnd !== false && $objEnd > $objStart) {
            $candidates[] = substr($response, $objStart, $objEnd - $objStart + 1);
        }

        foreach ($candidates as $candidate) {
            $candidate = preg_replace('/^```(?:json)?\s*/i', '', $candidate);
            $candidate = preg_replace('/\s*```$/', '', $candidate);
            $candidate = preg_replace('/,\s*([}\]])/', '$1', $candidate);

            $decoded = json_decode($candidate, true);

            if (! is_array($decoded)) {
                continue;
            }

            $items = $decoded['questions'] ?? (array_is_list($decoded) ? $decoded : []);

            if (! is_array($items)) {
                continue;
            }

            $questions = [];

            foreach ($items as $item) {
                if (! is_array($item)) {
                    continue;
                }

                $question = trim((string) ($item['question'] ?? ''));
                $options = $this->normalizeOptions($item['options'] ?? []);
                $correctAnswer = $this->normalizeCorrectAnswer(
                    $item['correct_answer'] ?? ($item['correct'] ?? null),
                    $options ?? []
                );
                $explanation = trim((string) ($item['explanation'] ?? ''));

                if ($question !== '' && $options !== null && $correctAnswer !== null && $explanation !== '') {
                    $questions[] = [
                        'question' => $question,
                        'options' => $options,
                        'correct_answer' => $correctAnswer,
                        'explanation' => $explanation,
                        'type' => 'multiple_choice',
                    ];
                }
            }

            if (! empty($questions)) {
                return $questions;
            }
        }

        return [];
    }

    protected function parseTextQuestions(string $response): array
    {
        $response = str_replace(["```json", "```txt", "```python", "```"], '', $response);
        $response = preg_replace("/\r\n|\r/", "\n", trim($response));

        if ($response === '') {
            return [];
        }

        $blocks = preg_split('/\n(?=(?:Q\d+\s*:|Q:|Question:|\d+[\).]))/i', $response) ?: [];
        $questions = [];

        foreach ($blocks as $block) {
            $block = trim($block);
            if ($block === '') {
                continue;
            }

            $parsed = $this->parseQuestionBlock($block);
            if ($parsed) {
                $questions[] = $parsed;
            }
        }

        return $questions;
    }

    protected function parseQuestionBlock(string $block): ?array
    {
        $lines = array_values(array_filter(array_map('trim', explode("\n", $block))));
        $questionText = null;
        $options = [];
        $correctAnswer = null;
        $explanation = null;

        foreach ($lines as $line) {
            if (preg_match('/^(Q\d+\s*:|Q:|Question:|\d+[\).]\s*)/i', $line)) {
                $questionText = trim(preg_replace('/^(Q\d+\s*:|Q:|Question:|\d+[\).]\s*)/i', '', $line));
            } elseif (preg_match('/^[A-D][\)\.\:]\s*/', $line)) {
                $label = strtoupper($line[0]);
                $options[$label] = trim(preg_replace('/^[A-D][\)\.\:]\s*/', '', $line));
            } elseif (preg_match('/^Correct(\s+Answer)?:/i', $line)) {
                $value = strtoupper(trim(explode(':', $line, 2)[1] ?? ''));
                $value = str_replace([')', '.', ':'], '', $value);

                if (in_array($value, ['A', 'B', 'C', 'D'], true)) {
                    $correctAnswer = $value;
                } elseif (in_array($value, ['1', '2', '3', '4'], true)) {
                    $correctAnswer = ['1' => 'A', '2' => 'B', '3' => 'C', '4' => 'D'][$value];
                }
            } elseif (preg_match('/^Explanation:/i', $line)) {
                $explanation = trim(explode(':', $line, 2)[1] ?? '');
            }
        }

        if (
            $questionText &&
            count($options) === 4 &&
            $correctAnswer !== null &&
            $explanation !== null &&
            $explanation !== ''
        ) {
            ksort($options);

            return [
                'question' => $questionText,
                'options' => $options,
                'correct_answer' => $correctAnswer,
                'explanation' => $explanation,
                'type' => 'multiple_choice',
            ];
        }

        return null;
    }

    protected function filterAgainstExistingQuestions(array $questions, array $existingQuestions, int $limit): array
    {
        $unique = [];

        foreach ($questions as $q) {
            if (! $this->isValidQuestion($q)) {
                continue;
            }

            if ($this->isDuplicateQuestion($q['question'], $existingQuestions)) {
                continue;
            }

            if ($this->isDuplicateQuestion($q['question'], $unique)) {
                continue;
            }

            $unique[] = $q;

            if (count($unique) >= $limit) {
                break;
            }
        }

        return $unique;
    }

    protected function isValidQuestion(array $question): bool
    {
        $questionText = trim((string) ($question['question'] ?? ''));
        $options = $question['options'] ?? [];
        $correctAnswer = $question['correct_answer'] ?? null;
        $explanation = trim((string) ($question['explanation'] ?? ''));

        if ($questionText === '' || mb_strlen($questionText) < 8) {
            return false;
        }

        if (! is_array($options) || count($options) !== 4) {
            return false;
        }

        if (! is_string($correctAnswer) || ! in_array($correctAnswer, ['A', 'B', 'C', 'D'], true)) {
            return false;
        }

        if ($explanation === '') {
            return false;
        }

        if ($this->hasDuplicateOptions($options)) {
            return false;
        }

        if ($this->looksTooGeneric($questionText)) {
            return false;
        }

        return true;
    }

    protected function isDuplicateQuestion(string $questionText, array $existingQuestions, float $threshold = 0.88): bool
    {
        foreach ($existingQuestions as $existing) {
            $old = is_array($existing) ? ($existing['question'] ?? '') : '';
            if ($this->questionSimilarity($questionText, $old) >= $threshold) {
                return true;
            }
        }

        return false;
    }

    protected function questionSimilarity(string $a, string $b): float
    {
        $a = $this->normalizeText($a);
        $b = $this->normalizeText($b);

        if ($a === '' || $b === '') {
            return 0.0;
        }

        similar_text($a, $b, $percent);
        return $percent / 100;
    }

    protected function looksTooGeneric(string $questionText): bool
    {
        $q = $this->normalizeText($questionText);

        $badPatterns = [
            'what is mentioned',
            'which statement is true',
            'what appears in the passage',
            'what does the text say',
            'according to the text',
            'which of the following is mentioned',
        ];

        foreach ($badPatterns as $pattern) {
            if (str_contains($q, $pattern)) {
                return true;
            }
        }

        return count(explode(' ', $q)) <= 4;
    }

    protected function buildFallbackQuestions(string $text, int $targetCount, string $difficulty = 'easy'): array
    {
        $questions = [];
        $topics = $this->extractEmergencyTopics($text);

        if (empty($topics)) {
            return [];
        }

        foreach ($topics as $index => $topic) {
            if (count($questions) >= $targetCount) {
                break;
            }

            $distractors = $this->makeDistractors($topic, $topics);
            if (count($distractors) < 3) {
                continue;
            }

            $stem = match ($difficulty) {
                'medium' => 'Which concept best matches the material?',
                'hard' => 'Which conclusion is best supported by the material?',
                default => 'Which topic appears in the material?',
            };

            $options = [$topic, $distractors[0], $distractors[1], $distractors[2]];
            shuffle($options);

            $correctAnswer = array_search($topic, $options, true);
            $labelMap = ['A', 'B', 'C', 'D'];

            $questions[] = [
                'question' => $stem,
                'options' => [
                    'A' => $options[0],
                    'B' => $options[1],
                    'C' => $options[2],
                    'D' => $options[3],
                ],
                'correct_answer' => $labelMap[$correctAnswer],
                'explanation' => 'This fallback question was generated from an important topic in the uploaded material.',
                'type' => 'multiple_choice',
            ];
        }

        return $questions;
    }

    protected function extractEmergencyTopics(string $text, int $maxItems = 30): array
    {
        $text = $this->cleanText($text, 5000);

        preg_match_all('/\b[A-Za-z][A-Za-z0-9\-]{2,}(?:\s+[A-Za-z][A-Za-z0-9\-]{2,}){0,4}\b/', $text, $matches);

        $items = [];
        foreach (($matches[0] ?? []) as $match) {
            $match = trim($match);
            if (mb_strlen($match) >= 3 && mb_strlen($match) <= 50) {
                $items[] = $match;
            }
        }

        return array_slice($this->uniqueKeepOrder($items), 0, $maxItems);
    }

    protected function makeDistractors(string $correct, array $pool, int $maxNeeded = 3): array
    {
        $correctNorm = $this->normalizeText($correct);
        $distractors = [];

        foreach ($pool as $item) {
            $item = trim((string) $item);
            $norm = $this->normalizeText($item);

            if ($norm === '' || $norm === $correctNorm) {
                continue;
            }

            if (! in_array($item, $distractors, true)) {
                $distractors[] = $item;
            }

            if (count($distractors) >= $maxNeeded) {
                break;
            }
        }

        $generic = [
            'Search engine',
            'Query expansion',
            'Morphology',
            'Syntax',
            'Semantics',
            'Indexing',
            'Tokenization',
            'Stopword removal',
            'Weighting',
        ];

        foreach ($generic as $item) {
            if (count($distractors) >= $maxNeeded) {
                break;
            }

            $norm = $this->normalizeText($item);
            if ($norm !== $correctNorm && ! in_array($item, $distractors, true)) {
                $distractors[] = $item;
            }
        }

        return array_slice($distractors, 0, $maxNeeded);
    }

    protected function prepareGenerationSource(string $text, string $difficulty): string
    {
        $clean = $this->cleanText($text, 8000);

        return match ($difficulty) {
            'hard' => $this->cleanText($clean, 2200),
            'medium' => $this->cleanText($clean, 1800),
            default => $this->cleanText($clean, 1500),
        };
    }

    protected function qualityProfile(string $qualityMode, string $difficulty, int $questionCount): array
    {
        if ($qualityMode === 'higher_quality') {
            return [
                'temperature' => 0.45,
                'top_k' => 20,
                'top_p' => 0.85,
                'repeat_penalty' => 1.12,
                'num_predict' => min(650, 120 + (70 * max(1, $questionCount))),
                'num_ctx' => 2048,
            ];
        }

        if ($difficulty === 'medium') {
            return [
                'temperature' => 0.25,
                'top_k' => 12,
                'top_p' => 0.75,
                'repeat_penalty' => 1.08,
                'num_predict' => min(520, 100 + (60 * max(1, $questionCount))),
                'num_ctx' => 1536,
            ];
        }

        return [
            'temperature' => 0.18,
            'top_k' => 10,
            'top_p' => 0.72,
            'repeat_penalty' => 1.06,
            'num_predict' => min(480, 90 + (55 * max(1, $questionCount))),
            'num_ctx' => 1280,
        ];
    }

    protected function normalizeOptions(mixed $options): ?array
    {
        if (! is_array($options)) {
            return null;
        }

        if (array_is_list($options) && count($options) === 4) {
            return [
                'A' => trim((string) $options[0]),
                'B' => trim((string) $options[1]),
                'C' => trim((string) $options[2]),
                'D' => trim((string) $options[3]),
            ];
        }

        $normalized = [
            'A' => trim((string) ($options['A'] ?? $options['a'] ?? '')),
            'B' => trim((string) ($options['B'] ?? $options['b'] ?? '')),
            'C' => trim((string) ($options['C'] ?? $options['c'] ?? '')),
            'D' => trim((string) ($options['D'] ?? $options['d'] ?? '')),
        ];

        return in_array('', $normalized, true) ? null : $normalized;
    }

    protected function normalizeCorrectAnswer(mixed $correctAnswer, array $options): ?string
    {
        $correctAnswer = strtoupper(trim((string) $correctAnswer));

        if (in_array($correctAnswer, ['A', 'B', 'C', 'D'], true)) {
            return $correctAnswer;
        }

        if (in_array($correctAnswer, ['1', '2', '3', '4'], true)) {
            return ['1' => 'A', '2' => 'B', '3' => 'C', '4' => 'D'][$correctAnswer];
        }

        foreach ($options as $key => $value) {
            if (mb_strtolower(trim((string) $value)) === mb_strtolower(trim((string) $correctAnswer))) {
                return $key;
            }
        }

        return null;
    }

    protected function hasDuplicateOptions(array $options): bool
    {
        $normalized = array_map(
            fn($value) => mb_strtolower(trim((string) $value)),
            $options
        );

        return count($normalized) !== count(array_unique($normalized));
    }

    protected function cleanText(string $text, int $limit = 1800): string
    {
        $text = preg_replace('/<[^>]+>/', ' ', $text) ?? $text;
        $text = preg_replace('/\s+/', ' ', $text) ?? $text;
        $text = trim($text);

        return mb_substr($text, 0, $limit);
    }

    protected function removeThinkBlocks(string $text): string
    {
        return trim((string) preg_replace('/<think>.*?<\/think>/is', '', $text));
    }

    protected function normalizeText(string $text): string
    {
        $text = mb_strtolower(trim($text));
        $text = preg_replace('/[^a-z0-9\s]/iu', '', $text) ?? $text;
        $text = preg_replace('/\s+/', ' ', $text) ?? $text;
        return trim($text);
    }

    protected function uniqueKeepOrder(array $items): array
    {
        $result = [];
        $seen = [];

        foreach ($items as $item) {
            $item = trim((string) $item);
            $key = $this->normalizeText($item);

            if ($key === '' || isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $result[] = $item;
        }

        return $result;
    }

    protected function normalizeDifficulty(string $difficulty): string
    {
        $difficulty = strtolower(trim($difficulty));

        return match ($difficulty) {
            'easy', 'medium', 'hard' => $difficulty,
            'difficult' => 'hard',
            default => 'medium',
        };
    }

    protected function normalizeQualityMode(string $qualityMode): string
    {
        $qualityMode = strtolower(trim($qualityMode));

        return $qualityMode === 'higher_quality' ? 'higher_quality' : 'fast';
    }
}
