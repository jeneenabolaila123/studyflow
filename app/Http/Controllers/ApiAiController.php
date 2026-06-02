<?php

namespace App\Http\Controllers;

use App\Models\Note;
use App\Services\PaidAiClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ApiAiController extends Controller
{
    public function summary(Request $request, PaidAiClient $client)
    {
        try {
            $request->validate([
                'note_id' => ['nullable', 'integer'],
                'text' => ['nullable', 'string'],
                'title' => ['nullable', 'string'],
            ]);

            [$text, $title] = $this->resolveTextAndTitle($request);

            if (!$text) {
                return response()->json([
                    'success' => false,
                    'message' => 'No note text found for API summary.',
                ], 422);
            }

            $summary = $client->summarize($text, $title);

            return response()->json([
                'success' => true,
                'summary' => $summary,
            ]);
        } catch (\Throwable $e) {
            Log::error('API summary controller failed', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'API summary failed. Please try again.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function ask(Request $request, PaidAiClient $client)
    {
        try {
            $request->validate([
                'note_id' => ['required', 'integer'],
                'question' => ['required', 'string'],
            ]);

            [$text] = $this->resolveTextAndTitle($request);

            if (!$text) {
                return response()->json([
                    'success' => false,
                    'message' => 'No note text found for API ask.',
                ], 422);
            }

            $answer = $client->ask($text, $request->question);

            return response()->json([
                'success' => true,
                'answer' => $answer,
            ]);
        } catch (\Throwable $e) {
            Log::error('API ask controller failed', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'API ask failed. Please try again.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function quiz(Request $request, PaidAiClient $client)
    {
        try {
            $request->validate([
                'note_id' => ['nullable', 'integer'],
                'text' => ['nullable', 'string'],
            ]);

            [$text] = $this->resolveTextAndTitle($request);

            if (!$text) {
                return response()->json([
                    'success' => false,
                    'message' => 'No note text found for API quiz.',
                ], 422);
            }

            $questions = $client->quiz($text);

            return response()->json([
                'success' => true,
                'questions' => $questions,
            ]);
        } catch (\Throwable $e) {
            Log::error('API quiz controller failed', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'API quiz failed. Please try again.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function resolveTextAndTitle(Request $request): array
    {
        if ($request->filled('text')) {
            return [$request->input('text'), $request->input('title', 'this note')];
        }

        $note = Note::find($request->input('note_id'));

        if (!$note) {
            return ['', 'this note'];
        }

        $text =
            $note->text_content
            ?? $note->extracted_text
            ?? $note->content
            ?? $note->description
            ?? '';

        $title = $note->title ?? $note->original_filename ?? 'this note';

        return [trim((string) $text), $title];
    }
}
