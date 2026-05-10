<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AiTutorController extends Controller
{
    private function aiTutorUrl(?string $endpoint = null): string
    {
        $baseUrl = rtrim(config('services.ai_tutor.url', 'http://127.0.0.1:8015'), '/');
        $endpoint = $endpoint ?? config('services.ai_tutor.endpoint', '/post');

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

    private function escapePdfText(string $text): string
    {
        return str_replace(
            ['\\', '(', ')', "\r"],
            ['\\\\', '\(', '\)', ''],
            $text
        );
    }

    private function createTemporaryPdfFromText(string $text, ?string $title = null): string
    {
        $dir = storage_path('app/ai_tutor_temp');

        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        $filePath = $dir . DIRECTORY_SEPARATOR . uniqid('studyflow_', true) . '.pdf';

        $text = str_replace(["\r\n", "\r"], "\n", $text);
        $text = preg_replace('/[ \t]+/', ' ', $text) ?? $text;

        $paragraphs = preg_split("/\n+/", $text) ?: [];
        $lines = [];

        if ($title) {
            $lines[] = $title;
            $lines[] = '';
        }

        foreach ($paragraphs as $paragraph) {
            $paragraph = trim($paragraph);

            if ($paragraph === '') {
                $lines[] = '';
                continue;
            }

            $wrapped = wordwrap($paragraph, 90, "\n", true);
            foreach (explode("\n", $wrapped) as $line) {
                $lines[] = $line;
            }

            $lines[] = '';
        }

        if (count($lines) === 0) {
            $lines[] = 'No content provided.';
        }

        $linesPerPage = 52;
        $pages = array_chunk($lines, $linesPerPage);

        $objects = [];

        // 1 = Catalog, 2 = Pages, 3 = Font
        $objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";

        $kids = [];
        $pageObjects = [];

        $nextObjectId = 4;

        foreach ($pages as $pageLines) {
            $pageObjectId = $nextObjectId++;
            $contentObjectId = $nextObjectId++;

            $kids[] = "{$pageObjectId} 0 R";

            $streamLines = [];
            $streamLines[] = "BT";
            $streamLines[] = "/F1 10 Tf";
            $streamLines[] = "50 800 Td";
            $streamLines[] = "13 TL";

            foreach ($pageLines as $line) {
                $safeLine = $this->escapePdfText($line);
                $streamLines[] = "({$safeLine}) Tj";
                $streamLines[] = "T*";
            }

            $streamLines[] = "ET";

            $stream = implode("\n", $streamLines);

            $objects[$pageObjectId] =
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
                . "/Resources << /Font << /F1 3 0 R >> >> "
                . "/Contents {$contentObjectId} 0 R >>";

            $objects[$contentObjectId] =
                "<< /Length " . strlen($stream) . " >>\n"
                . "stream\n"
                . $stream . "\n"
                . "endstream";
        }

        $objects[2] = "<< /Type /Pages /Kids [" . implode(' ', $kids) . "] /Count " . count($kids) . " >>";
        $objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

        ksort($objects);

        $pdf = "%PDF-1.4\n";
        $offsets = [0];

        foreach ($objects as $id => $object) {
            $offsets[$id] = strlen($pdf);
            $pdf .= "{$id} 0 obj\n{$object}\nendobj\n";
        }

        $xrefOffset = strlen($pdf);
        $size = max(array_keys($objects)) + 1;

        $pdf .= "xref\n";
        $pdf .= "0 {$size}\n";
        $pdf .= "0000000000 65535 f \n";

        for ($i = 1; $i < $size; $i++) {
            $offset = $offsets[$i] ?? 0;
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }

        $pdf .= "trailer\n";
        $pdf .= "<< /Size {$size} /Root 1 0 R >>\n";
        $pdf .= "startxref\n";
        $pdf .= "{$xrefOffset}\n";
        $pdf .= "%%EOF";

        file_put_contents($filePath, $pdf);

        return $filePath;
    }

    public function health()
    {
        $baseUrl = rtrim(config('services.ai_tutor.url', 'http://127.0.0.1:8015'), '/');

        try {
            $response = Http::timeout(10)->get($baseUrl . '/openapi.json');

            return response()->json([
                'ok' => $response->successful(),
                'called_url' => $baseUrl . '/openapi.json',
                'status' => $response->status(),
                'available_paths' => array_keys($response->json('paths') ?? []),
            ], $response->successful() ? 200 : $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'AI Tutor service is not reachable.',
                'called_url' => $baseUrl . '/openapi.json',
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

            'quiz_type' => ['required', 'string', 'in:mcq,true_false,subjective,fill_blank,fill_in_blank'],
            'type' => ['nullable', 'string'],

            'difficulty' => ['nullable', 'string'],
            'questions_count' => ['nullable', 'integer', 'min:1', 'max:10'],
            'total_questions' => ['nullable', 'integer', 'min:1', 'max:10'],
        ]);

        $uploadedPdf = $request->file('document') ?? $request->file('file');
        $temporaryPdfPath = null;

        $url = $this->aiTutorUrl('/post');
        $timeout = (int) config('services.ai_tutor.timeout', 700);

        $count = $validated['questions_count']
            ?? $validated['total_questions']
            ?? 5;

        $quizType = $this->normalizeQuizType($validated['quiz_type']);
        $difficulty = $validated['difficulty'] ?? 'Mixed';

        $questionPrompt = $this->buildQuestionPrompt($quizType, $difficulty, $count);

        try {
            if ($uploadedPdf) {
                $pdfPath = $uploadedPdf->getRealPath();
                $pdfName = $uploadedPdf->getClientOriginalName();
                $pdfMime = $uploadedPdf->getMimeType() ?: 'application/pdf';
                $sourceMode = 'uploaded_pdf';
            } else {
                $content = trim($validated['content'] ?? '');

                if ($content === '') {
                    return response()->json([
                        'message' => 'PDF file or content is required.',
                        'reason' => 'FastAPI /post accepts PDF only, so Laravel needs either an uploaded PDF or text content to convert into a temporary PDF.',
                        'expected_field' => 'document or content',
                    ], 422);
                }

                $temporaryPdfPath = $this->createTemporaryPdfFromText(
                    $content,
                    $validated['title'] ?? 'StudyFlow Document'
                );

                $pdfPath = $temporaryPdfPath;
                $pdfName = $this->safeFileName($validated['title'] ?? 'studyflow_document');
                $pdfMime = 'application/pdf';
                $sourceMode = 'content_converted_to_pdf';
            }

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
                ]);

            $data = $response->json();

            if (!$response->successful()) {
                return response()->json([
                    'message' => 'AI Tutor quiz generation failed.',
                    'called_url' => $url,
                    'status' => $response->status(),
                    'source_mode' => $sourceMode,
                    'sent_filename' => $pdfName,
                    'sent_mime' => $pdfMime,
                    'error' => $data ?? $response->body(),
                ], $response->status());
            }

            return response()->json($data ?? [
                'raw' => $response->body(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Could not connect to AI Tutor service.',
                'called_url' => $url,
                'error' => $e->getMessage(),
            ], 500);
        } finally {
            if ($temporaryPdfPath && file_exists($temporaryPdfPath)) {
                @unlink($temporaryPdfPath);
            }
        }
    }
}
