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

    'quiz_api' => [
        'url' => env('QUIZ_API_URL'),
        'key' => env('QUIZ_API_KEY'),
        'model' => env('QUIZ_API_MODEL'),
        'timeout' => (int) env('QUIZ_API_TIMEOUT', 120),
    ],

    'ai_tutor' => [
        'url' => env('AI_TUTOR_URL', 'http://127.0.0.1:8001'),

        'upload_endpoint' => env('AI_TUTOR_UPLOAD_ENDPOINT', '/upload/'),
        'mcq_endpoint' => env('AI_TUTOR_MCQ_ENDPOINT', '/generate-quiz/'),
        'true_false_endpoint' => env('AI_TUTOR_TRUE_FALSE_ENDPOINT', '/api/quiz/true-false'),
        'fill_blank_endpoint' => env('AI_TUTOR_FILL_BLANK_ENDPOINT', '/api/quiz/fill-blank'),

        'timeout' => (int) env('AI_TUTOR_TIMEOUT', 700),
    ],
];
