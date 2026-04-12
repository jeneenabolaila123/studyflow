<?php

namespace App\Jobs;

use App\Models\Note;
use App\Services\AI\NoteAiService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use RuntimeException;

class GenerateNoteSummaryJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;
    public int $timeout = 1200;

    public function __construct(
        public readonly int $noteId,
        public readonly string $format = 'paragraph'
    ) {}

    public function handle(NoteAiService $noteAiService): void
    {
        $note = Note::query()->find($this->noteId);

        if (! $note) {
            return;
        }

        try {
            $note->forceFill(['status' => 'processing'])->save();
            $noteAiService->summarize($note, $this->format);
        } catch (RuntimeException $exception) {
            $note->forceFill([
                'status' => 'failed',
                'ai_summary' => '',
            ])->save();

            throw $exception;
        }
    }
}
