<?php

namespace App\Services\Notes;

use App\Models\Note;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\IOFactory;
use RuntimeException;
use Smalot\PdfParser\Parser;
use SplFileObject;
use ZipArchive;

class NoteContentExtractor
{
    private const SUPPORTED_EXTENSIONS = [
        'pdf',
        'docx',
        'txt',
        'pptx',
    ];

    public function extractAndStore(Note $note): string
    {
        if (filled($note->text_content)) {
            return (string) $note->text_content;
        }

        if (filled($note->extracted_text)) {
            $text = $this->cleanText((string) $note->extracted_text);
        } else {
            $text = $this->extract($note);
        }

        $note->forceFill([
            'text_content' => $text,
            'extracted_text' => $text,
            'extracted_text_length' => mb_strlen($text),
        ])->save();

        return $text;
    }

    public function extract(Note $note): string
    {
        if (($note->source_type ?? 'file') !== 'file') {
            throw new RuntimeException('No uploaded file is available for this note.');
        }

        $disk = Storage::disk('private');

        if (! $note->stored_path || ! $disk->exists($note->stored_path)) {
            throw new RuntimeException('Study file not found.');
        }

        $path = $disk->path($note->stored_path);
        $extension = strtolower(pathinfo($note->original_filename ?? $path, PATHINFO_EXTENSION));

        return $this->extractFromPath($path, $extension);
    }

    public function extractFromStorage(string $storedPath, ?string $originalFilename = null): string
    {
        $disk = Storage::disk('private');

        if (! $disk->exists($storedPath)) {
            throw new RuntimeException('The uploaded file could not be stored for extraction.');
        }

        $path = $disk->path($storedPath);
        $extension = strtolower(pathinfo($originalFilename ?? $storedPath, PATHINFO_EXTENSION));

        return $this->extractFromPath($path, $extension);
    }

    public function cleanText(string $text): string
    {
        return $this->normalizeText($text);
    }

    private function extractFromPath(string $path, string $extension): string
    {
        if ($extension === '') {
            throw new RuntimeException('Unable to detect the uploaded file type.');
        }

        try {
            $text = match ($extension) {
                'pdf' => $this->extractPdf($path),
                'docx' => $this->extractDocx($path),
                'txt' => $this->extractTxt($path),
                'pptx' => $this->extractPptx($path),
                default => throw new RuntimeException('Unsupported file type.'),
            };
        } catch (RuntimeException $exception) {
            throw $exception;
        } catch (\Throwable $exception) {
            Log::warning('Study file extraction failed.', [
                'path' => $path,
                'extension' => $extension,
                'error' => $exception->getMessage(),
            ]);

            throw new RuntimeException('Text extraction failed for the uploaded file type.', previous: $exception);
        }

        $normalized = $this->normalizeText($text);

        if ($normalized === '') {
            throw new RuntimeException('The uploaded file does not contain extractable text.');
        }

        return $normalized;
    }

    public static function acceptedExtensions(): string
    {
        return implode(',', self::SUPPORTED_EXTENSIONS);
    }

    private function extractPdf(string $path): string
    {
        $parser = new Parser();

        return $parser->parseFile($path)->getText();
    }

    private function extractDocx(string $path): string
    {
        try {
            $document = IOFactory::load($path, 'Word2007');
        } catch (\Throwable $exception) {
            throw new RuntimeException('Unable to read the Word document.', previous: $exception);
        }

        $parts = [];

        foreach ($document->getSections() as $section) {
            $parts[] = $this->extractPhpWordElements($section->getElements());
        }

        return implode("\n\n", array_filter(array_map($this->cleanText(...), $parts)));
    }

    private function extractTxt(string $path): string
    {
        $file = new SplFileObject($path, 'rb');
        $buffer = fopen('php://temp', 'w+b');

        if ($buffer === false) {
            throw new RuntimeException('Unable to initialize the text extraction buffer.');
        }

        $byteLimit = 0;

        while (! $file->eof()) {
            $line = $file->fgets();

            if ($line === false) {
                continue;
            }

            $byteLimit += strlen($line);

            if ($byteLimit > 1024 * 1024 * 512) {
                throw new RuntimeException('The text file is too large to process safely.');
            }

            fwrite($buffer, $line);
        }

        rewind($buffer);
        $contents = stream_get_contents($buffer);
        fclose($buffer);

        if ($contents === false) {
            throw new RuntimeException('Unable to read the text file.');
        }

        if (! mb_check_encoding($contents, 'UTF-8')) {
            $contents = mb_convert_encoding($contents, 'UTF-8', 'UTF-8, ISO-8859-1, Windows-1252');
        }

        return $contents;
    }

    private function extractPptx(string $path): string
    {
        $archive = new ZipArchive();

        if ($archive->open($path) !== true) {
            throw new RuntimeException('Unable to open the PowerPoint file.');
        }

        $slides = [];

        for ($index = 0; $index < $archive->numFiles; $index++) {
            $name = $archive->getNameIndex($index);

            if (is_string($name) && str_starts_with($name, 'ppt/slides/slide') && str_ends_with($name, '.xml')) {
                $slides[] = $name;
            }
        }

        natcasesort($slides);

        $parts = [];

        foreach ($slides as $slide) {
            $xml = $archive->getFromName($slide);

            if ($xml !== false) {
                $parts[] = $this->xmlToText($xml, ['a:p', 'a:br']);
            }
        }

        $archive->close();

        return implode("\n\n", array_filter($parts));
    }

    private function xmlToText(string $xml, array $blockTags): string
    {
        foreach ($blockTags as $tag) {
            $xml = preg_replace(sprintf('/<\/%s>/i', preg_quote($tag, '/')), "\n", $xml) ?? $xml;
            $xml = preg_replace(sprintf('/<%s\s*\/>/i', preg_quote($tag, '/')), "\n", $xml) ?? $xml;
        }

        $text = strip_tags($xml);

        return html_entity_decode($text, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    private function normalizeText(string $text): string
    {
        $text = str_replace(["\r\n", "\r"], "\n", $text);
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', ' ', $text) ?? $text;
        $text = preg_replace('/[ \t]+/u', ' ', $text) ?? $text;
        $text = preg_replace('/\n{3,}/u', "\n\n", $text) ?? $text;

        return trim($text);
    }

    private function extractPhpWordElements(array $elements): string
    {
        $parts = [];

        foreach ($elements as $element) {
            $parts[] = $this->extractPhpWordElement($element);
        }

        return implode('', $parts);
    }

    private function extractPhpWordElement(mixed $element): string
    {
        if (! is_object($element)) {
            return '';
        }

        if (method_exists($element, 'getText')) {
            return (string) $element->getText();
        }

        if (method_exists($element, 'getRows')) {
            $rows = [];

            foreach ($element->getRows() as $row) {
                $cells = [];

                foreach ($row->getCells() as $cell) {
                    $cells[] = $this->extractPhpWordElements($cell->getElements());
                }

                $rows[] = implode(' | ', array_filter($cells));
            }

            return implode("\n", array_filter($rows)) . "\n";
        }

        if (method_exists($element, 'getElements')) {
            return $this->extractPhpWordElements($element->getElements()) . "\n";
        }

        return '';
    }
}
