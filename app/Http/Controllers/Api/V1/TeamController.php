<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TenantInvitation;
use App\Models\User;
use App\Services\InvitationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    public function __construct(private InvitationService $invitations) {}

    // ── Members ───────────────────────────────────────────────────────────────

    /** GET /api/v1/team/members */
    public function members(Request $request): JsonResponse
    {
        $tenant  = $request->user()->tenant;
        $members = $tenant->users()
            ->select('id', 'name', 'email', 'role', 'status', 'last_active_at', 'created_at')
            ->orderBy('created_at')
            ->get();

        return response()->json($members);
    }

    /** PATCH /api/v1/team/members/{user} */
    public function updateMember(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);
        abort_if($user->tenant_id !== $request->user()->tenant_id, 403);
        abort_if($user->id === $request->user()->id, 422, 'Cannot modify your own role.');

        $data = $request->validate([
            'role'   => 'sometimes|in:owner,admin,member',
            'status' => 'sometimes|in:active,suspended',
        ]);

        $user->update($data);

        return response()->json(['ok' => true]);
    }

    /** DELETE /api/v1/team/members/{user} */
    public function removeMember(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);
        abort_if($user->tenant_id !== $request->user()->tenant_id, 403);
        abort_if($user->id === $request->user()->id, 422, 'Cannot remove yourself.');
        abort_if($user->role === 'owner', 422, 'Cannot remove the owner.');

        $user->update(['status' => 'suspended']);

        return response()->json(['ok' => true]);
    }

    // ── Invitations ───────────────────────────────────────────────────────────

    /** GET /api/v1/team/invitations */
    public function invitationsList(Request $request): JsonResponse
    {
        $list = $request->user()->tenant
            ->invitations()
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->with('inviter:id,name')
            ->orderByDesc('created_at')
            ->get(['id', 'email', 'role', 'expires_at', 'invited_by', 'created_at']);

        return response()->json($list);
    }

    /** POST /api/v1/team/invitations */
    public function invite(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'email' => 'required|email',
            'role'  => 'nullable|in:admin,member',
        ]);

        $invitation = $this->invitations->invite(
            $request->user()->tenant,
            $request->user(),
            $data['email'],
            $data['role'] ?? 'member'
        );

        return response()->json($invitation, 201);
    }

    /** DELETE /api/v1/team/invitations/{invitation} */
    public function revokeInvitation(Request $request, TenantInvitation $invitation): JsonResponse
    {
        $this->authorizeAdmin($request);
        abort_if($invitation->tenant_id !== $request->user()->tenant_id, 403);

        $this->invitations->revoke($invitation);

        return response()->json(['ok' => true]);
    }

    // ── Accept (unauthenticated) ──────────────────────────────────────────────

    /** POST /api/v1/invitations/{token}/accept */
    public function accept(Request $request, string $token): JsonResponse
    {
        $data = $request->validate([
            'name'                  => 'required|string|max:120',
            'password'              => 'required|string|min:10|confirmed',
        ]);

        $user  = $this->invitations->accept($token, $data);
        $token = $user->createToken('web')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => ['id' => $user->id, 'name' => $user->name, 'role' => $user->role],
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function authorizeAdmin(Request $request): void
    {
        abort_if(!in_array($request->user()->role, ['owner', 'admin']), 403, 'Admin access required.');
    }
}
