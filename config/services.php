<?php

return [

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'ollama' => [
        'base_url' => env('OLLAMA_BASE_URL', 'http://127.0.0.1:11434'),
        'model' => env('OLLAMA_MODEL', 'qwen3:1.7b'),
        'timeout' => (int) env('OLLAMA_TIMEOUT', 120),
        'connect_timeout' => (int) env('OLLAMA_CONNECT_TIMEOUT', 10),
        'min_chunk_tokens' => (int) env('OLLAMA_MIN_CHUNK_TOKENS', 2000),
        'max_chunk_tokens' => (int) env('OLLAMA_MAX_CHUNK_TOKENS', 3000),
        'chunk_chars_per_token' => (int) env('OLLAMA_CHUNK_CHARS_PER_TOKEN', 4),
    ],

];
