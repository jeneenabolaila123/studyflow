<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

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
        string $defaultDifficulty = 'easy',
        int $defaultQuestionCount = 5
    ) {
        $this->ollamaUrl = $ollamaUrl ?: env('OLLAMA_URL', 'http://127.0.0.1:11434');
        $this->modelName = $modelName ?: env('OLLAMA_MODEL', 'qwen3:1.7b');
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

    public function generateQuestions(
        string $text,
        bool $includeMultipleChoice = true,
        bool $includeTrueFalse = true,
        bool $includeShortAnswer = true,
        ?string $modelName = null,
        string $qualityMode = 'fast',
        ?string $difficulty = null,
        ?int $questionCount = null
    ): array {
        if (!$includeMultipleChoice && !$includeTrueFalse && !$includeShortAnswer) {
            throw new \InvalidArgumentException('No question types selected');
        }

        if (trim($text) === '') {
            throw new \InvalidArgumentException('Empty text');
        }

        $difficulty = $this->normalizeDifficulty($difficulty ?: $this->defaultDifficulty);
        $qualityMode = $this->normalizeQualityMode($qualityMode ?: $this->defaultQualityMode);
        $questionCount = max(1, (int)($questionCount ?: $this->defaultQuestionCount));

        if ($modelName) {
            $this->setModel($modelName);
        }

        $sourceText = $this->prepareGenerationSource($text, $difficulty);

        $prompt = $this->buildPrompt(
            text: $sourceText,
            questionCount: $questionCount,
            difficulty: $difficulty,
            qualityMode: $qualityMode
        );

        $options = $this->qualityProfile($qualityMode, $difficulty, $questionCount);

        $responseText = $this->callModel($prompt, $options);

        $questions = $this->parseQuestions($responseText);

        $questions = $this->filterUniqueQuestions($questions, $sourceText);

        if (count($questions) < $questionCount) {
            $fallback = $this->buildFallbackQuestions($sourceText, $questionCount - count($questions), $difficulty);

            foreach ($fallback as $q) {
                if (count($questions) >= $questionCount) {
                    break;
                }

                if (!$this->isDuplicateQuestion($q['question'], $questions)) {
                    $questions[] = $q;
                }
            }
        }

        if (empty($questions)) {
            throw new \RuntimeException('No questions generated');
        }

        return array_slice($questions, 0, $questionCount);
    }

    protected function buildPrompt(
        string $text,
        int $questionCount,
        string $difficulty = 'easy',
        string $qualityMode = 'fast'
    ): string {
        $difficultyRules = match ($difficulty) {
            'medium' => "- Use medium difficulty\n- Ask about meaning, relation, reason, result, or simple inference\n- Avoid very obvious copied facts",
            'difficult' => "- Use difficult difficulty\n- Prefer inference, comparison, cause, effect, purpose, implication",
            default => "- Use easy difficulty\n- Keep the questions straightforward\n- Mix direct fact, identification, and basic understanding",
        };

        $qualityRules = $qualityMode === 'higher_quality'
            ? "- Make wording polished and natural\n- Cover different ideas\n- Make distractors believable"
            : "- Keep wording concise\n- Prefer short questions and short options";

        return <<<PROMPT
/no_think

Generate exactly {$questionCount} multiple choice questions from the text.

Difficulty:
{$difficultyRules}

Quality:
{$qualityRules}

Rules:
- Use only information supported by the text
- Cover different ideas
- Do not ask "according to the text"
- Do not copy full sentences from the text
- Use exactly 4 options
- Only 1 correct answer
- No explanation
- No markdown
- Output only in this format

Format:
Q: question
A) option
B) option
C) option
D) option
Correct: A

