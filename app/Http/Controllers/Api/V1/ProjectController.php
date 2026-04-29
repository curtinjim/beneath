<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ProjectRequest;
use App\Http\Resources\Api\V1\ProjectResource;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;
class ProjectController extends Controller {
    public function index(): AnonymousResourceCollection {
        return ProjectResource::collection(Project::orderBy('name')->get());
    }
    public function store(ProjectRequest $request): JsonResponse {
        $project = Project::withoutGlobalScopes()->create([
            'id'        => (string) Str::uuid(),
            'tenant_id' => $request->user()->tenant_id,
            ...$request->validated(),
        ]);
        return (new ProjectResource($project))->response()->setStatusCode(201);
    }
    public function show(string $id): JsonResponse {
        return (new ProjectResource(Project::findOrFail($id)))->response();
    }
    public function update(ProjectRequest $request, string $id): JsonResponse {
        $project = Project::findOrFail($id);
        $project->update($request->validated());
        return (new ProjectResource($project))->response();
    }
}
