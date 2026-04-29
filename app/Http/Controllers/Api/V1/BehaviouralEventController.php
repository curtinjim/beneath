<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\EventRequest;
use App\Http\Resources\Api\V1\EventResource;
use App\Models\Actor;
use App\Models\BehaviouralEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class BehaviouralEventController extends Controller
{
    public function index(string $actorId): AnonymousResourceCollection
    {
        Actor::findOrFail($actorId);
        $events = BehaviouralEvent::where('actor_id', $actorId)
            ->orderBy('event_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(50);
        return EventResource::collection($events);
    }

    public function store(EventRequest $request, string $actorId): JsonResponse
    {
        $actor = Actor::findOrFail($actorId);

        // BD-28: archived actors are read-only
        if ($actor->dormancy_state === 'archived') {
            return response()->json([
                'message' => 'This record is archived and cannot accept new events.',
            ], 422);
        }

        $data = $request->validated();
        $data['id']        = (string) Str::uuid();
        $data['tenant_id'] = $request->user()->tenant_id;
        $data['actor_id']  = $actorId;
        $data['pool']      = $data['pool'] ?? $actor->pool;
        if ($data['pool'] === 'vault' && empty($data['project_id'])) {
            $data['project_id'] = $actor->project_id;
        }

        $event = BehaviouralEvent::withoutGlobalScopes()->create($data);
        return (new EventResource($event))->response()->setStatusCode(201);
    }

    public function show(string $id): JsonResponse
    {
        return (new EventResource(BehaviouralEvent::findOrFail($id)))->response();
    }

    public function update(EventRequest $request, string $id): JsonResponse
    {
        $event = BehaviouralEvent::findOrFail($id);

        // BD-28: archived actors are read-only
        $actor = Actor::findOrFail($event->actor_id);
        if ($actor->dormancy_state === 'archived') {
            return response()->json([
                'message' => 'This record is archived and cannot be modified.',
            ], 422);
        }

        $event->update($request->validated());
        return (new EventResource($event))->response();
    }
}
