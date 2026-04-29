<?php
namespace App\Http\Resources\Api\V1;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RelationshipResource extends JsonResource {
    public function toArray(Request $request): array {
        $user = $request->user();
        $inVaultContext = $user?->isOwnerOrAdmin() ?? false;

        $source = $this->whenLoaded('sourceActor');
        $target = $this->whenLoaded('targetActor');

        $base = [
            'id'               => $this->id,
            'source_actor_id'  => $this->source_actor_id,
            'target_actor_id'  => $this->target_actor_id,
            'source_actor'     => $source ? [
                'id'                 => $source->id,
                'display_name'       => $source->display_name,
                'actor_type'         => $source->actor_type,
                'reliability_profile'=> $source->reliability_profile,
            ] : null,
            'target_actor'     => $target ? [
                'id'                 => $target->id,
                'display_name'       => $target->display_name,
                'actor_type'         => $target->actor_type,
                'reliability_profile'=> $target->reliability_profile,
            ] : null,
            'relationship_type'=> $this->relationship_type,
            'direction'        => $this->direction,
            'status'           => $this->status,
            'reliability_grade'=> $this->reliability_grade,
            'acknowledged'     => $this->acknowledged,
            'start_date'       => $this->start_date,
            'end_date'         => $this->end_date,
            'last_confirmed_at'=> $this->last_confirmed_at,
            'notes'            => $this->notes,
            'created_at'       => $this->created_at,
        ];

        if ($inVaultContext) {
            $base['stance']                  = $this->stance;
            $base['actual_influence']        = $this->actual_influence;
            $base['posture_toward_operator'] = $this->posture_toward_operator;
            $base['leverage_read']           = $this->leverage_read;
        }

        return $base;
    }
}
