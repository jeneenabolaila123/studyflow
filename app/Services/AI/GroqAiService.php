<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * GroqAiService - Handles all AI operations using Groq API
 * 
 * Features:
 * - Text summarization with multiple formats
 * - Multi-message chatbot with context awareness
 * - MCQ quiz generation with structured JSON output
 * - Automatic text chunking for large documents
 * - Error handling and token optimization
 */
class GroqAiService
{
    private const MAX_TEXT_LENGTH = 12000; // Characters limit to avoid token overflow
    private const GROQ_API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
    private const MODEL = 'mixtral-8x7b-32768'; // Changed from llama-2 to mixtral for better quality
    private const MAX_TOKENS = 1000;

    public function __construct()
    {
        $this->apiKey = config('services.groq.api_key');

        if (!$this->apiKey) {
            throw new RuntimeException('Groq API key not configured. Add GROQ_API_KEY to .env');
        }
    }

    /**
     * Summarize text in different formats
     * 
     * @param string $text The text to summarize
     * @param string $format Format: 'bullet_points', 'paragraph', or 'detailed'
     * @return array Summary with metadata
     */
    public function summarize(string $text, string $format = 'paragraph'): array
    {
        $text = $this->limitText($text, self::MAX_TEXT_LENGTH);

        $prompt = match ($format) {
            'bullet_points' => $this->summarizeAseBulletPoints($text),
            'detailed' => $this->summarizeDetailed($text),
            default => $this->summarizeAsParagraph($text),
        };

        $response = $this->callGroqApi([
            [
                'role' => 'system',
                'content' => 'You are a concise academic summarizer. Create clear, informative summaries.'
            ],
            [
                'role' => 'user',
                'content' => $prompt
            ]
        ]);

        return [
            'summary' => trim($response['content'] ?? ''),
            'format' => $format,
            'model' => self::MODEL,
            'input_length' => strlen($text),
        ];
    }

    /**
     * Generate MCQ quiz in JSON format
     * 
     * @param string $text The text to generate quiz from
     * @return array Array of quiz questions in JSON format
     */
    public function generateQuiz(string $text): array
    {
        $text = $this->limitText($text, self::MAX_TEXT_LENGTH);

        $prompt = <<<PROMPT
You are an expert educational content creator. Generate 5 multiple-choice quiz questions based ONLY on the provided text.

IMPORTANT: Return ONLY valid JSON, no markdown, no explanations.

Format EXACTLY like this (valid JSON):
{
  "questions": [
    {
      "id": 1,
      "question": "What is...?",
      "options": [
        {"letter": "A", "text": "Option A text"},
        {"letter": "B", "text": "Option B text"},
        {"letter": "C", "text": "Option C text"},
        {"letter": "D", "text": "Option D text"}
      ],
      "correct_answer": "B"
    }
  ]
}

TEXT TO CREATE QUIZ FROM:
{$text}
PROMPT;

        $response = $this->callGroqApi([
            [
                'role' => 'system',
                'content' => 'You are an expert quiz creator. Return only valid JSON.'
            ],
            [
                'role' => 'user',
                'content' => $prompt
            ]
        ]);

        $content = trim($response['content'] ?? '');

        // Extract JSON from response (handle markdown code blocks)
        if (str_contains($content, '```json')) {
            $content = str_replace('```json', '', $content);
            $content = str_replace('```', '', $content);
        } elseif (str_contains($content, '```')) {
            $content = str_replace('```', '', $content);
        }

        $content = trim($content);

        try {
            $decoded = json_decode($content, true);

            if (!isset($decoded['questions']) || !is_array($decoded['questions'])) {
                throw new RuntimeException('Invalid quiz format');
            }

            return $decoded['questions'];
        } catch (\Throwable $e) {
            throw new RuntimeException('Failed to parse quiz response: ' . $e->getMessage());
        }
    }

    /**
     * Generate chat response with context awareness
     * 
     * @param array $messages Array of messages with format: [['role' => 'user'|'assistant', 'content' => '...'], ...]
     * @param string $context Optional context/material to base response on
     * @return string Assistant's response
     */
    public function chat(array $messages, string $context = ''): string
    {
        if (empty($messages)) {
            throw new RuntimeException('No messages provided');
        }

        // Limit context to prevent token overflow
        $context = $this->limitText($context, self::MAX_TEXT_LENGTH);

        // Build system message with context
        $systemContent = 'You are a helpful academic assistant. ';

        if (!empty($context)) {
            $systemContent .= "Use the following material to answer questions:\n\n{$context}\n\n";
            $systemContent .= 'If the answer is not in the material, say so clearly.';
        }

        // Add system message to beginning of conversation
        $conversationMessages = [
            [
                'role' => 'system',
                'content' => $systemContent
            ]
        ];

        // Add user messages (limit history to last 10 messages to avoid token overflow)
        $recentMessages = array_slice($messages, -10);
        $conversationMessages = array_merge($conversationMessages, $recentMessages);

        $response = $this->callGroqApi($conversationMessages);

        return trim($response['content'] ?? '');
    }

    /**
     * Call Groq API with messages
     * 
     * @param array $messages Chat messages
     * @return array Response with 'content' key
     */
    private function callGroqApi(array $messages): array
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->apiKey}",
                'Content-Type' => 'application/json',
            ])->timeout(60)->post(self::GROQ_API_ENDPOINT, [
                'model' => self::MODEL,
                'messages' => $messages,
                'max_tokens' => self::MAX_TOKENS,
                'temperature' => 0.7,
            ]);

            if (!$response->successful()) {
                $error = $response->json('error.message') ?? $response->body();
                throw new RuntimeException("Groq API error: {$error}");
            }

            $choice = $response->json('choices.0');

            if (!$choice) {
                throw new RuntimeException('No response from Groq API');
            }

            return [
                'content' => $choice['message']['content'] ?? '',
                'finish_reason' => $choice['finish_reason'] ?? 'stop',
            ];
        } catch (\Exception $e) {
            throw new RuntimeException("Failed to call Groq API: " . $e->getMessage());
        }
    }

    /**
     * Limit text to maximum length
     */
    private function limitText(string $text, int $maxLength): string
    {
        if (strlen($text) <= $maxLength) {
            return $text;
        }

        return substr($text, 0, $maxLength) . '...';
    }

    /**
     * Prompt for bullet point summary
     */
    private function summarizeAseBulletPoints(string $text): string
    {
        return <<<PROMPT
Summarize the following text in 5-7 key bullet points. Be concise and capture the main ideas:

{$text}
PROMPT;
    }

    /**
     * Prompt for paragraph summary
     */
    private function summarizeAsParagraph(string $text): string
    {
        return <<<PROMPT
Write a clear, concise summary of the following text in 2-3 paragraphs:

{$text}
PROMPT;
    }

    /**
     * Prompt for detailed summary
     */
    private function summarizeDetailed(string $text): string
    {
        return <<<PROMPT
Provide a detailed summary of the following text. Cover all main points and important details:

{$text}
PROMPT;
    }
}
