<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\HarvestingSignalResource;
use App\Models\Actor;
use App\Models\BehaviouralEvent;
use App\Models\HarvestingSignal;
use App\Models\HarvestingSourceSuppression;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SignalController extends Controller
{
    /**
     * GET /api/v1/signals
     * Global signal queue — excludes currently snoozed signals.
     */
    public function index(Request $request): JsonResponse
    {
        $query = HarvestingSignal::with('actor:id,display_name,actor_type')
            ->where('status', 'pending')
            ->where(function ($q) {
                $q->whereNull('snoozed_until')->orWhere('snoozed_until', '<=', now());
            });

        if ($request->has('actor_id'))    $query->where('actor_id', $request->actor_id);
        if ($request->has('source_id'))   $query->where('source_id', $request->source_id);
        if ($request->has('signal_type')) $query->where('signal_type', $request->signal_type);
        if ($request->has('confidence'))  $query->where('confidence', $request->confidence);
        if ($request->boolean('team_flagged')) $query->where('team_flagged', true);

        $sort = $request->get('sort', 'significance');
        match ($sort) {
            'reliability_grade' => $query->orderByRaw("FIELD(reliability_grade,'bedrock','rock','sand','mud','fog')")
                                         ->orderByDesc('created_at'),
            'created_at'        => $query->orderByDesc('created_at'),
            default             => $query->orderByRaw("
                CASE
                  WHEN team_flagged = 1            THEN 1
                  WHEN signal_type = 'flag'        THEN 2
                  WHEN signal_type = 'field_value' AND reliability_grade = 'bedrock' AND confidence = 'high' THEN 3
                  WHEN signal_type = 'field_value' AND reliability_grade = 'bedrock' THEN 4
                  WHEN signal_type = 'field_value' THEN 5
                  ELSE 6
                END
            ")->orderByDesc('created_at'),
        };

        $paginated = $query->paginate($request->get('per_page', 50));

        return response()->json([
            'data' => HarvestingSignalResource::collection($paginated->items()),
            'meta' => [
                'total'        => $paginated->total(),
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/v1/signals/{id}/accept
     */
    public function accept(Request $request, string $id): JsonResponse
    {
        $signal = HarvestingSignal::findOrFail($id);
        if ($signal->status !== 'pending') {
            return response()->json(['error' => 'Signal is not pending.'], 422);
        }

        $result = $this->commitSignal($signal, auth()->user(), $signal->proposed_value);
        $this->logAudit('commit', $signal, auth()->id());

        return response()->json(['data' => $result], 200);
    }

    /**
     * POST /api/v1/signals/{id}/accept-edit
     */
    public function acceptEdit(Request $request, string $id): JsonResponse
    {
        $request->validate(['proposed_value' => 'required|string']);
        $signal = HarvestingSignal::findOrFail($id);
        if ($signal->status !== 'pending') {
            return response()->json(['error' => 'Signal is not pending.'], 422);
        }

        $result = $this->commitSignal($signal, auth()->user(), $request->proposed_value);
        $this->logAudit('commit', $signal, auth()->id());

        return response()->json(['data' => $result], 200);
    }

    /**
     * POST /api/v1/signals/{id}/dismiss
     */
    public function dismiss(Request $request, string $id): JsonResponse
    {
        $signal = HarvestingSignal::findOrFail($id);
        if ($signal->status !== 'pending') {
            return response()->json(['error' => 'Signal is not pending.'], 422);
        }

        $signal->update([
            'status'      => 'dismissed',
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
        ]);

        $suppressDays = (int) $request->get('suppress_source_days', 0);
        if ($suppressDays > 0) {
            HarvestingSourceSuppression::updateOrCreate(
                ['actor_id' => $signal->actor_id, 'source_id' => $signal->source_id],
                [
                    'tenant_id'      => $signal->tenant_id,
                    'suppress_until' => now()->addDays($suppressDays),
                ]
            );
        }

        $this->logAudit('dismiss', $signal, auth()->id());

        return response()->json(['data' => ['status' => 'dismissed']]);
    }

    /**
     * POST /api/v1/signals/{id}/snooze
     * Body: { days: 1|3|7|14 }
     * Signal stays pending but is hidden from the queue until snoozed_until passes.
     */
    public function snooze(Request $request, string $id): JsonResponse
    {
        $request->validate(['days' => 'required|integer|min:1|max:90']);
        $signal = HarvestingSignal::findOrFail($id);
        if ($signal->status !== 'pending') {
            return response()->json(['error' => 'Signal is not pending.'], 422);
        }

        $signal->update(['snoozed_until' => now()->addDays($request->days)]);
        $this->logAudit('snooze', $signal, auth()->id());

        return response()->json(['data' => [
            'status'       => 'snoozed',
            'snoozed_until' => $signal->snoozed_until,
        ]]);
    }

    /**
     * POST /api/v1/signals/{id}/flag-review
     * Marks the signal for team attention; surfaces it at the top of the queue.
     */
    public function flagReview(Request $request, string $id): JsonResponse
    {
        $signal = HarvestingSignal::findOrFail($id);
        if ($signal->status !== 'pending') {
            return response()->json(['error' => 'Signal is not pending.'], 422);
        }

        $signal->update(['team_flagged' => true, 'snoozed_until' => null]);
        $this->logAudit('flag_review', $signal, auth()->id());

        return response()->json(['data' => ['team_flagged' => true]]);
    }

    /**
     * POST /api/v1/signals/{id}/promote
     * Body: { event_type: string }
     * Promotes a news_item signal directly to a BehaviouralEvent with operator-chosen type.
     */
    public function promote(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'event_type' => 'required|string|in:claim,commitment,admission,denial,action,silence,position,affiliation_change,communication,signal,meeting,operator_note',
        ]);

        $signal = HarvestingSignal::findOrFail($id);
        if ($signal->status !== 'pending') {
            return response()->json(['error' => 'Signal is not pending.'], 422);
        }
        if ($signal->signal_type !== 'news_item') {
            return response()->json(['error' => 'Only news_item signals can be promoted.'], 422);
        }

        $actor  = Actor::findOrFail($signal->actor_id);
        $result = $this->createBehaviouralEvent($signal, $actor, $signal->proposed_value, $request->event_type);

        $signal->update([
            'status'      => 'accepted',
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
        ]);

        $this->logAudit('promote', $signal, auth()->id());

        return response()->json(['data' => $result], 200);
    }

    /**
     * POST /api/v1/signals/bulk-accept
     */
    public function bulkAccept(Request $request): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        $accepted = 0;
        $conflicts = [];

        if ($request->has('signal_ids')) {
            $signals = HarvestingSignal::whereIn('id', $request->signal_ids)
                ->where('tenant_id', $tenantId)
                ->where('status', 'pending')
                ->get();
        } else {
            $signals = HarvestingSignal::where('tenant_id', $tenantId)
                ->where('status', 'pending')
                ->where('signal_type', 'field_value')
                ->where('confidence', 'high')
                ->get();
        }

        foreach ($signals as $signal) {
            $actor = Actor::find($signal->actor_id);
            if (!$actor) continue;

            if ($signal->signal_type === 'field_value' && $signal->field_name) {
                $current = $actor->{$signal->field_name} ?? null;
                if ($current && $current !== $signal->proposed_value) {
                    $conflicts[] = ['signal_id' => $signal->id, 'field' => $signal->field_name, 'current' => $current];
                    continue;
                }
            }

            $this->commitSignal($signal, auth()->user(), $signal->proposed_value);
            $accepted++;
        }

        return response()->json([
            'data' => ['accepted' => $accepted, 'conflicts' => $conflicts],
        ]);
    }

    /**
     * POST /api/v1/signals/bulk-dismiss
     */
    public function bulkDismiss(Request $request): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        $query    = HarvestingSignal::where('tenant_id', $tenantId)->where('status', 'pending');

        if ($request->has('signal_ids')) {
            $query->whereIn('id', $request->signal_ids);
        } elseif ($request->has('source_id')) {
            $query->where('source_id', $request->source_id);
        }

        $count = $query->update([
            'status'      => 'dismissed',
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
        ]);

        return response()->json(['data' => ['dismissed' => $count]]);
    }

    // -----------------------------------------------------------------------

    private function commitSignal(HarvestingSignal $signal, $user, string $value): array
    {
        $actor = Actor::find($signal->actor_id);

        $signal->update([
            'status'      => 'accepted',
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
        ]);

        return match ($signal->signal_type) {
            'field_value' => $this->applyFieldValue($signal, $actor, $value),
            'news_item'   => $this->createBehaviouralEvent($signal, $actor, $value, 'signal'),
            'flag'        => $this->applyFlag($signal, $actor, $value),
            default       => [],
        };
    }

    private function applyFieldValue(HarvestingSignal $signal, Actor $actor, string $value): array
    {
        if (!$signal->field_name) return [];

        DB::table('actors')
            ->where('id', $actor->id)
            ->update([$signal->field_name => $value, 'updated_at' => now()]);

        return ['type' => 'field_updated', 'field' => $signal->field_name, 'value' => $value];
    }

    private function createBehaviouralEvent(HarvestingSignal $signal, Actor $actor, string $summary, string $eventType): array
    {
        $event = BehaviouralEvent::create([
            'id'                => (string) Str::uuid(),
            'tenant_id'         => $actor->tenant_id,
            'actor_id'          => $actor->id,
            'event_type'        => $eventType,
            'reliability_grade' => $signal->reliability_grade,
            'summary'           => $summary,
            'source_type'       => 'harvest',
            'source_url'        => $signal->source_url,
            'event_date'        => now()->toDateString(),
        ]);

        return ['type' => 'event_created', 'event_id' => $event->id];
    }

    private function applyFlag(HarvestingSignal $signal, Actor $actor, string $value): array
    {
        $result = $this->createBehaviouralEvent($signal, $actor, $value, 'signal');

        $tag = 'flagged';
        if (str_contains(strtolower($value), 'sanction')) $tag = 'sanctioned';
        if (str_contains(strtolower($value), 'pep'))      $tag = 'pep';

        $tags = $actor->tags ?? [];
        if (!in_array($tag, $tags)) {
            $tags[] = $tag;
            DB::table('actors')->where('id', $actor->id)->update([
                'tags'       => json_encode($tags),
                'updated_at' => now(),
            ]);
        }

        return array_merge($result, ['tag_added' => $tag]);
    }

    private function logAudit(string $operation, HarvestingSignal $signal, int $userId): void
    {
        try {
            DB::table('audit_logs')->insert([
                'tenant_id'   => $signal->tenant_id,
                'user_id'     => $userId,
                'operation'   => $operation,
                'entity_type' => 'HarvestingSignal',
                'entity_id'   => $signal->id,
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
        } catch (\Throwable) {
            // non-fatal
        }
    }
}
