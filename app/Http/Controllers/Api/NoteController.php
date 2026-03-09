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
    $file = $request->file('file');
    $textContent = $request->input('text_content');

    $storedPath = null;
    $originalFilename = null;
    $mimeType = null;
    $fileSize = null;

    if ($file) {
        $storedPath = $file->store('notes', 'private');
        $originalFilename = $file->getClientOriginalName();
        $mimeType = $file->getMimeType();
        $fileSize = $file->getSize();
    }

    $note = Note::create([
        'user_id'           => $request->user()->id,
        'title'             => $request->input('title'),
        'description'       => $request->input('description'),
        'original_filename' => $originalFilename,
        'stored_path'       => $storedPath,
        'mime_type'         => $mimeType,
        'file_size'         => $fileSize,
        'source_type'       => $file ? 'file' : 'text',
        'text_content'      => $textContent,
        'status'            => 'uploaded',
    ]);

    return ApiResponse::success(
        (new NoteResource($note))->resolve($request),
        'Note created.',
        201
    );
}

    public function show(Request $request, int $id)
    {
        $note = $this->userNoteOrFail($request, $id);

        return ApiResponse::success(
            (new NoteResource($note))->resolve($request),
            'OK'
        );
    }

    public function destroy(Request $request, int $id)
    {
        $note = $this->userNoteOrFail($request, $id);

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
