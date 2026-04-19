<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class QuizController extends Controller
{
    public function generate(Request $request)
    {
        $validated = $request->validate([
            'note_id' => ['required', 'integer', 'exists:notes,id'],
            'count'   => ['nullable', 'integer', 'min:1', 'max:20'],
            'difficulty' => ['nullable', 'string'],
            'previous_questions' => ['nullable', 'array'],
            'used_topics' => ['nullable', 'array'],
        ]);

        $count = (int) ($validated['count'] ?? 3);
        $difficulty = trim($validated['difficulty'] ?? 'hard');
        $previousQuestions = $validated['previous_questions'] ?? [];
        $usedTopics = $validated['used_topics'] ?? [];

        $note = Note::findOrFail($validated['note_id']);

        $text = $this->extractNoteText($note);

        if (!$text) {
            return response()->json([
                'message' => 'No note text found to generate quiz from.',
            ], 422);
        }

        $prompt = $this->buildQuizPrompt($text, $count, $difficulty, $previousQuestions, $usedTopics);

        try {
            $response = Http::timeout(180)
                ->acceptJson()
                ->post('http://127.0.0.1:11434/api/generate', [
                    'model' => 'qwen3:1.7b',
                    'prompt' => $prompt,
                    'stream' => false,
                ]);

            if (!$response->successful()) {
                return response()->json([
                    'message' => 'Ollama request failed.',
                    'details' => $response->body(),
                ], 500);
            }

            $raw = trim((string) data_get($response->json(), 'response', ''));
            $questions = $this->parseQuizOutput($raw);

            // Deduplication layer
            if (!empty($previousQuestions)) {
                $questions = array_filter($questions, function ($q) use ($previousQuestions) {
                    $qTextLower = strtolower(trim($q['question']));
                    foreach ($previousQuestions as $prev) {
                        $prevLower = strtolower(trim($prev));
                        similar_text($qTextLower, $prevLower, $perc);
                        if ($prevLower === $qTextLower || $perc > 80) {
                            return false;
                        }
                    }
                    return true;
                });
                $questions = array_values($questions);
            }

            if (empty($questions)) {
                return response()->json([
                    'message' => 'Failed to parse generated quiz.',
                    'raw_output' => $raw,
                ], 500);
            }

            return response()->json([
                'message' => 'Quiz generated successfully.',
                'data' => [
                    'note_id' => $note->id,
                    'note_title' => $note->title ?? ('Note #' . $note->id),
                    'count' => count($questions),
                    'questions' => $questions,
                    'raw_output' => $raw,
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Quiz generation failed.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function extractNoteText(Note $note): string
    {
        $candidates = [
            $note->text_content ?? null,
            $note->content ?? null,
            $note->summary ?? null,
            $note->body ?? null,
        ];

        foreach ($candidates as $value) {
            if (is_string($value) && trim($value) !== '') {
                return $this->cleanText($value);
            }
        }

        return '';
    }

    private function cleanText(string $text): string
    {
        $text = strip_tags($text);
        $text = preg_replace('/\R+/', "\n", $text);
        $text = preg_replace('/[ \t]+/', ' ', $text);
        $text = trim($text);

        if (Str::length($text) > 12000) {
            $text = Str::substr($text, 0, 12000);
        }

        return $text;
    }

    private function buildQuizPrompt(string $text, int $count, string $difficulty, array $previousQuestions = [], array $usedTopics = []): string
    {
        $avoidInstruction = "";
        if (!empty($previousQuestions)) {
            $avoidInstruction .= "\nDo NOT repeat or closely rephrase any of these previous questions:\n";
            foreach ($previousQuestions as $pq) {
                $avoidInstruction .= "- " . str_replace("\n", " ", $pq) . "\n";
            }
        }
        if (!empty($usedTopics)) {
            $avoidInstruction .= "\nAvoid focusing heavily on these already covered topics:\n";
            foreach (array_unique($usedTopics) as $ut) {
                $avoidInstruction .= "- " . $ut . "\n";
            }
            $avoidInstruction .= "Generate entirely NEW concepts that haven't been tested yet.\n";
        }

        return <<<PROMPT
You are a strict university professor creating exam-quality MCQs.

Generate exactly {$count} {$difficulty} multiple-choice questions based only on the text below.
{$avoidInstruction}
Rules:
- Each question must test understanding, not copying
- Each question must focus on a different concept
- Keep the questions clear and concise
- Include a short topic label for each question
- Each question must have exactly 4 options: A, B, C, D
- Only one option is correct
- No explanations
- No extra text
- Start directly with Q1
- End at Q{$count}

Strict format:

Q1: question text
Topic: topic name
A) option
B) option
C) option
D) option
Correct: A

Q2: question text
Topic: topic name
A) option
B) option
C) option
D) option
Correct: B

Repeat until Q{$count}.

TEXT:
\"\"\"
{$text}
\"\"\"
PROMPT;
    }

    private function parseQuizOutput(string $raw): array
    {
        $raw = $this->keepOnlyQuizOutput($raw);

        $pattern = '/Q\d+:\s*(.*?)\n'
            . 'Topic:\s*(.*?)\n'
            . 'A\)\s*(.*?)\n'
            . 'B\)\s*(.*?)\n'
            . 'C\)\s*(.*?)\n'
            . 'D\)\s*(.*?)\n'
            . 'Correct:\s*([ABCD])/s';

        preg_match_all($pattern, $raw, $matches, PREG_SET_ORDER);

        $questions = [];

        foreach ($matches as $match) {
            $questionText = trim($match[1]);
            $topic = trim($match[2]);
            $a = trim($match[3]);
            $b = trim($match[4]);
            $c = trim($match[5]);
            $d = trim($match[6]);
            $correctLetter = trim($match[7]);

            $options = [$a, $b, $c, $d];
            $correctIndex = ord($correctLetter) - ord('A');
            $correctAnswer = $options[$correctIndex] ?? '';

            if (!$questionText || count(array_filter($options)) < 4) {
                continue;
            }

            $questions[] = [
                'topic' => $topic ?: 'General',
                'question' => $questionText,
                'options' => $options,
                'correct_letter' => $correctLetter,
                'correct_index' => $correctIndex,
                'answer' => $correctAnswer,
            ];
        }

        return $questions;
    }

    private function keepOnlyQuizOutput(string $text): string
    {
        $start = strpos($text, 'Q1:');

        if ($start === false) {
            return trim($text);
        }

        return trim(substr($text, $start));
    }
}
