<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class ProjectRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes|required';
        return [
            'name'           => "$required|string|max:255",
            'description'    => 'nullable|string',
            'goal_statement' => 'nullable|string',
        ];
    }
}
