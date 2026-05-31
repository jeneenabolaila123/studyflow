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
        $content = mb_substr($content, 0, 18000);

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
- Each array should contain 3 to 6 short useful bullet points.
- Keep the language clear for exam revision.
- Do not add markdown.
- Do not add extra keys.
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
