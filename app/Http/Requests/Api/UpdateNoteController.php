<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\UpdateNoteRequest;
use App\Models\Note;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Storage;

class UpdateNoteController extends Controller
{
    public function __invoke(UpdateNoteRequest $request, $id)
    {
        $note = Note::findOrFail($id);

        // owner فقط
        $this->authorize('update', $note);

        if ($request->has('title')) {
            $note->title = $request->input('title');
        }

        if ($request->has('description')) {
            $note->description = $request->input('description');
        }

        // ✨ اسم عمود مسار الملف عندك
        $pathColumn = 'file_path'; // غيّريها إذا عندك pdf_path أو path

        // replace PDF (اختياري)
        if ($request->hasFile('pdf')) {

            if (!empty($note->{$pathColumn})) {
                Storage::disk('public')->delete($note->{$pathColumn});
            }

            $file = $request->file('pdf');
            $path = $file->store("notes/{$request->user()->id}", 'public');

            $note->{$pathColumn} = $path;
            $note->original_filename = $file->getClientOriginalName();
            $note->mime_type = $file->getMimeType();
            $note->file_size = $file->getSize();
            $note->status = 'uploaded';
        }

        $note->save();

        return ApiResponse::success($note, 'Note updated.');
    }
}
