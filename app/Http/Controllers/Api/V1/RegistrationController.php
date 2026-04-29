<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\TenantProvisioningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RegistrationController extends Controller
{
    public function __construct(private TenantProvisioningService $provisioner) {}

    /**
     * POST /api/v1/register
     * Public endpoint — no auth required.
     */
    public function register(Request $request): JsonResponse
    {
        $v = Validator::make($request->all(), [
            'org_name'  => 'required|string|max:120',
            'name'      => 'required|string|max:120',
            'email'     => 'required|email|unique:users,email',
            'password'  => 'required|string|min:10|confirmed',
            'timezone'  => 'nullable|string|max:64',
        ]);

        if ($v->fails()) {
            return response()->json(['errors' => $v->errors()], 422);
        }

        ['tenant' => $tenant, 'user' => $user] = $this->provisioner->provision($v->validated());

        $token = $user->createToken('web')->plainTextToken;

        return response()->json([
            'token'  => $token,
            'user'   => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
            ],
            'tenant' => [
                'id'           => $tenant->id,
                'name'         => $tenant->name,
                'plan'         => $tenant->plan,
                'trial_ends'   => $tenant->trial_ends_at?->toDateString(),
                'onboarding'   => false,
            ],
        ], 201);
    }
}
