<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\SourceResource;
use App\Jobs\DistilProcessJob;
use App\Jobs\TranscriptionJob;
use App\Models\Actor;
use App\Models\BehaviouralEvent;
use App\Models\IntelligenceCommit;
use App\Models\Source;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SourceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Source::query();

        if ($request->has('source_type'))  $query->where('source_type', $request->source_type);
        if ($request->has('status'))       $query->where('status', $request->status);
        if ($request->has('distil_status'))$query->where('distil_status', $request->distil_status);
        if ($request->has('pool'))         $query->where('pool', $request->pool);
        if ($request->has('project_id'))   $query->where('project_id', $request->project_id);
        if ($request->has('actor_id'))     $query->where('actor_id', $request->actor_id);

        $paginated = $query->orderByDesc('created_at')
            ->paginate($request->get('per_page', 50));

        return response()->json([
            'data' => SourceResource::collection($paginated->items()),
            'meta' => [
                'total'        => $paginated->total(),
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
            ],
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $source = Source::with(['entities', 'events', 'claims'])->findOrFail($id);
        return response()->json(['data' => new SourceResource($source)]);
    }

    /**
     * POST /api/v1/sources/ingest-url  (BD-43)
     */
    public function ingestUrl(Request $request): JsonResponse
    {
        $request->validate([
            'url'        => 'required|url|max:2000',
            'pool'       => 'required|in:commons,vault',
            'project_id' => 'nullable|string',
            'actor_id'   => 'nullable|string|exists:actors,id',
            'title'      => 'nullable|string|max:255',
        ]);

        $source = Source::create([
            'id'            => (string) Str::uuid(),
            'tenant_id'     => auth()->user()->tenant_id,
            'pool'          => $request->pool,
            'project_id'    => $request->project_id,
            'actor_id'      => $request->actor_id,
            'source_type'   => 'url',
            'title'         => $request->title ?? parse_url($request->url, PHP_URL_HOST),
            'url'           => $request->url,
            'created_by'    => auth()->id(),
            'status'        => 'pending',
            'distil_status' => 'pending',
        ]);

        DistilProcessJob::dispatch($source->id);

        return response()->json(['data' => new SourceResource($source)], 202);
    }

    /**
     * POST /api/v1/sources/ingest-file  (BD-44)
     */
    public function ingestFile(Request $request): JsonResponse
    {
        $request->validate([
            'file'       => 'required|file|max:10240',
            'pool'       => 'required|in:commons,vault',
            'project_id' => 'nullable|string',
            'actor_id'   => 'nullable|string|exists:actors,id',
            'title'      => 'nullable|string|max:255',
        ]);

        $file = $request->file('file');
        $path = $file->store('sources/' . auth()->user()->tenant_id);

        $source = Source::create([
            'id'            => (string) Str::uuid(),
            'tenant_id'     => auth()->user()->tenant_id,
            'pool'          => $request->pool,
            'project_id'    => $request->project_id,
            'actor_id'      => $request->actor_id,
            'source_type'   => 'file',
            'title'         => $request->title ?? $file->getClientOriginalName(),
            'file_path'     => $path,
            'file_mime'     => $file->getMimeType(),
            'file_size'     => $file->getSize(),
            'created_by'    => auth()->id(),
            'status'        => 'pending',
            'distil_status' => 'pending',
        ]);

        DistilProcessJob::dispatch($source->id);

        return response()->json(['data' => new SourceResource($source)], 202);
    }

    /**
     * POST /api/v1/sources/meeting-note  (BD-79)
     * Body: { body, title?, pool, actor_id?, project_id? }
     */
    public function meetingNote(Request $request): JsonResponse
    {
        $request->validate([
            'body'       => 'required|string|max:50000',
            'title'      => 'nullable|string|max:255',
            'pool'       => 'required|in:commons,vault',
            'actor_id'   => 'nullable|string|exists:actors,id',
            'project_id' => 'nullable|string|exists:projects,id',
        ]);

        $source = Source::create([
            'id'            => (string) Str::uuid(),
            'tenant_id'     => auth()->user()->tenant_id,
            'pool'          => $request->pool,
            'project_id'    => $request->project_id,
            'actor_id'      => $request->actor_id,
            'source_type'   => 'meeting_note',
            'title'         => $request->title ?? ('Meeting note — ' . now()->format('Y-m-d H:i')),
            'raw_text'      => $request->body,
            'created_by'    => auth()->id(),
            'status'        => 'done',
            'distil_status' => 'pending',
        ]);

        DistilProcessJob::dispatch($source->id);

        return response()->json(['data' => new SourceResource($source)], 202);
    }

    /**
     * POST /api/v1/sources/observation  (BD-80)
     * Bypasses the Source pipeline — creates a BehaviouralEvent directly.
     * Body: { summary, actor_id, pool, event_type?, reliability_grade?, event_date?, project_id? }
     */
    public function observation(Request $request): JsonResponse
    {
        $request->validate([
            'summary'           => 'required|string|max:2000',
            'actor_id'          => 'required|string|exists:actors,id',
            'pool'              => 'required|in:commons,vault',
            'event_type'        => 'nullable|string|max:60',
            'reliability_grade' => 'nullable|in:bedrock,rock,sand,mud,fog',
            'event_date'        => 'nullable|date',
            'project_id'        => 'nullable|string|exists:projects,id',
        ]);

        $tenantId = auth()->user()->tenant_id;

        $event = BehaviouralEvent::create([
            'id'                => (string) Str::uuid(),
            'tenant_id'         => $tenantId,
            'actor_id'          => $request->actor_id,
            'pool'              => $request->pool,
            'project_id'        => $request->project_id,
            'event_type'        => $request->event_type ?? 'operator_note',
            'summary'           => $request->summary,
            'content'           => '',
            'reliability_grade' => $request->reliability_grade ?? 'sand',
            'event_date'        => $request->event_date,
            'date_precision'    => $request->event_date ? 'approximate' : 'unknown',
            'source_type'       => 'operator',
        ]);

        return response()->json(['data' => $event], 201);
    }

    /**
     * POST /api/v1/sources/ingest-voice  (BD-81)
     * Multipart: { audio, title?, pool, actor_id?, project_id? }
     */
    public function ingestVoice(Request $request): JsonResponse
    {
        $request->validate([
            'audio'      => 'required|file|max:25600|mimes:mp3,mp4,mpeg,mpga,m4a,wav,webm,ogg',
            'title'      => 'nullable|string|max:255',
            'pool'       => 'required|in:commons,vault',
            'actor_id'   => 'nullable|string|exists:actors,id',
            'project_id' => 'nullable|string|exists:projects,id',
        ]);

        $file = $request->file('audio');
        $path = $file->store('sources/audio/' . auth()->user()->tenant_id);

        $source = Source::create([
            'id'            => (string) Str::uuid(),
            'tenant_id'     => auth()->user()->tenant_id,
            'pool'          => $request->pool,
            'project_id'    => $request->project_id,
            'actor_id'      => $request->actor_id,
            'source_type'   => 'voice',
            'title'         => $request->title ?? $file->getClientOriginalName(),
            'file_path'     => $path,
            'file_mime'     => $file->getMimeType(),
            'file_size'     => $file->getSize(),
            'created_by'    => auth()->id(),
            'status'        => 'pending',
            'distil_status' => 'pending',
        ]);

        TranscriptionJob::dispatch($source->id);

        return response()->json(['data' => new SourceResource($source)], 202);
    }

    public function destroy(string $id): JsonResponse
    {
        $source = Source::findOrFail($id);
        $source->delete();
        return response()->json(null, 204);
    }

    /**
     * POST /api/v1/sources/{id}/commit  (BD-49)
     */
    public function commit(Request $request, string $id): JsonResponse
    {
        $source = Source::with(['events', 'entities'])->findOrFail($id);
        $userId = auth()->id();
        $tenantId = auth()->user()->tenant_id;

        $eventsCreated  = 0;
        $actorsCreated  = 0;

        $eventQuery = $source->events()->where('committed', false);
        if ($request->has('event_ids')) {
            $eventQuery->whereIn('id', $request->event_ids);
        } else {
            $eventQuery->where('confidence', 'high');
        }

        foreach ($eventQuery->get() as $se) {
            $actorId = $se->attributed_actor_id;

            if (!$actorId && $se->attributed_actor_name) {
                $actor = Actor::withoutGlobalScopes()
                    ->where('tenant_id', $tenantId)
                    ->where('display_name', $se->attributed_actor_name)
                    ->first();
                $actorId = $actor?->id;
            }

            // For actor-linked sources, fall back to the source's actor
            if (!$actorId && $source->actor_id) {
                $actorId = $source->actor_id;
            }

            if (!$actorId) continue;

            $event = BehaviouralEvent::create([
                'id'                => (string) Str::uuid(),
                'tenant_id'         => $tenantId,
                'actor_id'          => $actorId,
                'pool'              => $source->pool,
                'project_id'        => $source->project_id,
                'event_type'        => $se->event_type,
                'summary'           => $se->summary,
                'content'           => $se->content ?? '',
                'reliability_grade' => $se->reliability_grade,
                'event_date'        => $se->event_date,
                'date_precision'    => $se->event_date ? 'approximate' : 'unknown',
                'source_type'       => 'document',
                'source_id'         => $source->id,
            ]);

            $se->update(['committed' => true, 'committed_event_id' => $event->id]);

            IntelligenceCommit::create([
                'tenant_id'          => $tenantId,
                'source_id'          => $source->id,
                'commit_type'        => 'event_created',
                'entity_type'        => 'BehaviouralEvent',
                'entity_id'          => $event->id,
                'source_record_type' => 'SourceEvent',
                'source_record_id'   => $se->id,
                'committed_by'       => $userId,
            ]);

            $eventsCreated++;
        }

        $entityQuery = $source->entities()->where('committed', false)->where('match_type', 'candidate');
        if ($request->has('entity_ids')) {
            $entityQuery->whereIn('id', $request->entity_ids);
        } else {
            $entityQuery->where('confidence', 'high');
        }

        foreach ($entityQuery->get() as $se) {
            $actorType = match($se->actor_type) {
                'person'       => 'contact',
                'organisation' => 'company',
                'government'   => 'government',
                default        => 'contact',
            };

            $actor = Actor::create([
                'id'           => (string) Str::uuid(),
                'tenant_id'    => $tenantId,
                'actor_type'   => $actorType,
                'pool'         => $source->pool,
                'project_id'   => $source->project_id,
                'display_name' => $se->entity_name,
                'notes'        => $se->context,
            ]);

            $se->update(['committed' => true, 'committed_actor_id' => $actor->id]);

            IntelligenceCommit::create([
                'tenant_id'          => $tenantId,
                'source_id'          => $source->id,
                'commit_type'        => 'actor_created',
                'entity_type'        => 'Actor',
                'entity_id'          => $actor->id,
                'source_record_type' => 'SourceEntity',
                'source_record_id'   => $se->id,
                'committed_by'       => $userId,
            ]);

            $actorsCreated++;
        }

        return response()->json([
            'data' => [
                'events_created' => $eventsCreated,
                'actors_created' => $actorsCreated,
            ],
        ]);
    }

    /**
     * DELETE /api/v1/intelligence-commits/{id}  (BD-49 revert)
     */
    public function revertCommit(string $id): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;

        $commit = IntelligenceCommit::where('id', $id)
            ->where('tenant_id', $tenantId)
            ->whereNull('reverted_at')
            ->where('created_at', '>=', now()->subHours(24))
            ->firstOrFail();

        if ($commit->entity_type === 'BehaviouralEvent') {
            BehaviouralEvent::withoutGlobalScopes()
                ->where('id', $commit->entity_id)
                ->delete();

            DB::table('source_events')
                ->where('id', $commit->source_record_id)
                ->update(['committed' => false, 'committed_event_id' => null]);
        }

        if ($commit->entity_type === 'Actor') {
            Actor::withoutGlobalScopes()
                ->where('id', $commit->entity_id)
                ->delete();

            DB::table('source_entities')
                ->where('id', $commit->source_record_id)
                ->update(['committed' => false, 'committed_actor_id' => null]);
        }

        $commit->update(['reverted_at' => now()]);

        return response()->json(['data' => ['reverted' => true]]);
    }
}
