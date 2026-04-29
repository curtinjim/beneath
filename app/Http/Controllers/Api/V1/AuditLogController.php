<?php
namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!in_array($user->role, ['owner', 'admin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $q = DB::table('audit_log')
            ->leftJoin('users', 'users.id', '=', 'audit_log.user_id')
            ->where('audit_log.tenant_id', $user->tenant_id)
            ->select(
                'audit_log.id',
                'audit_log.action',
                'audit_log.entity_type',
                'audit_log.entity_id',
                'audit_log.metadata',
                'audit_log.created_at',
                'users.name  as user_name',
                'users.email as user_email'
            )
            ->orderByDesc('audit_log.created_at');

        if ($request->filled('action')) {
            $q->where('audit_log.action', 'like', '%' . $request->action . '%');
        }

        $results = $q->paginate(50);

        $results->getCollection()->transform(function ($row) {
            $row->metadata = $row->metadata ? json_decode($row->metadata, true) : null;
            return $row;
        });

        return response()->json($results);
    }
}
