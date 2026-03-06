<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [

            'title' => [
                'sometimes',
                'required',
                'string',
                'max:255'
            ],

            'description' => [
                'nullable',
                'string'
            ],

            'pdf' => [
                'nullable',
                'file',
                'mimes:pdf',
                'max:51200'
            ],

            'text_content' => [
                'nullable',
                'string'
            ],

            'txt_file' => [
                'nullable',
                'file',
                'mimes:txt,text/plain',
                'max:10240'
            ],

        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {

            $hasPdf = $this->hasFile('pdf');
            $hasTxt = $this->hasFile('txt_file');
            $hasText = trim((string)$this->input('text_content')) !== '';

            if (!$hasPdf && !$hasTxt && !$hasText) {
                $validator->errors()->add(
                    'content',
                    'You must upload a PDF, paste text, or upload a TXT file.'
                );
            }

        });
    }
}
