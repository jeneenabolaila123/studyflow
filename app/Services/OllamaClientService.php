<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OllamaClientService
{
    protected string $ollamaUrl;
    protected string $model;
    protected int $timeout;

    public function __construct(
        ?string $ollamaUrl = null,
        ?string $model = null,
        int $timeout = 40
    ) {
        $this->ollamaUrl = rtrim($ollamaUrl ?: env('OLLAMA_URL', 'http://127.0.0.1:11434'), '/');
        $this->model = $model ?: env('OLLAMA_MODEL', 'qwen3:1.7b');
        $this->timeout = $timeout;
    }

    public function setModel(string $model): void
    {
        if ($model) {
            $this->model = $model;
            Log::info("Model changed to: {$this->model}");
        }
    }

    public function getModelName(): string
    {
        return $this->model;
    }

    public function isServiceAvailable(): bool
    {
        try {
            $res = Http::timeout(2)->get("{$this->ollamaUrl}/api/version");
            return $res->ok();
        } catch (\Throwable $e) {
            Log::error("Ollama unavailable: " . $e->getMessage());
            return false;
        }
    }

    public function generateText(
        string $prompt,
        array $options = [],
        ?string $system = null,
        bool $think = false,
        ?array $format = null
    ): string {

        $systemParts = [];

        if ($system && trim($system) !== '') {
            $systemParts[] = trim($system);
        }

        if ($format) {
            $systemParts[] =
                "Return only valid JSON. No markdown. No explanations.";
        } else {
            $systemParts[] =
                "Return only final answer. No explanations. No markdown.";
        }

        $finalSystem = implode("\n\n", $systemParts);

        $defaultOptions = [
            "temperature" => 0.10,
            "repeat_penalty" => 1.05,
            "top_k" => 10,
            "top_p" => 0.70,
            "num_predict" => 110,
            "num_ctx" => 512,
        ];

        $finalOptions = array_merge($defaultOptions, $options);

        $payload = [
            "model" => $this->model,
            "stream" => false,
            "think" => $think,
            "messages" => [
                [
                    "role" => "system",
                    "content" => $finalSystem,
                ],
                [
                    "role" => "user",
                    "content" => $prompt,
                ],
            ],
            "options" => $finalOptions,
        ];

        if ($format) {
            $payload["format"] = $format;
        }

        try {
            $response = Http::timeout($this->timeout)
                ->post("{$this->ollamaUrl}/api/chat", $payload);

            if (!$response->ok()) {
                Log::error("Ollama error: " . $response->body());
                return "";
            }

            $data = $response->json();

            $content = $this->extractText($data);

            if (!$content) {
                Log::warning("Empty response from Ollama");
                return "";
            }

            Log::info("Ollama response: " . substr($content, 0, 200));

            return trim($content);
        } catch (\Throwable $e) {
            Log::error("Ollama exception: " . $e->getMessage());
            return "";
        }
    }

    protected function extractText(array $data): string
    {
        if (isset($data['message']['content'])) {
            return trim((string)$data['message']['content']);
        }

        if (isset($data['response'])) {
            return trim((string)$data['response']);
        }

        if (isset($data['choices'][0]['message']['content'])) {
            return trim((string)$data['choices'][0]['message']['content']);
        }

        return "";
    }
}
