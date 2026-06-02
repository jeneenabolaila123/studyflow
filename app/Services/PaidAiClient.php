<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class PaidAiClient
{
    public function generateSummary(string $content): array
    {
        $content = trim($content);

        if ($content === '') {
            throw new RuntimeException('Empty content. Cannot generate summary.');
        }

        // Keep input safe for API/token limits
        $content = mb_substr($content, 0, 24000);

        $instructions = <<<PROMPT
You are StudyFlow's academic summary assistant.

Use ONLY the provided note/PDF content.
Do not use outside knowledge.

Return ONLY valid JSON with these exact keys:
{
  "main_ideas": [],
  "key_facts": [],
  "important_details": [],
  "exam_revision_notes": []
}

Rules:
- main_ideas should contain 6 to 8 clear bullet points.
- key_facts should contain 8 to 12 useful facts or concepts.
- important_details should contain 10 to 14 detailed bullet points.
- exam_revision_notes should contain 8 to 12 useful exam revision notes.
- Cover all major parts of the provided content, not only the first part.
- Include definitions, methods, examples, sentence types, writing techniques, common faults, and comparison points when they appear in the content.
- Mention important examples from the content when available.
- Include specific examples from the content, such as Arabic words, tables, formulas, word-order patterns, and translation examples when available.
- Keep the language clear for exam revision.
- Include at least 4 to 6 specific examples from the content when examples are available, especially Arabic words, formulas, tables, translations, or word-order patterns.
- Mention important subtopics by name instead of summarizing them generally.
- Do not add markdown.- Mention important subtopics by name instead of summarizing them generally.
- Do not add extra keys.
- Return only valid JSON.
PROMPT;

        $input = "CONTENT:\n" . $content;

        $json = $this->callOpenAiJson($instructions, $input);

        return [
            'main_ideas' => $json['main_ideas'] ?? [],
            'key_facts' => $json['key_facts'] ?? [],
            'important_details' => $json['important_details'] ?? [],
            'exam_revision_notes' => $json['exam_revision_notes'] ?? [],
        ];
    }
    public function answerQuestion(string $content, string $question): array
    {
        $content = trim($content);
        $question = trim($question);

        if ($content === '') {
            throw new RuntimeException('Empty content. Cannot answer question.');
        }

        if ($question === '') {
            throw new RuntimeException('Empty question.');
        }

        // Keep input safe for API/token limits.
        $content = mb_substr($content, 0, 24000);

        $instructions = <<<PROMPT
You are StudyFlow's academic Ask-PDF assistant.

Use ONLY the provided note/PDF content.
Do NOT use outside knowledge.
Do NOT invent facts, examples, definitions, or explanations.

If the answer is not clearly found in the provided content, say:
"The answer is not clearly mentioned in the provided content."

Return ONLY valid JSON with these exact keys:
{
  "answer": "",
  "key_points": []
}

Rules:
- Answer the student's question clearly.
- Keep the answer useful for exam revision.
- Include specific examples from the content when available.
- key_points should contain 3 to 6 short useful points.
- Do not add markdown.
- Do not add extra keys.
- Return only valid JSON.
PROMPT;

        $input = "QUESTION:\n" . $question . "\n\nCONTENT:\n" . $content;

        $json = $this->callOpenAiJson($instructions, $input);

        return [
            'answer' => $json['answer'] ?? '',
            'key_points' => $json['key_points'] ?? [],
        ];
    }
    private function callOpenAiJson(string $instructions, string $input): array
    {
        $apiKey = config('services.ai_api.key');
        $model = config('services.ai_api.model');
        $baseUrl = rtrim(config('services.ai_api.base_url', 'https://openrouter.ai/api/v1'), '/');
        $timeout = (int) config('services.ai_api.timeout', 120);

        if (!$apiKey) {
            throw new \RuntimeException('Missing AI API key.');
        }

        $response = Http::withToken($apiKey)
            ->timeout($timeout)
            ->retry(1, 500)
            ->acceptJson()
            ->withHeaders([
                'HTTP-Referer' => config('app.url', 'http://127.0.0.1:8000'),
                'X-Title' => 'StudyFlow',
            ])
            ->post($baseUrl . '/chat/completions', [
                'model' => $model,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => $instructions,
                    ],
                    [
                        'role' => 'user',
                        'content' => $input,
                    ],
                ],
                'temperature' => 0.1,
                'response_format' => [
                    'type' => 'json_object',
                ],
            ]);

        if ($response->failed()) {
            \Log::error('AI API summary failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new \RuntimeException('AI API request failed.');
        }

        $data = $response->json();

        $text = $data['choices'][0]['message']['content'] ?? '';

        $text = trim((string) $text);

        if ($text === '') {
            \Log::error('AI API returned empty output', ['response' => $data]);
            throw new \RuntimeException('AI API returned empty output.');
        }

        $decoded = json_decode($text, true);

        if (!is_array($decoded)) {
            \Log::error('AI API returned invalid JSON', ['text' => $text]);
            throw new \RuntimeException('AI API returned invalid JSON.');
        }

        return $decoded;
    }
}
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class PaidAiClient
{
    public function summarize(string $text, string $title = 'this note'): string
    {
        $instructions = "You are StudyFlow AI. Summarize the provided study material clearly for exam revision. Use only the provided content. Return sections: Main Idea, Main Topics, Key Facts and Concepts, Important Details, Exam Revision Points.";
        $json = $this->callOpenAiJson($instructions, "Title: {$title}\n\nContent:\n{$text}");
        return $this->extractText($json);
    }

    public function ask(string $context, string $question): string
    {
        $instructions = "You are StudyFlow AI. Answer the student's question using only the provided note content. If the answer is not in the note, say that it is not found in the note.";
        $json = $this->callOpenAiJson($instructions, "Question:\n{$question}\n\nNote content:\n{$context}");
        return $this->extractText($json);
    }

    public function quiz(string $text): array
    {
        $instructions = "Generate exactly 5 MCQs from the provided content. Use only the content. 3 Hard and 2 Medium. Each question has A, B, C, D. Correct answer is one letter only. No All/None/Both. Keep options short. Add a short explanation. Return valid JSON only with key questions.";
        $json = $this->callOpenAiJson($instructions, $text);
        $content = $this->extractText($json);

        $decoded = json_decode($content, true);

        if (json_last_error() === JSON_ERROR_NONE && isset($decoded['questions'])) {
            return $decoded['questions'];
        }

        return [
            [
                'question' => 'Could not parse API quiz response.',
                'options' => ['A' => 'Try again', 'B' => 'Use local AI', 'C' => 'Check API key', 'D' => 'Check content'],
                'correct_answer' => 'A',
                'explanation' => $content,
            ],
        ];
    }

    private function callOpenAiJson(string $instructions, string $input): array
    {
        $apiKey = trim((string) config('services.ai_api.key'));
        $model = config('services.ai_api.model', 'google/gemini-2.5-flash');
        $baseUrl = rtrim(config('services.ai_api.base_url', 'https://openrouter.ai/api/v1'), '/');
        $timeout = (int) config('services.ai_api.timeout', 120);

        if (!$apiKey) {
            throw new RuntimeException('Missing AI API key.');
        }

        $response = Http::timeout($timeout)
            ->withToken($apiKey)
            ->withHeaders([
                'HTTP-Referer' => 'http://localhost:5173',
                'X-Title' => 'StudyFlow',
                'Content-Type' => 'application/json',
            ])
            ->post($baseUrl . '/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'system', 'content' => $instructions],
                    ['role' => 'user', 'content' => $input],
                ],
                'temperature' => 0.2,
            ]);

        if (!$response->successful()) {
            Log::error('AI API request failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new RuntimeException('AI API request failed.');
        }

        return $response->json();
    }

    private function extractText(array $json): string
    {
        return trim(
            $json['choices'][0]['message']['content']
            ?? $json['choices'][0]['text']
            ?? $json['output']
            ?? ''
        );
    }
}