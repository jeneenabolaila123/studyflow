<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Note;

class AiController extends Controller
{

    // =========================
    // Generate ONE Question (FAST + SAFE 🔥)
    // =========================
    public function generateQuestion(Request $request)
    {
        $request->validate([
            'note_id' => 'required|exists:notes,id'
        ]);

        try {

            $note = Note::find($request->note_id);

            if (!$note || !$note->text_content) {
                return response()->json([
                    "question" => "No content available"
                ]);
            }

            // 🔥 تنظيف + حجم مناسب
            $text = substr(strip_tags($note->text_content), 0, 300);

            $response = Http::timeout(60) // 🔥 مهم
                ->post('http://127.0.0.1:8001/generate-one', [
                    'text' => $text
                ]);

            // 🔥 request فشل
            if (!$response->successful()) {
                return response()->json([
                    "question" => "What is the main idea?"
                ]);
            }

            // 🔥 قراءة آمنة
            $raw = trim($response->body() ?? '');
            $raw = preg_replace('/\s+/', ' ', $raw);

            Log::info("AI RAW:", ['body' => $raw]);

            // =========================
            // 🔥 fallback إذا فاضي
            // =========================
            if (!$raw || strtolower($raw) === "ai failed") {
                return response()->json([
                    "question" => "What is the main concept?"
                ]);
            }

            // =========================
            // 🔥 إذا ما فيه ؟ نضيفها
            // =========================
            if (!str_contains($raw, '?')) {
                $raw = substr($raw, 0, 80) . '?';
            }

            // =========================
            // 🔥 قص السؤال
            // =========================
            if (preg_match('/([^?]{5,100}\?)/', $raw, $matches)) {
                return response()->json([
                    "question" => trim($matches[1])
                ]);
            }

            // 🔥 fallback نهائي
            return response()->json([
                "question" => substr($raw, 0, 80) . '?'
            ]);

        } catch (\Throwable $e) {

            Log::error("AI ERROR:", [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                "question" => "What is this topic about?"
            ]);
        }
    }


    // =========================
    // Check Answer (KEEP INSTRUCT 🔥)
    // =========================
    public function checkAnswer(Request $request)
    {
        $request->validate([
            'question' => 'required|string',
            'answer' => 'required|string',
        ]);

        try {

            $prompt = "
Answer with only CORRECT or INCORRECT.

Question: {$request->question}
Answer: {$request->answer}
";

            $response = Http::timeout(30)
                ->post('http://127.0.0.1:11434/api/generate', [
                    "model" => "gemma:2b-instruct", // 🔥 خليه instruct هون
                    "prompt" => $prompt,
                    "stream" => false,
                    "options" => [
                        "temperature" => 0,
                        "num_predict" => 5
                    ]
                ]);

            if (!$response->successful()) {
                return response()->json([
                    "result" => "ERROR"
                ]);
            }

            $raw = strtoupper(trim($response->json()['response'] ?? ''));

            if (!$raw) {
                return response()->json([
                    "result" => "ERROR"
                ]);
            }

            if (str_contains($raw, "CORRECT")) {
                return response()->json([
                    "result" => "CORRECT"
                ]);
            }

            if (str_contains($raw, "INCORRECT")) {
                return response()->json([
                    "result" => "INCORRECT"
                ]);
            }

            return response()->json([
                "result" => "ERROR"
            ]);

        } catch (\Throwable $e) {

            Log::error("CheckAnswer Error", [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                "result" => "ERROR"
            ]);
        }
    }
}
