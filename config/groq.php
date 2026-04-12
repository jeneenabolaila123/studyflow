<?php

return [
    /**
     * Groq API Configuration
     * 
     * Get your API key from: https://console.groq.com
     */
    'groq' => [
        'api_key' => env('GROQ_API_KEY'),
        'model' => env('GROQ_MODEL', 'mixtral-8x7b-32768'),
        'endpoint' => env('GROQ_ENDPOINT', 'https://api.groq.com/openai/v1/chat/completions'),
    ],

    /**
     * AI Service Configuration
     */
    'ai' => [
        // Maximum characters to process in one request
        'max_text_length' => env('AI_MAX_TEXT_LENGTH', 12000),

        // Maximum tokens for responses
        'max_tokens' => env('AI_MAX_TOKENS', 1000),

        // API timeout in seconds
        'timeout' => env('AI_TIMEOUT', 60),

        // Temperature for responses (0-2, 0 = deterministic, 2 = more creative)
        'temperature' => env('AI_TEMPERATURE', 0.7),

        // Keep last N messages for context in chat
        'context_message_limit' => env('AI_CONTEXT_MESSAGES', 10),
    ],
];
