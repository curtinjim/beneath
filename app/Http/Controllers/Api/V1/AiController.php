<?php
namespace App\Http\Controllers\Api\V1;

use App\AI\BeneathAIProvider;
use App\Http\Controllers\Controller;
use App\Jobs\DistilProcessJob;
use App\Models\Actor;
use App\Models\ActorRelationship;
use App\Models\BehaviouralEvent;
use App\Models\Terrain;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiController extends Controller
{
    // Bug 2 fix: was returning null job_id stub — now calls provider synchronously
    // following the same pattern as suggestGrade() and leverageRead()

    public function significance(Request $request): JsonResponse
    {
        $request->validate([
            'subject'       => 'required|string|max:500',
            'body'          => 'required|string|max:20000',
            'actor_context' => 'nullable|string|max:2000',
        ]);

        $provider = app(BeneathAIProvider::class);
        $result   = $provider->assessEmailSignificance(
            $request->input('subject'),
            $request->input('body'),
            $request->input('actor_context', '')
        );

        return response()->json(['data' => $result]);
    }

    public function divergence(Request $request): JsonResponse
    {
        $request->validate([
            'actor_id' => 'required|string|size:36|exists:actors,id',
        ]);

        $events = BehaviouralEvent::where('actor_id', $request->input('actor_id'))
            ->orderByDesc('event_date')
            ->limit(50)
            ->get(['event_type', 'summary', 'reliability_grade', 'event_date'])
            ->toArray();

        $provider = app(BeneathAIProvider::class);
        $result   = $provider->computeDivergence($events);

        return response()->json(['data' => $result]);
    }

    public function entities(Request $request): JsonResponse
    {
        $request->validate([
            'source_id' => 'required|string|exists:sources,id',
        ]);

        DistilProcessJob::dispatch($request->input('source_id'));

        return response()->json(['data' => ['queued' => true]], 202);
    }

    // BD-26: reliability grade suggestion
    public function suggestGrade(Request $request): JsonResponse
    {
        $request->validate([
            'event_type'     => 'required|string',
            'summary'        => 'required|string',
            'content'        => 'nullable|string',
            'source_type'    => 'nullable|string',
            'source_context' => 'nullable|string',
        ]);

        $provider = app(BeneathAIProvider::class);
        $result   = $provider->suggestGrade([
            'event_type'     => $request->input('event_type'),
            'summary'        => $request->input('summary'),
            'content'        => $request->input('content'),
            'source_type'    => $request->input('source_type'),
            'source_context' => $request->input('source_context'),
        ]);

        return response()->json(['data' => $result]);
    }

    // BD-38: leverage read suggestion in project context
    public function leverageRead(Request $request): JsonResponse
    {
        $request->validate([
            'actor_id'   => 'required|string|size:36',
            'project_id' => 'nullable|string|size:36',
        ]);

        $actor = Actor::findOrFail($request->input('actor_id'));

        $terrain = Terrain::where('actor_id', $actor->id)
            ->whereIn('category', ['affiliation', 'personnel', 'operational'])
            ->with('relatedActor:id,display_name,actor_type')
            ->get();

        $relationships = ActorRelationship::with([
                'targetActor:id,display_name,actor_type',
                'sourceActor:id,display_name,actor_type',
            ])
            ->where(function ($q) use ($actor) {
                $q->where('source_actor_id', $actor->id)->orWhere('target_actor_id', $actor->id);
            })
            ->limit(20)
            ->get();

        $affiliationContext = [
            'actor' => [
                'id'                  => $actor->id,
                'display_name'        => $actor->display_name,
                'actor_type'          => $actor->actor_type,
                'reliability_profile' => $actor->reliability_profile,
            ],
            'terrain_entries' => $terrain->map(fn ($t) => [
                'category'      => $t->category,
                'label'         => $t->label,
                'value'         => $t->value,
                'related_actor' => $t->relatedActor?->display_name,
            ])->toArray(),
            'relationships' => $relationships->map(fn ($r) => [
                'type'        => $r->relationship_type,
                'direction'   => $r->direction,
                'other_actor' => ($r->source_actor_id === $actor->id
                    ? $r->targetActor?->display_name
                    : $r->sourceActor?->display_name),
            ])->toArray(),
        ];

        $provider = app(BeneathAIProvider::class);
        $result   = $provider->suggestLeverageRead($affiliationContext);

        return response()->json(['data' => $result]);
    }
}
