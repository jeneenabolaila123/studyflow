<?php

namespace App\Http\Controllers;

use App\Models\Note;
use App\Services\PaidAiClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ApiAiController extends Controller
{
    public function summary(Request $request, PaidAiClient $ai)
    {
        $validated = $request->validate([
            'note_id' => ['nullable', 'integer'],
            'content' => ['nullable', 'string'],
        ]);

        try {
            $content = $validated['content'] ?? '';

            if (!$content && !empty($validated['note_id'])) {
                $note = Note::findOrFail($validated['note_id']);

                $content =
                    $note->content
                    ?? $note->text
                    ?? $note->extracted_text
                    ?? $note->text_content
                    ?? $note->body
                    ?? '';
            }

            $content = trim($content);

            if ($content === '') {
                return response()->json([
                    'success' => false,
                    'message' => 'No note or PDF text found for API summary.',
                ], 422);
            }

            $summary = $ai->generateSummary($content);

            return response()->json([
                'success' => true,
                'provider' => 'api',
                'summary' => $summary,

                // Extra compatibility fields in case your frontend expects direct keys
                'main_ideas' => $summary['main_ideas'],
                'key_facts' => $summary['key_facts'],
                'important_details' => $summary['important_details'],
                'exam_revision_notes' => $summary['exam_revision_notes'],
            ]);
        } catch (\Throwable $e) {
            Log::error('API summary controller failed', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'API summary failed. Please try again.',
                'error' => app()->environment('local') ? $e->getMessage() : null,
            ], 500);
        }
    }
    public function ask(Request $request, PaidAiClient $ai)
    {
        $validated = $request->validate([
            'note_id' => ['nullable', 'integer'],
            'content' => ['nullable', 'string'],
            'question' => ['required', 'string', 'min:2'],
        ]);

        try {
            $content = $validated['content'] ?? '';

            if (!$content && !empty($validated['note_id'])) {
                $note = Note::findOrFail($validated['note_id']);

                $content =
                    $note->content
                    ?? $note->text
                    ?? $note->extracted_text
                    ?? $note->text_content
                    ?? $note->body
                    ?? '';
            }

            $content = trim($content);

            if ($content === '') {
                return response()->json([
                    'success' => false,
                    'message' => 'No note or PDF text found for API ask.',
                ], 422);
            }

            $result = $ai->answerQuestion($content, $validated['question']);

            return response()->json([
                'success' => true,
                'provider' => 'api',
                'answer' => $result['answer'] ?? '',
                'key_points' => $result['key_points'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::error('API ask controller failed', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'API ask failed. Please try again.',
                'error' => app()->environment('local') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
