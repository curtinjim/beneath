<?php
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: '/home2/ivykqymy/public_html/beneath')
    ->withRouting(
        web: '/home2/ivykqymy/public_html/beneath/routes/web.php',
        api: '/home2/ivykqymy/public_html/beneath/routes/api.php',
        commands: '/home2/ivykqymy/public_html/beneath/routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->api(prepend: [
            \App\Http\Middleware\ForceJsonResponse::class,
        ]);
        $middleware->api(append: [
            \App\Http\Middleware\EnsureTenantActive::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            return response()->json(['error'=>['code'=>'unauthenticated','message'=>'Unauthenticated.']], 401);
        });
        $exceptions->render(function (ValidationException $e, Request $request) {
            return response()->json(['error'=>['code'=>'validation_failed','message'=>'Validation failed.','errors'=>$e->errors()]], 422);
        });
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            return response()->json(['error'=>['code'=>'not_found','message'=>'Resource not found.']], 404);
        });
    })->create();
