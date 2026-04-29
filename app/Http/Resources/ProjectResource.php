<?php
namespace App\Http\Resources\Api\V1;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'name'                 => $this->name,
            'description'          => $this->description,
            'goal_statement'       => $this->goal_statement,
            'classification_level' => $this->classification_level,
            'narrative'            => $this->narrative,
            'narrative_at'         => $this->narrative_at,
            'archived_at'          => $this->archived_at,
            'created_at'           => $this->created_at,
        ];
    }
}
