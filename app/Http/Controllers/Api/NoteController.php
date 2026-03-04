<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreNoteRequest;
use App\Http\Resources\NoteResource;
use App\Models\Note;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class NoteController extends Controller
{
    public function index(Request $request)
    {
        $notes = $request->user()
            ->notes()
            ->latest()
            ->paginate(15);

        $payload = NoteResource::collection($notes)->response()->getData(true);

        return ApiResponse::success(
            $payload['data'] ?? [],
            'OK',
            200,
            [
                'links' => $payload['links'] ?? null,
                'pagination' => $payload['meta'] ?? null,
            ]
        );
    }

    public function store(StoreNoteRequest $request)
    {
        $data = $request->validated();

        $pdfFile = $request->file('pdf');
        $txtFile = $request->file('txt_file');
        $textContent = $data['text_content'] ?? null;

        if (!$pdfFile && !$txtFile && !$textContent) {
            return ApiResponse::error('Provide either a PDF, a TXT file, or text content.', 422);
        }

        $storedPath = null;
        $originalFilename = null;
        $mimeType = null;
        $fileSize = null;

        // If a PDF is uploaded, it stays the "primary" stored file.
        if ($pdfFile) {
            $storedPath = $pdfFile->store('notes', 'private');
            $originalFilename = $pdfFile->getClientOriginalName();
            $mimeType = $pdfFile->getMimeType() ?: 'application/pdf';
            $fileSize = $pdfFile->getSize();
        }

        // If a TXT file is uploaded, read its contents into text_content.
        // We do NOT overwrite the stored PDF path/metadata if a PDF is also uploaded.
        if ($txtFile) {
            $fileText = file_get_contents($txtFile->getRealPath());
            if (is_string($fileText) && $fileText !== '') {
                $textContent = $fileText;
            }

            // If there's no PDF, we may store the txt file as the primary stored file.
            if (!$pdfFile) {
                $storedPath = $txtFile->store('notes_txt', 'private');
                $originalFilename = $txtFile->getClientOriginalName();
                $mimeType = $txtFile->getMimeType() ?: 'text/plain';
                $fileSize = $txtFile->getSize();
            }
        }

        $sourceType = $pdfFile ? 'pdf' : 'text';

        try {
            $note = Note::create([
                'user_id' => $request->user()->id,
                'title' => $data['title'],
                'description' => $data['description'] ?? null,

                // file info (nullable if copy/paste text)
                'original_filename' => $originalFilename,
                'stored_path' => $storedPath,
                'mime_type' => $mimeType,
                'file_size' => $fileSize,

                // text support
                'source_type' => $sourceType,
                'text_content' => $textContent,

                'status' => 'uploaded',
            ]);
        } catch (\Throwable $e) {
            if ($storedPath) {
                Storage::disk('private')->delete($storedPath);
            }
            throw $e;
        }

        return ApiResponse::success((new NoteResource($note))->resolve($request), 'Note created.', 201);
    }

    public function show(Request $request, int $id)
    {
        $note = $this->userNoteOrFail($request, $id);
        $this->authorize('view', $note);

        return ApiResponse::success((new NoteResource($note))->resolve($request), 'OK');
    }

    public function download(Request $request, int $id)
    {
        $note = $this->userNoteOrFail($request, $id);
        $this->authorize('download', $note);

        // إذا note بدون ملف (copy/paste text) ما في download
        if (!$note->stored_path) {
            return ApiResponse::error('No file available for download for this note.', 422);
        }

        $disk = Storage::disk('private');

        if (!$disk->exists($note->stored_path)) {
            abort(404);
        }

        $stream = $disk->readStream($note->stored_path);
        $downloadName = $note->original_filename ? basename($note->original_filename) : 'note';

        return response()->streamDownload(function () use ($stream) {
            if (is_resource($stream)) {
                fpassthru($stream);
                fclose($stream);
            }
        }, $downloadName, [
            'Content-Type' => $note->mime_type ?? 'application/octet-stream',
            'Content-Length' => (string) ($note->file_size ?? 0),
        ]);
    }

    public function destroy(Request $request, int $id)
    {
        $note = $this->userNoteOrFail($request, $id);
        $this->authorize('delete', $note);

        if ($note->stored_path) {
            Storage::disk('private')->delete($note->stored_path);
        }

        $note->delete();

        return ApiResponse::success(null, 'Note deleted.');
    }

    private function userNoteOrFail(Request $request, int $id): Note
    {
        return Note::query()
            ->where('user_id', $request->user()->id)
            ->whereKey($id)
            ->firstOrFail();
    }
}
