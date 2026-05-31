<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AiTutorController extends Controller
{
    private function aiTutorUrl(?string $endpoint = null): string
    {
        $baseUrl = rtrim(config('services.ai_tutor.url', 'http://127.0.0.1:8001'), '/');
        $endpoint = $endpoint ?? '/generate-quiz';

        return $baseUrl . '/' . ltrim($endpoint, '/');
    }

    private function normalizeQuizType(string $quizType): string
    {
        return $quizType === 'fill_in_blank' ? 'fill_blank' : $quizType;
    }

    private function safeFileName(?string $title): string
    {
        $name = $title ?: 'studyflow_document';
        $name = preg_replace('/[^A-Za-z0-9_\-]/', '_', $name);
        $name = trim($name ?: 'studyflow_document', '_');

        return ($name ?: 'studyflow_document') . '.pdf';
    }

    private function buildQuestionPrompt(string $quizType, string $difficulty, int $count): string
    {
        $label = match ($quizType) {
            'mcq' => 'multiple choice questions',
            'true_false' => 'true/false questions',
            'subjective' => 'subjective exam questions',
            'fill_blank' => 'fill in the blank questions',
            default => 'quiz questions',
        };

        return "Generate exactly {$count} {$label} from the provided PDF only.\n"
            . "Difficulty: {$difficulty}.\n"
            . "Use only the PDF content. Do not add outside information.\n"
            . "Do not use memorized or hardcoded questions.\n"
            . "Return questions with answers and explanations if possible.";
    }

    private function cleanBom(string $text): string
    {
        // Remove real UTF-8 BOM
        $text = preg_replace('/^\xEF\xBB\xBF/', '', $text) ?? $text;

        // Remove visible BOM text if PowerShell/PHP displays it like this
        $text = preg_replace('/^Ã¯Â»Â¿/', '', $text) ?? $text;

        return trim($text);
    }

    private function decodeAiTutorResponse($response): array
    {
        $raw = $this->cleanBom($response->body());

        $data = json_decode($raw, true);

        // Sometimes Laravel receives JSON as a JSON-encoded string.
        // Example: "{\"success\":true,...}"
        if (is_string($data)) {
            $inner = $this->cleanBom($data);
            $decodedAgain = json_decode($inner, true);

            if (json_last_error() === JSON_ERROR_NONE && is_array($decodedAgain)) {
                $data = $decodedAgain;
            }
        }

        if (!is_array($data)) {
            return [
                'success' => false,
                'message' => 'AI Tutor returned invalid JSON.',
                'raw' => $raw,
                'json_error' => json_last_error_msg(),
            ];
        }

        return $data;
    }

    public function health()
    {
        $url = $this->aiTutorUrl('/health');

        try {
            $response = Http::timeout(10)->acceptJson()->get($url);

            $data = $this->decodeAiTutorResponse($response);

            return response()->json([
                'ok' => $response->successful(),
                'called_url' => $url,
                'status' => $response->status(),
                'ai_tutor' => $data,
            ], $response->successful() ? 200 : $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'message' => 'AI Tutor service is not reachable.',
                'called_url' => $url,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function generateQuiz(Request $request)
    {
        $validated = $request->validate([
            'document' => ['nullable', 'file', 'mimes:pdf', 'max:51200'],
            'file' => ['nullable', 'file', 'mimes:pdf', 'max:51200'],

            'content' => ['nullable', 'string', 'min:20'],
            'title' => ['nullable', 'string'],

            'quiz_type' => ['nullable', 'string', 'in:mcq,true_false,subjective,fill_blank,fill_in_blank'],
            'type' => ['nullable', 'string', 'in:mcq,true_false,subjective,fill_blank,fill_in_blank'],

            'difficulty' => ['nullable', 'string'],
            'questions_count' => ['nullable', 'integer', 'min:1', 'max:10'],
            'total_questions' => ['nullable', 'integer', 'min:1', 'max:10'],
        ]);

        $uploadedPdf = $request->file('document') ?? $request->file('file');

        $count = (int) (
            $validated['questions_count']
            ?? $validated['total_questions']
            ?? 5
        );

        $quizTypeRaw = $validated['quiz_type']
            ?? $validated['type']
            ?? 'mcq';

        $quizType = $this->normalizeQuizType($quizTypeRaw);
        $difficulty = $validated['difficulty'] ?? 'mixed';
        $title = $validated['title'] ?? 'StudyFlow Note';

        $timeout = (int) config('services.ai_tutor.timeout', 700);

        try {
            /*
            |--------------------------------------------------------------------------
            | CASE 1: Frontend/Laravel sends text content
            |--------------------------------------------------------------------------
            | This uses FastAPI /generate-quiz directly.
            | This is faster and avoids converting text to a temporary PDF.
            */
            if (!$uploadedPdf) {
                $content = trim($validated['content'] ?? '');

                if ($content === '') {
                    return response()->json([
                        'success' => false,
                        'message' => 'PDF file or content is required.',
                        'expected_field' => 'document, file, or content',
                    ], 422);
                }

                $url = $this->aiTutorUrl('/generate-quiz');

                $response = Http::timeout($timeout)
                    ->connectTimeout(20)
                    ->acceptJson()
                    ->asJson()
                    ->post($url, [
                        'content' => $content,
                        'title' => $title,
                        'quiz_type' => $quizType,
                        'type' => $quizType,
                        'difficulty' => $difficulty,
                        'questions_count' => $count,
                        'total_questions' => $count,
                    ]);

                $data = $this->decodeAiTutorResponse($response);

                if (!$response->successful()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'AI Tutor quiz generation failed.',
                        'called_url' => $url,
                        'status' => $response->status(),
                        'source_mode' => 'content_json',
                        'error' => $data,
                    ], $response->status());
                }

                return response()->json($data);
            }

            /*
            |--------------------------------------------------------------------------
            | CASE 2: Frontend/Laravel sends an uploaded PDF
            |--------------------------------------------------------------------------
            | This uses FastAPI /post because that endpoint accepts multipart PDF.
            */
            $url = $this->aiTutorUrl('/post');

            $pdfPath = $uploadedPdf->getRealPath();
            $pdfName = $uploadedPdf->getClientOriginalName()
                ?: $this->safeFileName($title);
            $pdfMime = $uploadedPdf->getMimeType() ?: 'application/pdf';

            $questionPrompt = $this->buildQuestionPrompt($quizType, $difficulty, $count);

            $response = Http::timeout($timeout)
                ->connectTimeout(20)
                ->acceptJson()
                ->attach(
                    'document',
                    file_get_contents($pdfPath),
                    $pdfName,
                    [
                        'Content-Type' => $pdfMime,
                    ]
                )
                ->post($url, [
                    'question' => $questionPrompt,
                    'quiz_type' => $quizType,
                    'type' => $quizType,
                    'difficulty' => $difficulty,
                    'questions_count' => (string) $count,
                    'total_questions' => (string) $count,
                    'title' => $title,
                ]);

            $data = $this->decodeAiTutorResponse($response);

            if (!$response->successful()) {
                return response()->json([
                    'success' => false,
                    'message' => 'AI Tutor quiz generation failed.',
                    'called_url' => $url,
                    'status' => $response->status(),
                    'source_mode' => 'uploaded_pdf',
                    'sent_filename' => $pdfName,
                    'sent_mime' => $pdfMime,
                    'error' => $data,
                ], $response->status());
            }

            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Could not connect to AI Tutor service.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}