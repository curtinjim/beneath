<?php
namespace App\Http\Requests\Api\V1;
use Illuminate\Foundation\Http\FormRequest;
class ActorRequest extends FormRequest {
    public function authorize(): bool { return true; }
    public function rules(): array {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes|required';
        return [
            'display_name'       => "$required|string|max:255",
            'aliases'            => 'nullable|array',
            'primary_email'      => 'nullable|email|max:255',
            'additional_emails'  => 'nullable|array',
            'reliability_profile'=> 'nullable|in:bedrock,rock,sand,mud,fog',
            'trajectory'         => 'nullable|in:ascending,stable,declining,unclear',
            'dormancy_state'     => 'nullable|in:active,dormant',
            'importance_tier'    => 'nullable|in:tier_1,tier_2,tier_3,unclassified',
            'tags'               => 'nullable|array',
            'notes'              => 'nullable|string',
            'subtype_data'       => 'nullable|array',
            'pool'               => 'nullable|in:commons,vault',
            'project_id'         => 'nullable|uuid',
        ];
    }
}
