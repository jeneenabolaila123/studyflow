<?php

namespace App\Support;

use App\Models\Note;
use Illuminate\Support\Facades\Storage;

class NoteContentExtractor
{
    public function extract(Note $note): ?string
    {
        $text = is_string($note->text_content) ? trim($note->text_content) : '';
        if ($text !== '') {
            return $text;
        }

        if (! $note->stored_path) {
            return null;
        }

        $disk = Storage::disk('private');
        if (! $disk->exists($note->stored_path)) {
            return null;
        }

        $mimeType = (string) ($note->mime_type ?? '');
        $looksLikePdf = str_contains(strtolower($mimeType), 'pdf') || $note->source_type === 'pdf';
        if (! $looksLikePdf) {
            // For now we only attempt PDF extraction.
            return null;
        }

        if (! class_exists(\Smalot\PdfParser\Parser::class)) {
            return null;
        }

        try {
            $content = $disk->get($note->stored_path);
            $parser = new \Smalot\PdfParser\Parser();
            $pdf = $parser->parseContent($content);
            $pdfText = trim((string) $pdf->getText());

            return $pdfText !== '' ? $pdfText : null;
        } catch (\Throwable $e) {
            return null;
        }
    }
}
