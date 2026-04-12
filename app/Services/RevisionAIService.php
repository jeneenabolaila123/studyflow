<?php

namespace App\Services;

class RevisionAIService
{
    protected OllamaClientService $api;

    public function __construct(?OllamaClientService $api = null)
    {
        $this->api = $api ?: new OllamaClientService(
            env('OLLAMA_URL', 'http://127.0.0.1:11434'),
            'qwen3:1.7b',
            40
        );
    }

    public function generateRevisionQuestion(array $question): array
    {
        $questionText = trim((string)($question['question_text'] ?? $question['question'] ?? ''));
        $options = $question['options'] ?? [];
        $correctIndex = (int)($question['correct_answer_index'] ?? $question['correct_index'] ?? 0);

        if ($questionText === '') {
            throw new \InvalidArgumentException('Invalid question');
        }

        $correct = $options[$correctIndex] ?? ($options[0] ?? 'Correct answer');

        $prompt = <<<PROMPT
Rewrite this question clearly.

Question:
{$questionText}

Correct answer:
{$correct}

Create 4 clear multiple choice options.
ONLY ONE correct answer.

Rules:
- Do NOT write "Unknown"
- Do NOT leave empty answers
- Options must be meaningful
- Keep answer short

Format EXACTLY:

Q: question here
- option 1
- option 2
- option 3
- option 4
Correct: correct option text
PROMPT;

        try {
            $text = $this->api->generateText($prompt);
            [$newQ, $newOptions, $newCorrectIndex] = $this->parse($text, $questionText);

            return [
                'question_text' => $newQ,
                'options' => $newOptions,
                'correct_answer_index' => $newCorrectIndex,
                'type' => 'multiple_choice',
            ];
        } catch (\Throwable $e) {
            return $this->fallback($questionText, $correct);
        }
    }

    protected function parse(string $text, string $originalQuestionText): array
    {
        $lines = preg_split("/\r\n|\n|\r/", trim($text)) ?: [];

        $newQ = '';
        $options = [];
        $correctIndex = 0;
        $correctText = '';

        foreach ($lines as $line) {
            $line = trim($line);

            if (stripos($line, 'Q:') === 0) {
                $newQ = trim(substr($line, 2));
            } elseif (str_starts_with($line, '-')) {
                $options[] = trim(substr($line, 1));
            } elseif (stripos($line, 'Correct:') === 0) {
                $correctText = trim(substr($line, 8));
            }
        }

        if ($correctText !== '') {
            foreach ($options as $i => $opt) {
                if (mb_strtolower(trim($opt)) === mb_strtolower($correctText)) {
                    $correctIndex = $i;
                    break;
                }
            }
        }

        if ($newQ === '') {
            $newQ = $originalQuestionText;
        }

        while (count($options) < 4) {
            $options[] = 'Option';
        }

        return [$newQ, array_slice($options, 0, 4), $correctIndex];
    }

    protected function fallback(string $questionText, string $correct): array
    {
        return [
            'question_text' => $questionText,
            'options' => [$correct, 'Option B', 'Option C', 'Option D'],
            'correct_answer_index' => 0,
            'type' => 'multiple_choice',
        ];
    }
}
