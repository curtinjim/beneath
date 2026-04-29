<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class HarvestingSignalResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                => $this->id,
            'actor_id'          => $this->actor_id,
            'harvesting_run_id' => $this->harvesting_run_id,
            'source_id'         => $this->source_id,
            'signal_type'       => $this->signal_type,
            'field_name'        => $this->field_name,
            'proposed_value'    => $this->proposed_value,
            'confidence'        => $this->confidence,
            'reliability_grade' => $this->reliability_grade,
            'source_label'      => $this->source_label,
            'source_url'        => $this->source_url,
            // raw_data NOT included in API responses (HARV-CON-005)
            'status'            => $this->status,
            'reviewed_by'       => $this->reviewed_by,
            'reviewed_at'       => $this->reviewed_at?->toIso8601String(),
            'created_at'        => $this->created_at->toIso8601String(),
            // Eager-loaded actor name for global queue
            'actor_name'        => $this->whenLoaded('actor', fn() => $this->actor->display_name),
        ];
    }
}
