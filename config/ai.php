<?php
return [
    'provider'           => env('AI_PROVIDER', 'anthropic'),
    'anthropic_api_key'  => env('ANTHROPIC_API_KEY', ''),
    'anthropic_model'    => env('ANTHROPIC_MODEL', 'claude-sonnet-4-5-20251001'),
    'ollama_host'        => env('OLLAMA_HOST', 'http://localhost:11434'),
    'ollama_model'       => env('OLLAMA_MODEL', 'mistral-nemo'),
    'openai_api_key'     => env('OPENAI_API_KEY', ''),
    'openai_model'       => env('OPENAI_MODEL', 'gpt-4o'),
];
