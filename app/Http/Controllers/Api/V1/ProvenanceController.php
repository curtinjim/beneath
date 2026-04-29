<?php
namespace App\Http\Controllers\Api\V1;

use App\Models\BehaviouralEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class ProvenanceController extends Controller
{
    public function show(Request $request, string $id): JsonResponse
    {
        $event = BehaviouralEvent::findOrFail($id);

        $source = null;
        if ($event->source_type && $event->source_id) {
            $raw = match($event->source_type) {
                'signal' => DB::table('harvesting_signals')
                    ->where('id', $event->source_id)
                    ->select('id', 'signal_type', 'summary', 'confidence', 'created_at')
                    ->first(),
                'source' => DB::table('sources')
                    ->where('id', $event->source_id)
                    ->select('id', 'source_type', 'title', 'url', 'created_at')
                    ->first(),
                default => null,
            };

            if ($raw) {
                $source = (array) $raw;
                $source['type'] = $event->source_type;
            }
        }

        $auditEntries = DB::table('audit_log')
            ->leftJoin('users', 'users.id', '=', 'audit_log.user_id')
            ->where('audit_log.entity_type', 'behavioural_event')
            ->where('audit_log.entity_id', $id)
            ->select(
                'audit_log.action',
                'audit_log.metadata',
                'audit_log.created_at',
                'users.name as user_name'
            )
            ->orderByDesc('audit_log.created_at')
            ->limit(20)
            ->get()
            ->map(function ($row) {
                $row->metadata = $row->metadata ? json_decode($row->metadata, true) : null;
                return $row;
            });

        return response()->json([
            'data' => [
                'event'         => $event->only([
                    'id', 'event_type', 'summary', 'content', 'event_date',
                    'reliability_grade', 'source_type', 'source_id', 'pool', 'created_at',
                ]),
                'source'        => $source,
                'audit_entries' => $auditEntries,
            ],
        ]);
    }
}