Text:
{$text}
PROMPT;
    }

    protected function callModel(string $prompt, array $options = []): string
    {
        $started = microtime(true);

        try {
            $response = Http::timeout(180)
                ->connectTimeout(10)
                ->retry(2, 2000)
                ->post($this->ollamaUrl . '/api/generate', [
                    'model' => $this->modelName,
                    'prompt' => $prompt,
                    'stream' => false,
                    'options' => $options,
                ]);

            if (!$response->ok()) {
                throw new \RuntimeException('Ollama request failed: ' . $response->status());
            }

            $body = $response->json();
            $text = (string)($body['response'] ?? '');

            Log::info('[QUIZ_GEN] response', [
                'model' => $this->modelName,
                'time' => round(microtime(true) - $started, 2),
                'chars' => strlen($text),
                'preview' => mb_substr(str_replace("\n", ' ', $text), 0, 250),
            ]);

            return $text;
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
        if (!empty($jsonQuestions)) {
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

            if (!is_array($decoded)) {
                continue;
            }

            $items = $decoded['questions'] ?? (array_is_list($decoded) ? $decoded : []);

            if (!is_array($items)) {
                continue;
            }

            $questions = [];

            foreach ($items as $item) {
                if (!is_array($item)) {
                    continue;
                }

                $question = trim((string)($item['question'] ?? ''));
                $options = $item['options'] ?? [];
                $correctIndex = $item['correct_index'] ?? $item['correct'] ?? null;

                if (is_array($options) && count($options) === 4 && $question !== '') {
                    $correctIndex = $this->coerceCorrectIndex($correctIndex);

                    if ($correctIndex !== null && $correctIndex >= 0 && $correctIndex <= 3) {
                        $questions[] = [
                            'question' => $question,
                            'options' => array_values(array_map(fn($o) => trim((string)$o), $options)),
                            'correct_index' => $correctIndex,
                            'type' => 'multiple_choice',
                        ];
                    }
                }
            }

            if (!empty($questions)) {
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

        $blocks = preg_split('/\n(?=(?:Q:|Question:|\d+[\).]))/i', $response) ?: [];
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
        $correctIndex = null;

        foreach ($lines as $line) {
            if (preg_match('/^(Q:|Question:|\d+[\).]\s*)/i', $line)) {
                $questionText = trim(preg_replace('/^(Q:|Question:|\d+[\).]\s*)/i', '', $line));
            } elseif (preg_match('/^[A-D][\)\.\:]\s*/', $line)) {
                $options[] = trim(preg_replace('/^[A-D][\)\.\:]\s*/', '', $line));
            } elseif (preg_match('/^Correct(\s+Answer)?:/i', $line)) {
                $value = strtoupper(trim(explode(':', $line, 2)[1] ?? ''));
                $value = str_replace([')', '.', ':'], '', $value);

                if (in_array($value, ['A', 'B', 'C', 'D'], true)) {
                    $correctIndex = ord($value) - ord('A');
                } elseif (in_array($value, ['1', '2', '3', '4'], true)) {
                    $correctIndex = ((int)$value) - 1;
                }
            }
        }

        if ($questionText && count($options) === 4 && $correctIndex !== null) {
            return [
                'question' => $questionText,
                'options' => $options,
                'correct_index' => $correctIndex,
                'type' => 'multiple_choice',
            ];
        }

        return null;
    }

    protected function coerceCorrectIndex(mixed $value): ?int
    {
        if (is_int($value)) {
            return ($value >= 0 && $value <= 3) ? $value : null;
        }

        if ($value === null) {
            return null;
        }

        $value = strtoupper(trim((string)$value));

        if (in_array($value, ['A', 'B', 'C', 'D'], true)) {
            return ord($value) - ord('A');
        }

        if (in_array($value, ['0', '1', '2', '3'], true)) {
            return (int)$value;
        }

        if (in_array($value, ['1', '2', '3', '4'], true)) {
            return ((int)$value) - 1;
        }

        return null;
    }

    protected function filterUniqueQuestions(array $questions, string $sourceText = ''): array
    {
        $unique = [];

        foreach ($questions as $q) {
            if (!$this->isValidQuestion($q, $sourceText)) {
                continue;
            }

            if ($this->isDuplicateQuestion($q['question'], $unique)) {
                continue;
            }

            $unique[] = $q;
        }

        return $unique;
    }

    protected function isValidQuestion(array $question, string $sourceText = ''): bool
    {
        $questionText = trim((string)($question['question'] ?? ''));
        $options = $question['options'] ?? [];
        $correctIndex = $question['correct_index'] ?? null;

        if ($questionText === '' || mb_strlen($questionText) < 8) {
            return false;
        }

        if (!is_array($options) || count($options) !== 4) {
            return false;
        }

        if (!is_int($correctIndex) || $correctIndex < 0 || $correctIndex > 3) {
            return false;
        }

        $normalizedOptions = [];
        foreach ($options as $option) {
            $clean = $this->normalizeText((string)$option);
            if ($clean === '') {
                return false;
            }
            $normalizedOptions[] = $clean;
        }

        if (count(array_unique($normalizedOptions)) < 4) {
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
                'difficult' => 'Which conclusion is best supported by the material?',
                default => 'Which topic appears in the material?',
            };

            $options = [$topic, $distractors[0], $distractors[1], $distractors[2]];
            $correctIndex = $index % 4;

            if ($correctIndex === 1) {
                $options = [$distractors[0], $topic, $distractors[1], $distractors[2]];
            } elseif ($correctIndex === 2) {
                $options = [$distractors[0], $distractors[1], $topic, $distractors[2]];
            } elseif ($correctIndex === 3) {
                $options = [$distractors[0], $distractors[1], $distractors[2], $topic];
            }

            $questions[] = [
                'question' => $stem,
                'options' => $options,
                'correct_index' => $correctIndex,
                'type' => 'multiple_choice',
            ];
        }

        return $questions;
    }

    protected function extractEmergencyTopics(string $text, int $maxItems = 30): array
    {
        $text = $this->cleanText($text, 120000);

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
            $item = trim((string)$item);
            $norm = $this->normalizeText($item);

            if ($norm === '' || $norm === $correctNorm) {
                continue;
            }

            if (!in_array($item, $distractors, true)) {
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
            if ($norm !== $correctNorm && !in_array($item, $distractors, true)) {
                $distractors[] = $item;
            }
        }

        return array_slice($distractors, 0, $maxNeeded);
    }

    protected function prepareGenerationSource(string $text, string $difficulty): string
    {
        $clean = $this->cleanText($text, 120000);

        return match ($difficulty) {
            'difficult' => $this->cleanText($clean, 1250),
            'medium' => $this->cleanText($clean, 760),
            default => $this->cleanText($clean, 900),
        };
    }

    protected function qualityProfile(string $qualityMode, string $difficulty, int $questionCount): array
    {
        if ($qualityMode === 'higher_quality') {
            return [
                'temperature' => 0.68,
                'top_k' => 20,
                'top_p' => 0.80,
                'repeat_penalty' => 1.10,
                'num_predict' => min(340, 36 + (52 * max(1, $questionCount))),
                'num_ctx' => $difficulty === 'difficult' ? 1152 : 896,
            ];
        }

        if ($difficulty === 'medium') {
            return [
                'temperature' => 0.28,
                'top_k' => 8,
                'top_p' => 0.55,
                'repeat_penalty' => 1.12,
                'num_predict' => min(140, 22 + (30 * max(1, $questionCount))),
                'num_ctx' => 512,
            ];
        }

        return [
            'temperature' => 0.18,
            'top_k' => 14,
            'top_p' => 0.74,
            'repeat_penalty' => 1.04,
            'num_predict' => min(220, 22 + (32 * max(1, $questionCount))),
            'num_ctx' => $difficulty === 'difficult' ? 448 : 320,
        ];
    }

    protected function cleanText(string $text, int $limit = 1400): string
    {
        $text = preg_replace('/<[^>]+>/', ' ', $text) ?? $text;
        $text = preg_replace('/\s+/', ' ', $text) ?? $text;
        $text = trim($text);

        return mb_substr($text, 0, $limit);
    }

    protected function removeThinkBlocks(string $text): string
    {
        return trim((string)preg_replace('/<think>.*?<\/think>/is', '', $text));
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
            $item = trim((string)$item);
            $key = $this->normalizeText($item);

            if ($key === '' || isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $result[] = $item;
        }

        return $result;
    }
}
