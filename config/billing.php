<?php

return [
    'stripe_secret'          => env('STRIPE_SECRET_KEY'),
    'stripe_publishable_key' => env('STRIPE_PUBLISHABLE_KEY'),
    'stripe_webhook_secret'  => env('STRIPE_WEBHOOK_SECRET'),

    // Stripe Price IDs — set these after creating prices in Stripe dashboard
    'price_starter'  => env('STRIPE_PRICE_STARTER'),
    'price_growth'   => env('STRIPE_PRICE_GROWTH'),

    // Map price IDs back to plan names (for webhook handling)
    'price_plan_map' => [
        env('STRIPE_PRICE_STARTER') => 'starter',
        env('STRIPE_PRICE_GROWTH')  => 'growth',
    ],
];
