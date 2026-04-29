<?php
namespace App\Http\Resources\Api\V1;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
class EventResource extends JsonResource {
    public function toArray(Request $request): array {
        $user = $request->user();
        $isOwnerAdmin = $user?->isOwnerOrAdmin();
        return [
            'id'                  => $this->id,
            'actor_id'            => $this->actor_id,
            'pool'                => $this->pool,
            'project_id'          => $this->project_id,
            'event_type'          => $this->event_type,
            'summary'             => $this->summary,
            'content'             => $this->content,
            'supporting_text'     => $this->supporting_text,
            'reliability_grade'   => $this->reliability_grade,
            'event_date'          => $this->event_date,
            'date_precision'      => $this->date_precision,
            'source_type'         => $this->source_type,
            'related_actor_ids'   => $this->related_actor_ids ?? [],
            'related_event_ids'   => $this->related_event_ids ?? [],
            'promoted'            => $this->promoted,
            'operator_annotation' => $this->operator_annotation,
            'created_at'          => $this->created_at,
            // canary_marker excluded from all standard responses
        ];
    }
}
