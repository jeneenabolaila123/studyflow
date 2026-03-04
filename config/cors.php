<?php

return [
<<<<<<< HEAD
    'paths' => ['api/*'],
=======

    'paths' => ['api/*', 'sanctum/csrf-cookie'],
>>>>>>> 2f30f7bb1a249b844be9157f2da9601516d21379

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
<<<<<<< HEAD
=======
        'http://localhost:5175',
        'http://127.0.0.1:5175',
>>>>>>> 2f30f7bb1a249b844be9157f2da9601516d21379
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,
<<<<<<< HEAD
=======

>>>>>>> 2f30f7bb1a249b844be9157f2da9601516d21379
];
