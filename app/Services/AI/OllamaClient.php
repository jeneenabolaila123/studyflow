<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class OllamaClient
{
    public function generate(string $prompt): string
    {
        $response = Http::baseUrl(rtrim((string) config('services.ollama.base_url'), '/'))
            ->timeout((int) config('services.ollama.timeout', 600))
            ->connectTimeout((int) config('services.ollama.connect_timeout', 10))
            ->retry(2, 500)
            ->post('/api/generate', [
                'model' => config('services.ollama.model', 'phi3:mini'),
                'prompt' => $prompt,
                'stream' => false,
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Ollama request failed: ' . $response->body());
        }

        $text = trim((string) data_get($response->json(), 'response', ''));

        if ($text === '') {
            throw new RuntimeException('Ollama returned an empty response.');
        }

        return $text;
    }
}
