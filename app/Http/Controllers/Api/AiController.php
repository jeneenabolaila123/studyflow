<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Note;
<<<<<<< HEAD
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
=======
use App\Support\ApiResponse;
use App\Support\NoteContentExtractor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
>>>>>>> 2f30f7bb1a249b844be9157f2da9601516d21379

class AiController extends Controller
{
    public function summarize(Request $request)
    {
<<<<<<< HEAD
        $request->validate([
            'note_id' => 'required|integer'
        ]);

        $note = Note::where('id', $request->note_id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if (!$note->stored_path || !Storage::disk('private')->exists($note->stored_path)) {
            return response()->json([
                'message' => 'PDF file not found.'
            ], 404);
        }

        // ⚡ مؤقتاً — بدون AI حقيقي (بس لنتأكد كل شي شغال)
        $fakeSummary = "This is a generated summary for note ID {$note->id}.";

        $note->update([
            'ai_summary' => $fakeSummary,
            'ai_summary_generated_at' => now()
        ]);

        return response()->json([
            'data' => [
                'summary' => $fakeSummary
            ]
        ]);
=======
        $validator = Validator::make($request->all(), [
            'note_id' => ['required', 'integer'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('Validation error.', 422, $validator->errors()->toArray());
        }

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
            return ApiResponse::error('No note content available to summarize.', 422);
        }

        // Temporary (non-AI) summary: first ~400 characters.
        $summary = mb_substr(preg_replace('/\s+/', ' ', $text), 0, 400);
        if (mb_strlen($text) > 400) {
            $summary .= '...';
        }

        $note->update([
            'ai_summary' => $summary,
            'ai_summary_generated_at' => now(),
        ]);

        return ApiResponse::success([
            'summary' => $summary,
        ], 'OK');
    }

    public function quiz(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'note_id' => ['required', 'integer'],
            'count' => ['nullable', 'integer', 'min:1', 'max:20'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('Validation error.', 422, $validator->errors()->toArray());
        }

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
            return ApiResponse::error('No note content available to generate a quiz.', 422);
        }

        $count = (int) ($request->input('count') ?? 5);
        $normalized = trim((string) preg_replace('/\s+/', ' ', $text));
        $seed = mb_substr($normalized, 0, 120);

        $questions = [];
        for ($i = 1; $i <= $count; $i++) {
            $questions[] = [
                'number' => $i,
                'question' => "Question {$i}: Based on the note, explain this idea: \"{$seed}\"",
            ];
        }

        return ApiResponse::success([
            'questions' => $questions,
        ], 'OK');
    }

    public function chat(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'note_id' => ['required', 'integer'],
            'message' => ['required', 'string', 'max:4000'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('Validation error.', 422, $validator->errors()->toArray());
        }

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
            return ApiResponse::error('No note content available to chat with.', 422);
        }

        // Temporary (non-AI) reply: echo the question and provide a snippet.
        $snippet = mb_substr(preg_replace('/\s+/', ' ', $text), 0, 300);
        if (mb_strlen($text) > 300) {
            $snippet .= '...';
        }

        $reply = "I read your note and here is a relevant excerpt:\n\n{$snippet}\n\nYour question was: \"" . (string) $request->input('message') . "\"";

        return ApiResponse::success([
            'reply' => $reply,
        ], 'OK');
>>>>>>> 2f30f7bb1a249b844be9157f2da9601516d21379
    }
}
