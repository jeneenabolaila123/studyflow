<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiQuizService
{
    private array $models = [

        'qwen:0.5b',

    ];

    public function generateQuiz(string $prompt): ?array
    {
        foreach ($this->models as $model) {

            $result = $this->runModel($model, $prompt);

            if ($result) {
                return $result;
            }
        }

        return null;
    }

    private function runModel(string $model, string $prompt): ?array
    {
        try {

            Log::info("Running AI model", ['model' => $model]);

            $response = Http::timeout(180)
                ->connectTimeout(10)
                ->retry(2, 2000)
                ->post('http://127.0.0.1:11434/api/generate', [
                    "model" => $model,
                    "prompt" => $prompt,
                    "stream" => false,
                    "options" => [
                        "temperature" => 0.1,
                        "num_predict" => 60,
                        "top_p" => 0.9,
                        "repeat_penalty" => 1.1,
                        "num_ctx" => 1024
                    ]
                ]);

            if (!$response->ok()) {
                return null;
            }

            $body = $response->json();

            if (!isset($body["response"])) {
                return null;
            }

            return $this->parseQuiz($body["response"]);

        } catch (\Exception $e) {

            Log::error("AI model error", [
                "model" => $model,
                "error" => $e->getMessage()
            ]);

            return null;
        }
    }

    private function parseQuiz(string $text): ?array
    {
        preg_match('/\{(?:[^{}]|(?R))*\}/', $text, $matches);

        if (!$matches) {
            return null;
        }

        $json = json_decode($matches[0], true);

        if (!$json) {
            return null;
        }

        if (!isset($json["questions"])) {
            return null;
        }

        return $json["questions"];
    }
}
