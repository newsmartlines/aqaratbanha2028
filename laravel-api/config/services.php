<?php

return [
    'mailgun' => [
        'domain'   => env('MAILGUN_DOMAIN'),
        'secret'   => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme'   => 'https',
    ],

    'ses' => [
        'key'    => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'stcpay' => [
        'merchant_id' => env('STCPAY_MERCHANT_ID'),
        'api_key'     => env('STCPAY_API_KEY'),
        'base_url'    => env('STCPAY_BASE_URL', 'https://api.stcpay.com.sa'),
        'test_mode'   => env('STCPAY_TEST_MODE', true),
        'return_url'  => env('STCPAY_RETURN_URL'),
    ],
];
