<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
class InteractionController extends Controller {
    public function index(string $actorId): JsonResponse { return response()->json(['data'=>[]]); }
    public function store(Request $request, string $actorId): JsonResponse { return response()->json(['data'=>[]],201); }
    public function show(string $id): JsonResponse { return response()->json(['data'=>[]]); }
    public function update(Request $request, string $id): JsonResponse { return response()->json(['data'=>[]]); }
    public function destroy(string $id): JsonResponse { return response()->json(null,204); }
}
