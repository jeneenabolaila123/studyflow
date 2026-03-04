<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AiController extends Controller
{
    public function summarize(Request $request)
    {
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
    }
}
