<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class OllamaPdfRagController extends Controller
{
    private string $fastApiUrl = 'http://127.0.0.1:8017';

    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf',
        ]);

        $file = $request->file('file');

        $response = Http::timeout(900)
            ->attach(
                'file',
                file_get_contents($file->getRealPath()),
                $file->getClientOriginalName()
            )
            ->post($this->fastApiUrl . '/api/v1/pdfs/upload');

        return response()->json($response->json(), $response->status());
    }

    public function mcq(Request $request)
    {
        $response = Http::timeout(900)
            ->post($this->fastApiUrl . '/api/v1/quiz/mcq', [
                'pdf_id' => $request->pdf_id,
                'model' => $request->model ?? 'llama3.2:3b',
            ]);

        return response()->json($response->json(), $response->status());
    }
}
