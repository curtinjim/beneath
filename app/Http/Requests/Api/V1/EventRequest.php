<?php
namespace App\Http\Requests\Api\V1;
use Illuminate\Foundation\Http\FormRequest;
class EventRequest extends FormRequest {
    public function authorize(): bool { return true; }
    public function rules(): array {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes|required';
        return [
            'event_type'         => "$required|in:claim,commitment,admission,denial,action,silence,position,affiliation_change,communication,signal,meeting,operator_note",
            'summary'            => "$required|string|max:200",
            'content'            => "$required|string",
            'supporting_text'    => 'nullable|string',
            'reliability_grade'  => "$required|in:bedrock,rock,sand,mud,fog",
            'event_date'         => 'nullable|date',
            'date_precision'     => 'nullable|in:exact,approximate,year_only,unknown',
            'source_type'        => "$required|in:document,email,harvest,operator",
            'pool'               => 'nullable|in:commons,vault',
            'project_id'         => 'nullable|uuid',
            'related_actor_ids'  => 'nullable|array',
            'related_event_ids'  => 'nullable|array',
            'operator_annotation'=> 'nullable|string',
        ];
    }
}
