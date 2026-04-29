<?php
namespace App\Http\Controllers\Api\V1;

use App\AI\BeneathAIProvider;
use App\Http\Controllers\Controller;
use App\Models\BehaviouralEvent;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\Project;
use App\Models\ProjectActorLink;
use App\Models\TenantAiConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ChatController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $sessions = ChatSession::where('user_id', Auth::id())
            ->whereNull('archived_at')
            ->orderByDesc('updated_at')
            ->get(['id', 'title', 'voice', 'project_id', 'updated_at']);

        return response()->json(['data' => $sessions]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'      => 'nullable|string|max:255',
            'voice'      => 'nullable|in:maisie,pippa,cate,lance,jack,jackson',
            'project_id' => 'nullable|string|exists:projects,id',
        ]);

        $session = ChatSession::create([
            'tenant_id'  => Auth::user()->tenant_id,
            'user_id'    => Auth::id(),
            'project_id' => $validated['project_id'] ?? null,
            'title'      => $validated['title'] ?? 'New chat',
            'voice'      => $validated['voice'] ?? 'maisie',
        ]);

        return response()->json(['data' => $session], 201);
    }

    public function show(string $id): JsonResponse
    {
        $session = ChatSession::where('user_id', Auth::id())
            ->with('messages')
            ->findOrFail($id);

        return response()->json(['data' => $session]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $session = ChatSession::where('user_id', Auth::id())->findOrFail($id);

        $validated = $request->validate([
            'title'       => 'nullable|string|max:255',
            'voice'       => 'nullable|in:maisie,pippa,cate,lance,jack,jackson',
            'archived_at' => 'nullable|boolean',
        ]);

        if (isset($validated['title']))       $session->title = $validated['title'];
        if (isset($validated['voice']))       $session->voice = $validated['voice'];
        if (isset($validated['archived_at'])) {
            $session->archived_at = $validated['archived_at'] ? now() : null;
        }

        $session->save();

        return response()->json(['data' => $session]);
    }

    public function destroy(string $id): JsonResponse
    {
        $session = ChatSession::where('user_id', Auth::id())->findOrFail($id);
        $session->delete();

        return response()->json(null, 204);
    }

    public function sendMessage(Request $request, string $id): JsonResponse
    {
        $session = ChatSession::where('user_id', Auth::id())->findOrFail($id);

        $validated = $request->validate([
            'content' => 'required|string|max:20000',
            'voice'   => 'nullable|in:maisie,pippa,cate,lance,jack,jackson',
        ]);

        // BD-360: per-message voice — use request voice or fall back to session default
        $activeVoice = $validated['voice'] ?? $session->voice;

        // Resolve skill ID from tenant config (BD-125)
        $config  = TenantAiConfig::forTenant(Auth::user()->tenant_id);
        $skillId = $config->getSkillId($activeVoice);

        if (!$skillId) {
            return response()->json(['error' => 'Unknown voice: ' . $activeVoice], 422);
        }

        // BD-124: inject project context on the first message of a project-linked session
        $isFirstMessage = !ChatMessage::where('session_id', $session->id)->exists();
        $messageContent = $validated['content'];

        if ($session->project_id && $isFirstMessage) {
            $context = $this->buildProjectContext($session->project_id);
            if ($context) {
                $messageContent = $context . "\n\n---\n\n" . $messageContent;
            }
        }

        // Auto-title on first message (use raw content, not context-prefixed)
        if ($session->title === 'New chat') {
            $session->update(['title' => mb_substr($validated['content'], 0, 60)]);
        }

        // Save user message (store raw content, not context-prefixed version)
        $userMsg = ChatMessage::create([
            'session_id' => $session->id,
            'tenant_id'  => $session->tenant_id,
            'role'       => 'user',
            'content'    => $validated['content'],
            'voice'      => $activeVoice,
            'created_at' => now(),
        ]);

        // Build message history from DB (last 40 messages).
        // BD-360: per-voice context — each member sees ALL user messages (shared
        // context) but only their own assistant responses, so their persona
        // stays consistent across a multi-voice thread. This mirrors how
        // Claude skills maintain independent context windows.
        $history = ChatMessage::where('session_id', $session->id)
            ->orderBy('created_at')
            ->get(['role', 'content', 'voice'])
            ->filter(fn($m) => $m->role === 'user' || $m->voice === $activeVoice)
            ->map(fn($m) => ['role' => $m->role, 'content' => $m->content])
            ->values()
            ->toArray();

        // Replace the last user message content with context-prefixed version for the API call
        if ($session->project_id && $isFirstMessage && count($history) > 0) {
            $lastIdx = count($history) - 1;
            if ($history[$lastIdx]['role'] === 'user') {
                $history[$lastIdx]['content'] = $messageContent;
            }
        }

        // Call AI
        $ai           = app(BeneathAIProvider::class);
        $responseText = $ai->chat($history, $skillId);

        // Save assistant message
        $assistantMsg = ChatMessage::create([
            'session_id' => $session->id,
            'tenant_id'  => $session->tenant_id,
            'role'       => 'assistant',
            'content'    => $responseText,
            'voice'      => $activeVoice,
            'created_at' => now(),
        ]);

        $session->touch();

        return response()->json([
            'data' => [
                'user_message'      => $userMsg,
                'assistant_message' => $assistantMsg,
            ],
        ]);
    }

    // BD-124: build project intelligence context block for injection
    private function buildProjectContext(string $projectId): string
    {
        $project = Project::find($projectId);
        if (!$project) return '';

        $lines = ['PROJECT INTELLIGENCE CONTEXT'];
        $lines[] = 'Goal: ' . ($project->goal_statement ?? 'Not specified');

        $links = ProjectActorLink::where('project_id', $projectId)
            ->with('actor:id,display_name,actor_type,reliability_profile,trajectory')
            ->get();

        if ($links->isNotEmpty()) {
            $lines[] = '';
            $lines[] = 'Actors linked to this project:';
            foreach ($links as $link) {
                if (!$link->actor) continue;
                $a    = $link->actor;
                $line = "- {$a->display_name} ({$a->actor_type})";
                if ($a->reliability_profile) $line .= ", reliability: {$a->reliability_profile}";
                if ($a->trajectory)          $line .= ", trajectory: {$a->trajectory}";
                if ($link->stance)           $line .= ", stance: {$link->stance}";
                $lines[] = $line;
            }

            // Top promoted findings across linked actors
            $actorIds = $links->pluck('actor_id')->filter();
            if ($actorIds->isNotEmpty()) {
                $promoted = BehaviouralEvent::whereIn('actor_id', $actorIds)
                    ->where('promoted', true)
                    ->orderByDesc('event_date')
                    ->limit(6)
                    ->get(['summary', 'event_type', 'reliability_grade']);

                if ($promoted->isNotEmpty()) {
                    $lines[] = '';
                    $lines[] = 'Promoted findings:';
                    foreach ($promoted as $e) {
                        $lines[] = "- [{$e->reliability_grade}] {$e->summary}";
                    }
                }
            }
        }

        return implode("\n", $lines);
    }
}
