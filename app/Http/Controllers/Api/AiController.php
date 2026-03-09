<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use App\Support\ApiResponse;
use App\Support\NoteContentExtractor;

class AiController extends Controller
{

    public function quiz(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'note_id' => ['required', 'integer'],
            'count'   => ['sometimes', 'integer', 'min:1', 'max:20'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('Validation error.', 422, $validator->errors()->toArray());
        }

        $count = (int) $request->input('count', 5);

        $note = Note::query()
            ->whereKey((int) $request->input('note_id'))
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $note) {
            return ApiResponse::error('Note not found.', 404);
        }
$this->authorize('view', $note);
        $text = app(NoteContentExtractor::class)->extract($note);

        if (! $text) {
            return ApiResponse::error('No note content available to generate a quiz from.', 422);
        }

$text = preg_replace('/\s+/', ' ', trim($text));
$cleanText = mb_substr($text, 0, 3000);
        $prompt = <<<PROMPT
You are a quiz generator. Using the study material below, generate exactly {$count} multiple choice questions.

Rules:
- Each question must have exactly 4 options labeled A, B, C, and D.
- Clearly indicate the correct answer for each question.
- Do not repeat questions.
- Base every question strictly on the provided material.

Study material:
{$cleanText}
PROMPT;

        $response = Http::timeout(60)->post('http://localhost:11434/api/generate', [
            'model'  => 'qwen2.5:3b',
            'prompt' => $prompt,
            'stream' => false,
        ]);

        if ($response->failed()) {
            return ApiResponse::error('Failed to get a response from the AI model.', 502);
        }

        $aiResponse = $response->json('response') ?? $response->body();

        return ApiResponse::success([
            'quiz' => $aiResponse,
        ], 'OK');
    }
}
