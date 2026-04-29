<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SourceResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'            => $this->id,
            'pool'          => $this->pool,
            'project_id'    => $this->project_id,
            'source_type'   => $this->source_type,
            'title'         => $this->title,
            'url'           => $this->url,
            'file_mime'     => $this->file_mime,
            'file_size'     => $this->file_size,
            'status'        => $this->status,
            'distil_status' => $this->distil_status,
            'distil_error'  => $this->distil_error,
            'processed_at'  => $this->processed_at?->toISOString(),
            'created_at'    => $this->created_at->toISOString(),
            'entities'      => $this->whenLoaded('entities', fn() =>
                $this->entities->map(fn($e) => [
                    'id'                 => $e->id,
                    'entity_name'        => $e->entity_name,
                    'actor_type'         => $e->actor_type,
                    'actor_id'           => $e->actor_id,
                    'context'            => $e->context,
                    'match_type'         => $e->match_type,
                    'confidence'         => $e->confidence,
                    'committed'          => $e->committed,
                    'committed_actor_id' => $e->committed_actor_id,
                ])
            ),
            'events'        => $this->whenLoaded('events', fn() =>
                $this->events->map(fn($e) => [
                    'id'                    => $e->id,
                    'event_type'            => $e->event_type,
                    'summary'               => $e->summary,
                    'content'               => $e->content,
                    'attributed_actor_id'   => $e->attributed_actor_id,
                    'attributed_actor_name' => $e->attributed_actor_name,
                    'event_date'            => $e->event_date?->toDateString(),
                    'reliability_grade'     => $e->reliability_grade,
                    'confidence'            => $e->confidence,
                    'committed'             => $e->committed,
                    'committed_event_id'    => $e->committed_event_id,
                ])
            ),
            'claims'        => $this->whenLoaded('claims', fn() =>
                $this->claims->map(fn($c) => [
                    'id'                    => $c->id,
                    'claim_text'            => $c->claim_text,
                    'attributed_actor_id'   => $c->attributed_actor_id,
                    'attributed_actor_name' => $c->attributed_actor_name,
                    'context'               => $c->context,
                    'confidence'            => $c->confidence,
                    'committed'             => $c->committed,
                ])
            ),
        ];
    }
}
