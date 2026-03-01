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
        $file = $request->file('pdf');

        $storedPath = $file->store('notes', 'private');

        try {
            $note = Note::create([
                'user_id' => $request->user()->id,
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'original_filename' => $file->getClientOriginalName(),
                'stored_path' => $storedPath,
                'mime_type' => $file->getMimeType() ?: 'application/pdf',
                'file_size' => $file->getSize(),
                'status' => 'uploaded',
            ]);
        } catch (\Throwable $e) {
            Storage::disk('private')->delete($storedPath);
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

        $disk = Storage::disk('private');

        if (! $disk->exists($note->stored_path)) {
            abort(404);
        }

        $stream = $disk->readStream($note->stored_path);
        $downloadName = basename($note->original_filename);

        return response()->streamDownload(function () use ($stream) {
            if (is_resource($stream)) {
                fpassthru($stream);
                fclose($stream);
            }
        }, $downloadName, [
            'Content-Type' => $note->mime_type,
            'Content-Length' => (string) $note->file_size,
        ]);
    }

    public function destroy(Request $request, int $id)
    {
        $note = $this->userNoteOrFail($request, $id);
        $this->authorize('delete', $note);

        Storage::disk('private')->delete($note->stored_path);
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
