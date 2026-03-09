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

            // Exactly one source of content is required.
            // text_content is required when pdf is absent, and prohibits pdf when present.
            'text_content' => ['required_without:pdf', 'string', 'min:20', 'prohibits:pdf'],

            // pdf is required when text_content is absent; only PDF files accepted.
            'pdf'          => ['required_without:text_content', 'file', 'mimes:pdf', 'max:51200'],
        ];
    }
}
