<?php

namespace App\Support;

use App\Models\Note;
use Illuminate\Support\Facades\Storage;
use Smalot\PdfParser\Parser;

class NoteContentExtractor
{
    public function extract(Note $note): ?string
    {

        /*
        1️⃣ If user pasted text
        */
        if (!empty($note->text_content)) {
            return trim($note->text_content);
        }


        /*
        2️⃣ If no file stored
        */
        if (!$note->stored_path) {
            return null;
        }


        /*
        3️⃣ Check file exists
        */
        $disk = Storage::disk('private');

        if (!$disk->exists($note->stored_path)) {
            return null;
        }


        /*
        4️⃣ Get file extension
        */
        $extension = strtolower(pathinfo($note->stored_path, PATHINFO_EXTENSION));


        /*
        ========================
        TXT FILE
        ========================
        */
        if ($extension === 'txt') {

            try {

                $content = $disk->get($note->stored_path);

                return trim($content) !== '' ? trim($content) : null;

            } catch (\Throwable $e) {

                return null;

            }

        }



        /*
        ========================
        PDF FILE
        ========================
        */
        if ($extension === 'pdf') {

            try {

                $content = $disk->get($note->stored_path);

                $parser = new Parser();

                $pdf = $parser->parseContent($content);

                $text = trim((string) $pdf->getText());

                if ($text === '') {
                    return null;
                }

                return $text;

            } catch (\Throwable $e) {

                return null;

            }

        }


        return null;
    }
}
