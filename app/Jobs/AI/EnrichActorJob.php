<?php
namespace App\Jobs\AI;

use App\AI\BeneathAIProvider;
use App\Models\Actor;
use App\Models\ActorEnrichment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class EnrichActorJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 60;

    public function __construct(
        public string $enrichmentId,
        public string $actorId
    ) {}

    public function handle(BeneathAIProvider $ai): void
    {
        $enrichment = ActorEnrichment::find($this->enrichmentId);
        if (!$enrichment) return;

        $enrichment->update(["status" => "running"]);

        try {
            $actor = Actor::withoutGlobalScopes()->find($this->actorId);
            if (!$actor) {
                $enrichment->update(["status" => "failed"]);
                return;
            }

            $inputData = [
                "id"          => $actor->id,
                "actor_type"  => $actor->actor_type,
                "display_name"=> $actor->display_name,
                "notes"       => $actor->notes,
                "tags"        => $actor->tags ?? [],
                "subtype_data"=> $actor->subtype_data ?? [],
            ];

            $enrichmentFields = $ai->generateEnrichmentFields($inputData);

            $affiliationContext = [
                "actor_id"    => $actor->id,
                "actor_type"  => $actor->actor_type,
                "display_name"=> $actor->display_name,
                "subtype_data"=> $actor->subtype_data ?? [],
                "tags"        => $actor->tags ?? [],
            ];

            $leverageSuggestion = $ai->suggestLeverageRead($affiliationContext);

            $enrichment->update([
                "status"                  => "done",
                "enrichment_fields"       => $enrichmentFields,
                "leverage_read_suggestion"=> $leverageSuggestion,
            ]);

            $actor->withoutGlobalScopes()->where("id", $actor->id)->update(["last_enriched_at" => now()]);

        } catch (\Throwable $e) {
            $enrichment->update(["status" => "failed"]);
            throw $e;
        }
    }
}
