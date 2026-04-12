<?php

namespace Tests\Feature;

use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AiSummarizeTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_summarizes_large_text_files_in_chunks(): void
    {
        Storage::fake('private');
        config()->set('services.ollama.chunk_size', 4500);

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $path = 'notes/biology-chapter.txt';
        $content = str_repeat("Cell respiration converts nutrients into energy for living systems. The process includes glycolysis, the Krebs cycle, and oxidative phosphorylation.\n\n", 90);

        Storage::disk('private')->put($path, $content);

        $note = Note::create([
            'user_id' => $user->id,
            'title' => 'Biology chapter',
            'description' => 'Metabolism revision notes',
            'original_filename' => 'biology-chapter.txt',
            'stored_path' => $path,
            'mime_type' => 'text/plain',
            'file_size' => strlen($content),
            'status' => 'uploaded',
        ]);

        Http::fake([
            'http://localhost:11434/api/generate' => Http::sequence()
                ->push(['response' => 'Chunk summary 1'])
                ->push(['response' => 'Chunk summary 2'])
                ->push(['response' => 'Chunk summary 3'])
                ->push(['response' => 'Final combined summary']),
        ]);

        $response = $this->postJson('/api/ai/summarize', [
            'note_id' => $note->id,
            'mode' => 'bullet_points',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.summary', 'Final combined summary')
            ->assertJsonPath('data.format', 'bullet_points');

        $note->refresh();

        $this->assertSame('Final combined summary', $note->ai_summary);
        $this->assertSame('ready', $note->status);
        $this->assertNotNull($note->ai_summary_generated_at);
        $this->assertGreaterThan(0, $note->extracted_text_length);
        $this->assertSame(3, $response->json('data.chunk_count'));

        Http::assertSentCount(4);
    }
}
