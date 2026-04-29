<?php
namespace App\Http\Controllers\Api\V1\Admin;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
class TenantController extends Controller {
    public function show(Request $request): JsonResponse {
        return response()->json(['data' => $request->user()->tenant]);
    }
    public function update(Request $request): JsonResponse {
        $tenant = $request->user()->tenant;
        if ($request->has('settings')) {
            $settings = array_merge($tenant->settings ?? [], $request->input('settings'));
            $tenant->update(['settings' => $settings]);
        }
        return response()->json(['data' => $tenant->fresh()]);
    }
}
