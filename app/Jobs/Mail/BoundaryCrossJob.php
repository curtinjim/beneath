<?php
namespace App\Jobs\Mail;
use App\AI\BeneathAIProvider;
use App\Models\Actor;
use App\Models\BehaviouralEvent;
use App\Models\Mail\MailThread;
use App\Models\Mail\MailMessage;
use App\Models\Mail\MailActorLink;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

class BoundaryCrossJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    public int $tries   = 2;
    public int $timeout = 60;

    public function __construct(
        public string $threadId,
        public string $actorId,
        public string $operatorUserId,
        public ?string $overrideEventType = null,
        public ?string $overrideReliability = null
    ) {}

    public function handle(BeneathAIProvider $ai): void
    {
        $thread = MailThread::withoutGlobalScopes()->with('messages')->find($this->threadId);
        $actor  = Actor::withoutGlobalScopes()->find($this->actorId);
        if (!$thread || !$actor) return;

        $messages = $thread->messages->map(fn($m) => [
            'from'    => $m->from_email,
            'subject' => $m->subject,
            'body'    => substr($m->body_text ?? strip_tags($m->body_html ?? ''), 0, 800),
            'sent_at' => $m->sent_at?->toDateString(),
        ])->all();

        $actorContext = [[
            'id'           => $actor->id,
            'display_name' => $actor->display_name,
            'actor_type'   => $actor->actor_type,
        ]];

        // AI significance assessment
        $assessment = $ai->assessEmailSignificance($messages, $actorContext);

        BehaviouralEvent::create([
            'id'                  => (string) Str::uuid(),
            'tenant_id'           => $actor->tenant_id,
            'actor_id'            => $actor->id,
            'pool'                => $actor->pool,
            'event_type'          => $this->overrideEventType ?? ($assessment['suggested_event_type'] ?? 'communication'),
            'reliability_grade'   => $this->overrideReliability ?? 'sand',
            'event_date'          => $thread->last_message_at?->toDateString() ?? now()->toDateString(),
            'summary'             => $assessment['summary'] ?? "Email thread: {$thread->subject}",
            'content'             => $assessment['detail'] ?? null,
            'source_type'         => 'email',
            'operator_annotation' => "Boundary crossed from mail thread. Subject: {$thread->subject}",
        ]);

        MailActorLink::where('mail_thread_id', $this->threadId)
            ->where('actor_id', $this->actorId)
            ->update(['boundary_crossed' => true]);
    }
}
