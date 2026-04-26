<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GenerateQuizRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'difficulty' => $this->difficulty
                ? strtolower(trim((string) $this->difficulty))
                : 'medium',
            'title' => $this->title
                ? trim((string) $this->title)
                : 'Uploaded PDF',
            'extracted_text' => $this->extracted_text
                ? trim((string) $this->extracted_text)
                : null,
        ]);
    }

    public function rules(): array
    {
        return [
            'extracted_text' => ['required', 'string', 'min:50'],
            'difficulty' => ['nullable', 'in:easy,medium,hard'],
            'title' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'extracted_text.required' => 'Extracted text is required.',
            'extracted_text.min' => 'Extracted text is too short to generate a quiz.',
            'difficulty.in' => 'Difficulty must be easy, medium, or hard.',
            'title.max' => 'Title must not exceed 500 characters.',
        ];
    }
}
