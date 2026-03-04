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
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],

            // PDF optional
            'pdf' => ['nullable', 'file', 'mimes:pdf', 'max:51200'],

            // Text optional
            'text_content' => ['nullable', 'string', 'min:20'],
            'txt_file' => ['nullable', 'file', 'mimes:txt', 'max:2048'], // 2MB
        ];
    }
}
