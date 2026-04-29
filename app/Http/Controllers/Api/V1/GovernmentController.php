<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ActorRequest;
use App\Http\Resources\Api\V1\ActorResource;
use App\Models\Actor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;
class GovernmentController extends Controller {
    public function index(Request $request): AnonymousResourceCollection {
        $actors = Actor::where('actor_type', 'government')
            ->when($request->search, fn($q, $s) => $q->where('display_name', 'like', "%$s%"))
            ->orderBy('display_name')
            ->paginate(50);
        return ActorResource::collection($actors);
    }
    public function store(ActorRequest $request): JsonResponse {
        $data = $request->validated();
        $data['actor_type'] = 'government';
        $data['tenant_id']  = $request->user()->tenant_id;
        $data['id']         = (string) Str::uuid();
        $data['pool']       = $data['pool'] ?? 'commons';
        $actor = Actor::withoutGlobalScopes(['App\Scopes\TenantScope','App\Scopes\PoolScope'])->create($data);
        return (new ActorResource($actor))->response()->setStatusCode(201);
    }
    public function show(string $id): JsonResponse {
        return (new ActorResource(Actor::where('actor_type','government')->findOrFail($id)))->response();
    }
    public function update(ActorRequest $request, string $id): JsonResponse {
        $actor = Actor::where('actor_type','government')->findOrFail($id);
        $actor->update($request->validated());
        return (new ActorResource($actor))->response();
    }
    public function destroy(string $id): JsonResponse {
        Actor::where('actor_type','government')->findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
