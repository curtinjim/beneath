<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectMembership;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
class ProjectMembershipController extends Controller {
    public function index(string $projectId): JsonResponse {
        Project::findOrFail($projectId);
        $members = ProjectMembership::with('user')
            ->where('project_id', $projectId)
            ->whereNull('revoked_at')
            ->get();
        return response()->json(['data' => $members]);
    }
    public function store(Request $request, string $projectId): JsonResponse {
        $request->validate([
            'user_id'     => 'required|integer',
            'member_role' => 'required|in:analyst,reviewer',
        ]);
        Project::findOrFail($projectId);
        $membership = ProjectMembership::create([
            'project_id'  => $projectId,
            'user_id'     => $request->user_id,
            'member_role' => $request->member_role,
            'granted_by'  => $request->user()->id,
            'granted_at'  => now(),
        ]);
        return response()->json(['data' => $membership], 201);
    }
    public function destroy(string $projectId, string $userId): JsonResponse {
        $membership = ProjectMembership::where('project_id', $projectId)
            ->where('user_id', $userId)
            ->whereNull('revoked_at')
            ->firstOrFail();
        $membership->update(['revoked_at' => now()]);
        return response()->json(null, 204);
    }
}
