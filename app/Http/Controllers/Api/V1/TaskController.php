<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
class TaskController extends Controller {
    public function index(string $actorId): JsonResponse { return response()->json(['data'=>[]]); }
    public function store(Request $request, string $actorId): JsonResponse { return response()->json(['data'=>[]],201); }
    public function update(Request $request, string $id): JsonResponse { return response()->json(['data'=>[]]); }
}
