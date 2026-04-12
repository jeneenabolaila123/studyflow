<?php

namespace App\Services\AI;

use App\Models\Note;
use App\Services\Notes\NoteContentExtractor;
use Illuminate\Support\Str;

class NoteAiService
{
    public function __construct(
        private readonly NoteContentExtractor $contentExtractor,
        private readonly OllamaClient $ollamaClient,
        private readonly TextChunker $textChunker,
    ) {}

    public function summarize(Note $note, string $format = 'paragraph'): array
    {
        $format = $this->normalizeFormat($format);
        $text = $this->contentExtractor->extractAndStore($note);
        $chunks = $this->splitIntoChunks($text);

        $chunkSummaries = [];

        foreach ($chunks as $index => $chunk) {
            $chunkSummaries[] = $this->ollamaClient->generate(
                $this->buildChunkPrompt($chunk, $format, $index + 1, count($chunks))
            );
        }

        $summary = count($chunkSummaries) === 1
            ? $chunkSummaries[0]
            : $this->ollamaClient->generate($this->buildFinalPrompt($chunkSummaries, $format));

        $summary = trim($summary);

        $note->forceFill([
            'ai_summary' => $summary,
            'ai_summary_generated_at' => now(),
            'status' => 'ready',
        ])->save();

        return [
            'summary' => $summary,
            'format' => $format,
            'chunk_count' => count($chunks),
            'source_characters' => mb_strlen($text),
            'model' => (string) config('services.ollama.model', 'phi3:mini'),
        ];
    }

    public function quiz(Note $note): string
    {
        $context = $this->buildStudyContext($note);

        return $this->ollamaClient->generate(
            <<<PROMPT
You are an academic study assistant.

Create 5 quiz questions based only on the study material below.

Rules:
- Do not invent facts that are not present in the material.
- Focus on concept understanding, not trivia.
- Return a numbered list only.

MATERIAL:
{$context}
PROMPT
        );
    }

    public function chat(Note $note, string $message): string
    {
        $context = $this->buildStudyContext($note);

        return $this->ollamaClient->generate(
            <<<PROMPT
You are helping a student understand their uploaded study material.

Rules:
- Answer using only the supplied material.
- If the answer is not contained in the material, say that clearly.
- Keep explanations clear and student-friendly.

MATERIAL:
{$context}

QUESTION:
{$message}
PROMPT
        );
    }

    private function buildStudyContext(Note $note): string
    {
        $text = $this->contentExtractor->extractAndStore($note);

        // limit text size

        $summary = trim((string) $note->ai_summary);
        $excerpt = trim(Str::limit($text, 14000, ''));

        if ($summary !== '') {
            return "Summary:\n{$summary}\n\nStudy material excerpt:\n{$excerpt}";
        }

        return $excerpt;
    }

    private function normalizeFormat(string $format): string
    {
        return match ($format) {
            'bullet_points', 'points' => 'bullet_points',
            'detailed', 'detailed_explanation' => 'detailed',
            default => 'paragraph',
        };
    }

    private function splitIntoChunks(string $text): array
    {
        $chunks = $this->textChunker->chunkByApproxTokens($text);

        return $chunks === [] ? [trim($text)] : $chunks;
    }

    private function buildChunkPrompt(string $chunk, string $format, int $part, int $totalParts): string
    {
        $formatInstruction = $this->formatInstruction($format);

        return <<<PROMPT
You are an academic study assistant summarizing one chunk of a larger piece of study material.

Rules:
- Summarize only the provided content.
- Do not invent information.
- Keep the important academic ideas, terms, and relationships.
- Use clear language for students.
- This is part {$part} of {$totalParts}, so preserve facts that matter for the final combined summary.

Output style for this chunk:
{$formatInstruction}

DOCUMENT CHUNK:
{$chunk}
PROMPT;
    }

    private function buildFinalPrompt(array $chunkSummaries, string $format): string
    {
        $formatInstruction = $this->formatInstruction($format);
        $combined = implode("\n\n", array_map(
            fn(string $summary, int $index) => 'Chunk ' . ($index + 1) . ":\n" . $summary,
            $chunkSummaries,
            array_keys($chunkSummaries)
        ));

        return <<<PROMPT
You are combining partial summaries from a larger academic document into one final answer.

Rules:
- Use only the information in the partial summaries.
- Do not invent or broaden claims.
- Remove repetition.
- Keep the answer useful for a student studying the material.

Final output style:
{$formatInstruction}

PARTIAL SUMMARIES:
{$combined}
PROMPT;
    }

    private function formatInstruction(string $format): string
    {
        return match ($format) {
            'bullet_points' => 'Return concise bullet points covering the main ideas.',
            'detailed' => 'Return a detailed explanation with multiple paragraphs and enough context for revision.',
            default => 'Return one clear, readable paragraph.',
        };
    }
}
