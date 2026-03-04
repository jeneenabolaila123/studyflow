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
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
<<<<<<< HEAD
            'pdf' => ['nullable', 'file', 'mimes:pdf', 'max:30720'],
=======
            'pdf' => ['nullable', 'file', 'mimes:pdf', 'max:51200'],
>>>>>>> 2f30f7bb1a249b844be9157f2da9601516d21379
        ];
    }
}
