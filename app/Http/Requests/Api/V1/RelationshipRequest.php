<?php
namespace App\Http\Requests\Api\V1;
use Illuminate\Foundation\Http\FormRequest;
class RelationshipRequest extends FormRequest {
    public function authorize(): bool { return true; }
    public function rules(): array {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes|required';
        return [
            'target_actor_id'         => "$required|uuid",
            'relationship_type'       => "$required|in:affiliation,coalition,adversarial,subsidiary,contractual,regulatory,lobbying,personal,intermediary,ownership",
            'direction'               => "$required|in:directed,bidirectional",
            'reliability_grade'       => "$required|in:bedrock,rock,sand,mud,fog",
            'status'                  => 'nullable|in:active,historical,alleged,refuted',
            'acknowledged'            => 'nullable|boolean',
            'stance'                  => 'nullable|in:party_line,independent,divergent,unknown',
            'actual_influence'        => 'nullable|in:high,medium,low,unknown',
            'posture_toward_operator' => 'nullable|in:ally,neutral,adversarial,unknown',
            'leverage_read'           => 'nullable|in:channel,signal,risk,none',
            'start_date'              => 'nullable|date',
            'end_date'                => 'nullable|date',
            'notes'                   => 'nullable|string',
        ];
    }
}
