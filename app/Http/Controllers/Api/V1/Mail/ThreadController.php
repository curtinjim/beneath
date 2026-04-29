<?php
namespace App\Http\Controllers\Api\V1\Mail;
use App\Http\Controllers\Controller;
use App\Models\Mail\MailAccount;
use App\Models\Mail\MailThread;
use App\Models\Mail\MailActorLink;
use App\Jobs\Mail\SyncMailAccountJob;
use App\Jobs\Mail\BoundaryCrossJob;
use App\Services\Mail\ActorMatcher;
use Illuminate\Http\Request;

class ThreadController extends Controller
{
    public function accounts(): \Illuminate\Http\JsonResponse
    {
        $accounts = MailAccount::where('status', '!=', 'disconnected')
            ->select(['id','provider','email_address','display_name','status','last_synced_at'])
            ->get();
        return response()->json(['data' => $accounts]);
    }

    public function index(Request $request): \Illuminate\Http\JsonResponse
    {
        $query = MailThread::with('account:id,provider,email_address')
            ->orderByDesc('last_message_at');

        if ($request->search) {
            $query->where('subject', 'like', '%' . $request->search . '%');
        }
        if ($request->account_id) {
            $query->where('mail_account_id', $request->account_id);
        }

        return response()->json($query->paginate(30));
    }

    public function show(string $id): \Illuminate\Http\JsonResponse
    {
        $thread = MailThread::with(['messages', 'actorLinks.actor:id,display_name,actor_type,reliability_profile,pool'])
            ->findOrFail($id);
        return response()->json(['data' => $thread]);
    }

    public function sync(string $accountId): \Illuminate\Http\JsonResponse
    {
        $account = MailAccount::findOrFail($accountId);
        SyncMailAccountJob::dispatch($account->id);
        return response()->json(['ok' => true], 202);
    }

    public function linkActor(Request $request, string $threadId): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate(['actor_id' => 'required|string']);
        $thread    = MailThread::findOrFail($threadId);

        $link = MailActorLink::firstOrCreate(
            ['mail_thread_id' => $threadId, 'actor_id' => $validated['actor_id']],
            ['tenant_id' => auth()->user()->tenant_id, 'matched_email' => '', 'match_confidence' => 'confirmed']
        );

        return response()->json(['data' => $link], 201);
    }

    public function crossBoundary(Request $request, string $threadId): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'actor_id'           => 'required|string',
            'event_type'         => 'nullable|string',
            'reliability_grade'  => 'nullable|string',
        ]);

        BoundaryCrossJob::dispatch(
            $threadId,
            $validated['actor_id'],
            auth()->id(),
            $validated['event_type'] ?? null,
            $validated['reliability_grade'] ?? null,
        );

        return response()->json(['ok' => true], 202);
    }
}
