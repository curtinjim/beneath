<?php
namespace App\Http\Resources\Api\V1;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
class ActorResource extends JsonResource {
    public function toArray(Request $request): array {
        return [
            'id'                  => $this->id,
            'actor_type'          => $this->actor_type,
            'pool'                => $this->pool,
            'project_id'          => $this->project_id,
            'display_name'        => $this->display_name,
            'aliases'             => $this->aliases ?? [],
            'primary_email'       => $this->primary_email,
            'additional_emails'   => $this->additional_emails ?? [],
            'reliability_profile' => $this->reliability_profile,
            'trajectory'          => $this->trajectory,
            'dormancy_state'      => $this->dormancy_state,
            'importance_tier'     => $this->importance_tier,
            'tags'                => $this->tags ?? [],
            'notes'               => $this->notes,
            'subtype_data'        => $this->subtype_data ?? [],
            'last_enriched_at'    => $this->last_enriched_at,
            'created_at'          => $this->created_at,
            'updated_at'          => $this->updated_at,
        ];
    }
}
