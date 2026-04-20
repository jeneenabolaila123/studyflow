<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'        => ['required', 'string', 'max:255'],
            'description'  => ['nullable', 'string', 'max:2000'],
            'text_content' => ['nullable', 'string', 'min:20'],
            'pdf'          => ['nullable', 'file', 'mimes:pdf,ppt,pptx,txt', 'max:51200'],
            'question'     => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $hasFile = $this->hasFile('pdf');
            $hasText = filled($this->input('text_content'));

            if (!$hasFile && !$hasText) {
                $validator->errors()->add(
                    'pdf',
                    'Please upload a file or enter text content.'
                );
            }

            if ($hasFile && $hasText) {
                $validator->errors()->add(
                    'text_content',
                    'Please use only one source: upload a file or enter text content, not both.'
                );
            }
        });
    }
}
