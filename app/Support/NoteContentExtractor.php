<?php

namespace App\Support;

use App\Models\Note;
use Illuminate\Support\Facades\Storage;

class NoteContentExtractor
{
    public function extract(Note $note): ?string
    {
        // If user pasted text
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

        $mimeType = strtolower((string) ($note->mime_type ?? ''));

        /*
        TXT files
        */
        if (str_contains($mimeType, 'text/plain')) {
            try {
                $content = $disk->get($note->stored_path);
                return trim($content) !== '' ? trim($content) : null;
            } catch (\Throwable $e) {
                return null;
            }
        }

        /*
        PDF files
        */
        if (!str_contains($mimeType, 'pdf') && $note->source_type !== 'pdf') {
            return null;
        }

        if (!class_exists(\Smalot\PdfParser\Parser::class)) {
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
