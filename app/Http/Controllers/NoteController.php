<?php

namespace App\Http\Controllers;

use App\Models\Note;
use Illuminate\Http\Request;

class NoteController extends Controller
{
    public function create()
    {
        return view('notes.create');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string', 'min:50'],
        ]);

        $note = Note::create([
            'user_id' => $request->user()->id,
            'title' => $data['title'],
            'content' => $data['content'],
        ]);

        return redirect()->route('notes.show', $note);
    }

    public function show(Note $note)
    {
        abort_unless(auth()->id() === $note->user_id, 403);
        return view('notes.show', compact('note'));
    }
}
