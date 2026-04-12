<?php

namespace Tests\Feature;

use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use App\Jobs\GenerateNoteSummaryJob;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NoteUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_accepts_supported_study_file_types(): void
    {
        Storage::fake('private');
        Queue::fake();
        Http::fake([
            'http://localhost:11434/api/generate' => Http::response([
                'response' => 'Auto summary for uploaded note',
            ]),
        ]);

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $file = UploadedFile::fake()->createWithContent(
            'lecture-notes.txt',
            "Week 4 lecture handout\n\nCells use ATP to transfer energy."
        );

        $response = $this->post('/api/notes', [
            'title' => 'Lecture notes',
            'description' => 'Week 4 lecture handout',
            'file' => $file,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.original_filename', 'lecture-notes.txt')
            ->assertJsonPath('data.status', 'processing')
            ->assertJsonPath('data.source_type', 'file');

        $note = Note::query()->latest('id')->firstOrFail();

        $this->assertTrue(Storage::disk('private')->exists($note->stored_path));
        $this->assertSame('processing', $note->status);
        $this->assertSame('file', $note->source_type);
        $this->assertNotNull($note->text_content);
        Queue::assertPushed(GenerateNoteSummaryJob::class, 1);
    }

    public function test_it_accepts_pasted_study_text(): void
    {
        Queue::fake();
        Http::fake([
            'http://localhost:11434/api/generate' => Http::response([
                'response' => 'Auto summary for pasted note',
            ]),
        ]);

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/notes', [
            'title' => 'Revision outline',
            'description' => 'Manual summary source',
            'text_content' => "Photosynthesis captures light energy and stores it as chemical energy.",
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.source_type', 'text')
            ->assertJsonPath('data.status', 'processing')
            ->assertJsonPath('data.has_file', false);

        $note = Note::query()->latest('id')->firstOrFail();

        $this->assertSame('text', $note->source_type);
        $this->assertSame('processing', $note->status);
        $this->assertSame(
            'Photosynthesis captures light energy and stores it as chemical energy.',
            $note->text_content
        );
        Queue::assertPushed(GenerateNoteSummaryJob::class, 1);
    }
}
