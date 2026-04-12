<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Note;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class AdminNotesController extends Controller
{
    public function index(Request $request)
    {
        $query = Note::query()->with(['user:id,name,email']);

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where('title', 'like', "%{$search}%");
        }

        if ($request->has('is_featured')) {
            $query->where('is_featured', $request->boolean('is_featured'));
        }

        $perPage = (int) $request->input('per_page', 10);
        $perPage = max(5, min(100, $perPage));

        $notes = $query->orderByDesc('created_at')->paginate($perPage);

        $mapped = collect($notes->items())->map(fn (Note $n) => [
            'id' => $n->id,
            'title' => $n->title,
            'description' => $n->description,
            'source_type' => $n->source_type,
            'is_featured' => (bool) $n->is_featured,
            'created_at' => $n->created_at,
            'user' => $n->user ? [
                'id' => $n->user->id,
                'name' => $n->user->name,
                'email' => $n->user->email,
            ] : null,
        ])->values();

        return ApiResponse::success([
            'notes' => $mapped,
            'pagination' => [
                'current_page' => $notes->currentPage(),
                'per_page' => $notes->perPage(),
                'total' => $notes->total(),
                'last_page' => $notes->lastPage(),
            ],
        ], 'Notes retrieved');
    }

    public function update(Request $request, Note $note)
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'source_type' => ['nullable', 'string', 'max:50'],
        ]);

        $note->fill($validated);
        $note->save();

        return ApiResponse::success([
            'id' => $note->id,
            'title' => $note->title,
            'description' => $note->description,
            'source_type' => $note->source_type,
            'is_featured' => (bool) $note->is_featured,
            'created_at' => $note->created_at,
        ], 'Note updated');
    }

    public function destroy(Request $request, Note $note)
    {
        $note->delete();

        return ApiResponse::success(null, 'Note deleted');
    }

    public function toggleFeatured(Request $request, Note $note)
    {
        $note->update(['is_featured' => ! (bool) $note->is_featured]);

        return ApiResponse::success([
            'id' => $note->id,
            'is_featured' => (bool) $note->is_featured,
        ], 'Note featured toggled');
    }
}
