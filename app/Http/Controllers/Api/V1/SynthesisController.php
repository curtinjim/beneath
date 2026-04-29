<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\AI\ActorBriefingJob;
use App\Jobs\AI\NarrativeSynthesisJob;
use App\Models\Actor;
use App\Models\ChatSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SynthesisController extends Controller
{
    // BD-126: dispatch a synthesis operation from within a chat session
    // Body: { operation: 'actor_briefing', actor_id: uuid }
    //       { operation: 'narrative_synthesis', project_id: uuid }
    public function synthesise(Request $request, string $id): JsonResponse
    {
        $session = ChatSession::findOrFail($id);

        $request->validate([
            'operation'  => 'required|string|in:actor_briefing,narrative_synthesis',
            'actor_id'   => 'required_if:operation,actor_briefing|nullable|string|size:36|exists:actors,id',
            'project_id' => 'required_if:operation,narrative_synthesis|nullable|string|size:36|exists:projects,id',
        ]);

        $operation = $request->input('operation');

        if ($operation === 'actor_briefing') {
            ActorBriefingJob::dispatch($request->input('actor_id'), $session->id);
        } else {
            NarrativeSynthesisJob::dispatch($request->input('project_id'), $session->id);
        }

        return response()->json(['data' => ['queued' => true]], 202);
    }

    // BD-126: brief an actor — creates a new chat session, dispatches ActorBriefingJob
    // Returns { session_id } so the frontend can navigate to the new session
    public function actorBrief(Request $request, string $actorId): JsonResponse
    {
        $actor = Actor::findOrFail($actorId);

        $session = ChatSession::create([
            'tenant_id' => Auth::user()->tenant_id,
            'user_id'   => Auth::id(),
            'title'     => 'Briefing: ' . $actor->display_name,
            'voice'     => 'maisie',
        ]);

        ActorBriefingJob::dispatch($actor->id, $session->id);

        return response()->json(['data' => ['session_id' => $session->id]], 202);
    }
}
