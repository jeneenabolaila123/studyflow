<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * ChatRequest - Validates chat message input
 */
class ChatMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'message' => ['required', 'string', 'min:1', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'message.required' => 'Message cannot be empty',
            'message.max' => 'Message too long (max 2000 characters)',
        ];
    }
}

/**
 * StartChatRequest - Validates chat session creation
 */
class StartChatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'title' => ['string', 'max:255'],
            'note_id' => ['nullable', 'integer', 'exists:notes,id'],
            'context_type' => ['string', 'in:pdf,text,note,general'],
        ];
    }
}

/**
 * SummarizeRequest - Validates summarization input
 */
class SummarizeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'text' => ['required', 'string', 'min:10', 'max:50000'],
            'format' => ['string', 'in:bullet_points,paragraph,detailed'],
        ];
    }

    public function messages(): array
    {
        return [
            'text.required' => 'Text is required',
            'text.min' => 'Text must be at least 10 characters',
            'format.in' => 'Format must be: bullet_points, paragraph, or detailed',
        ];
    }
}

/**
 * GenerateQuizRequest - Validates quiz generation input
 */
class GenerateQuizRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'text' => ['required', 'string', 'min:50', 'max:50000'],
        ];
    }

    public function messages(): array
    {
        return [
            'text.required' => 'Text is required',
            'text.min' => 'Text must be at least 50 characters for quiz generation',
        ];
    }
}

/**
 * FileUploadRequest - Validates file uploads
 */
class FileUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,docx', 'max:20480'], // 20MB max
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'File is required',
            'file.mimes' => 'File must be: PDF, JPG, PNG, or DOCX',
            'file.max' => 'File size must not exceed 20MB',
        ];
    }
}
