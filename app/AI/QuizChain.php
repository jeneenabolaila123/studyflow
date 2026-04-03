<?php

namespace App\AI;

use Illuminate\Support\Facades\Http;

class QuizChain
{
    
    protected $endpoint = 'http://127.0.0.1:8001/generate';

    public function run($text, $difficulty = "medium", $count = 5)
    {
        if (!$text) {
            return [];
        }

        // تنظيف النص
        $text = strip_tags($text);
        $text = preg_replace('/\s+/', ' ', $text);

        // تقليل النص لتسريع الموديل
        $text = mb_substr($text, 0, 250);

        $prompt = <<<PROMPT
Generate $count multiple choice questions from the following text.

Each question must include:
- question
- 4 options
- correct answer

Return ONLY valid JSON. No explanations.

JSON format:

{
 "questions":[
  {
   "question":"...",
   "options":["A","B","C","D"],
   "answer":"..."
  }
 ]
}

TEXT:
$text
PROMPT;

        try {

            $response = Http::timeout(120)->post($this->endpoint, [
                'prompt' => $prompt
            ]);

            if (!$response->successful()) {
                return [];
            }

            $data = $response->json();
            $result = $data['result'] ?? '';

            // إزالة markdown إذا أضافه الموديل
            $result = str_replace(["```json", "```"], "", $result);

            $decoded = json_decode($result, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return [];
            }

            if (!isset($decoded['questions']) || !is_array($decoded['questions'])) {
                return [];
            }

            return $decoded['questions'];

        } catch (\Throwable $e) {

            return [];
        }
    }
}
