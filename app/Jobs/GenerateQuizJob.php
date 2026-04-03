<?php

namespace App\Jobs;

use App\AI\QuizChain;
use App\Models\Note;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateQuizJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected int $noteId;
    protected string $difficulty;

    public function __construct(int $noteId, string $difficulty = 'medium')
    {
        $this->noteId = $noteId;
        $this->difficulty = $difficulty;
    }

    public function handle(): void
    {
        $note = Note::find($this->noteId);

        if (!$note) {
            return;
        }

        $chain = new QuizChain();

        $questions = $chain->run($note->text_content ?? '', $this->difficulty);

        if (!$questions) {
    Log::error("Quiz generation returned empty", [
        'note_id' => $this->noteId,
        'text_length' => strlen($note->text_content ?? '')
    ]);
    return;
}

        $note->quiz = json_encode($questions);
        $note->save();
    }
}
