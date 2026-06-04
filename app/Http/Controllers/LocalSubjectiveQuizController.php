<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LocalSubjectiveQuizController extends Controller
{
    public function generateFromFile(Request $request)
    {
        @ini_set('max_execution_time', '900');
        @ini_set('default_socket_timeout', '900');
        @ini_set('memory_limit', '1024M');
        set_time_limit(900);

        $request->validate([
            'file' => ['nullable', 'file', 'mimes:pdf', 'max:51200'],
            'pdf' => ['nullable', 'file', 'mimes:pdf', 'max:51200'],
            'model' => ['nullable', 'string'],
            'prompt' => ['nullable', 'string'],
        ]);

        $uploadedFile = $request->file('file') ?: $request->file('pdf');

        if (!$uploadedFile) {
            return response()->json([
                'ok' => false,
                'message' => 'Please upload a PDF file using field name file or pdf.',
            ], 422);
        }

        $baseUrl = rtrim(env('SUBJECTIVE_AI_URL', 'http://127.0.0.1:8017'), '/');
        $model = $request->input('model', 'llama3.2:3b');

        try {
            $http = Http::timeout(900)
                ->connectTimeout(10)
                ->attach(
                    'file',
                    file_get_contents($uploadedFile->getRealPath()),
                    $uploadedFile->getClientOriginalName()
                );

            $payload = [
                'model' => $model,
            ];

            if ($request->filled('prompt')) {
                $payload['prompt'] = $request->input('prompt');
            }

            $response = $http->post($baseUrl . '/api/v1/subjective/file', $payload);

            if ($response->failed()) {
                Log::error('Subjective AI service failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return response()->json([
                    'ok' => false,
                    'message' => 'Subjective AI service failed.',
                    'status' => $response->status(),
                    'error' => $response->json() ?: $response->body(),
                ], $response->status());
            }

            return response()->json($response->json());
        } catch (\Throwable $e) {
            Log::error('Could not connect to Subjective AI service', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'Could not connect to Subjective AI service on ' . $baseUrl . '.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
