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
    private const OLLAMA_URL = 'http://localhost:11434/api/generate';
    private const OLLAMA_MODEL = 'qwen2.5:3b';

    private function getNote(Request $request, int $noteId): ?Note
    {
        return Note::query()
            ->whereKey($noteId)
            ->where('user_id', $request->user()->id)
            ->first();
    }

    private function callOllama(string $prompt): ?string
    {
        $response = Http::timeout(60)->post(self::OLLAMA_URL, [
            'model'  => self::OLLAMA_MODEL,
            'prompt' => $prompt,
            'stream' => false,
        ]);

        if ($response->failed()) {
            return null;
        }

        $text = $response->json('response');

        if (! is_string($text) || trim($text) === '') {
            return null;
        }

        return $text;
    }

    private function prepareText(Note $note): ?string
    {
        $text = app(NoteContentExtractor::class)->extract($note);

        if (! $text) {
            return null;
        }

        return mb_substr(preg_replace('/\s+/', ' ', trim($text)), 0, 3000);
    }

    public function summarize(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'note_id' => ['required', 'integer'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('Validation error.', 422, $validator->errors()->toArray());
        }

        $note = $this->getNote($request, (int) $request->input('note_id'));

        if (! $note) {
            return ApiResponse::error('Note not found.', 404);
        }

        $this->authorize('view', $note);

        $cleanText = $this->prepareText($note);

        if (! $cleanText) {
            return ApiResponse::error('No note content available to summarize.', 422);
        }

        $prompt = <<<PROMPT
You are a study assistant. Summarize the following study material concisely and clearly.
Focus on the key concepts, important facts, and main takeaways.
Keep the summary well-structured and easy to understand.

Study material:
{$cleanText}
PROMPT;

        $aiResponse = $this->callOllama($prompt);

        if ($aiResponse === null) {
            return ApiResponse::error('Failed to get a response from the AI model.', 502);
        }

        $note->update([
            'ai_summary'              => $aiResponse,
            'ai_summary_generated_at' => now(),
        ]);

        return ApiResponse::success([
            'summary' => $aiResponse,
        ], 'OK');
    }

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

        $note = $this->getNote($request, (int) $request->input('note_id'));

        if (! $note) {
            return ApiResponse::error('Note not found.', 404);
        }

        $this->authorize('view', $note);

        $cleanText = $this->prepareText($note);

        if (! $cleanText) {
            return ApiResponse::error('No note content available to generate a quiz from.', 422);
        }

        $prompt = <<<PROMPT
You are a quiz generator. Using the study material below, generate exactly {$count} multiple choice questions.

Rules:
- Each question must have exactly 4 options labeled A, B, C, and D.
- Clearly indicate the correct answer for each question.
- Do not repeat questions.
- Base every question strictly on the provided material.
- Respond ONLY with a valid JSON array. No explanation, no markdown, no code fences.

JSON format:
[
  {
    "number": 1,
    "question": "What is ...?",
    "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
    "answer": "A"
  }
]

Study material:
{$cleanText}
PROMPT;

        $aiResponse = $this->callOllama($prompt);

        if ($aiResponse === null) {
            return ApiResponse::error('Failed to get a response from the AI model.', 502);
        }

        $questions = $this->parseQuizJson($aiResponse);

        return ApiResponse::success([
            'questions' => $questions,
        ], 'OK');
    }

    private function parseQuizJson(string $response): array
    {
        if (preg_match('/\[.*\]/s', $response, $matches)) {
            $decoded = json_decode($matches[0], true);
            if (is_array($decoded)) {
                return $decoded;
            }
            \Illuminate\Support\Facades\Log::warning('AiController: Failed to decode quiz JSON', [
                'error'    => json_last_error_msg(),
                'fragment' => mb_substr($matches[0], 0, 200),
            ]);
        }

        return [];
    }

    public function chat(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'note_id' => ['required', 'integer'],
            'message' => ['required', 'string', 'max:1000'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('Validation error.', 422, $validator->errors()->toArray());
        }

        $note = $this->getNote($request, (int) $request->input('note_id'));

        if (! $note) {
            return ApiResponse::error('Note not found.', 404);
        }

        $this->authorize('view', $note);

        $cleanText = $this->prepareText($note);

        if (! $cleanText) {
            return ApiResponse::error('No note content available to chat about.', 422);
        }

        $message = strip_tags((string) $request->input('message'));

        $prompt = <<<PROMPT
You are a helpful study assistant. Answer the student's question based on the study material provided below.
Be concise, clear, and helpful. If the answer is not found in the material, say so.

Study material:
{$cleanText}

Student's question: {$message}
PROMPT;

        $aiResponse = $this->callOllama($prompt);

        if ($aiResponse === null) {
            return ApiResponse::error('Failed to get a response from the AI model.', 502);
        }

        return ApiResponse::success([
            'reply' => $aiResponse,
        ], 'OK');
    }
}
