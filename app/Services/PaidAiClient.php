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
- Keep the language clear for exam revision.
- Do not add markdown.
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

    public function summarize(string $text, string $title = 'this note'): string
    {
        $result = $this->generateSummary($text);

        return
            "Main Ideas:\n- " . implode("\n- ", $result['main_ideas']) .
            "\n\nKey Facts:\n- " . implode("\n- ", $result['key_facts']) .
            "\n\nImportant Details:\n- " . implode("\n- ", $result['important_details']) .
            "\n\nExam Revision Notes:\n- " . implode("\n- ", $result['exam_revision_notes']);
    }

    public function ask(string $context, string $question): string
    {
        $result = $this->answerQuestion($context, $question);

        $answer = $result['answer'] ?? '';
        $points = $result['key_points'] ?? [];

        if (!empty($points)) {
            $answer .= "\n\nKey Points:\n- " . implode("\n- ", $points);
        }

        return $answer;
    }

    public function quiz(string $text): array
    {
        $text = trim($text);

        if ($text === '') {
            throw new RuntimeException('Empty content. Cannot generate quiz.');
        }

        $text = mb_substr($text, 0, 24000);

        $instructions = <<<PROMPT
Generate exactly 5 MCQs from the uploaded PDF/content.

Requirements:
- 3 Hard + 2 Medium.
- Use only provided content.
- Each question has A, B, C, D.
- Correct answer is one letter only.
- No All/None/Both of the above.
- Keep options short.
- Avoid headings and copied long sentences.
- Add a short explanation.
- Return ONLY valid JSON with this exact structure:
{
  "questions": [
    {
      "difficulty": "Hard",
      "question": "",
      "options": {
        "A": "",
        "B": "",
        "C": "",
        "D": ""
      },
      "correct_answer": "A",
      "explanation": ""
    }
  ]
}
PROMPT;

        $json = $this->callOpenAiJson($instructions, $text);

        return $json['questions'] ?? [];
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

        $response = Http::withToken($apiKey)
            ->timeout($timeout)
            ->retry(1, 500)
            ->acceptJson()
            ->withHeaders([
                'HTTP-Referer' => config('app.url', 'http://127.0.0.1:8000'),
                'X-Title' => 'StudyFlow',
                'Content-Type' => 'application/json',
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
            Log::error('AI API request failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new RuntimeException('AI API request failed.');
        }

        $data = $response->json();

        $text = trim((string) (
            $data['choices'][0]['message']['content']
            ?? $data['choices'][0]['text']
            ?? $data['output']
            ?? ''
        ));

        if ($text === '') {
            Log::error('AI API returned empty output', ['response' => $data]);
            throw new RuntimeException('AI API returned empty output.');
        }

        $decoded = json_decode($text, true);

        if (!is_array($decoded)) {
            Log::error('AI API returned invalid JSON', ['text' => $text]);
            throw new RuntimeException('AI API returned invalid JSON.');
        }

        return $decoded;
    }
}
