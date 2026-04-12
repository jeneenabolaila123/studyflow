<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class DocumentTextExtractorService
{
    protected array $supportedExtensions = ['pdf', 'txt'];
    protected int $maxFileSize = 104857600; // 100MB

    public function extractText(string $filePath): string
    {
        if (!$filePath || trim($filePath) === '') {
            throw new \InvalidArgumentException("File path cannot be empty");
        }

        if (!file_exists($filePath)) {
            throw new \RuntimeException("File does not exist: {$filePath}");
        }

        if (!is_readable($filePath)) {
            throw new \RuntimeException("Cannot read file: {$filePath}");
        }

        $fileSize = filesize($filePath);

        if ($fileSize > $this->maxFileSize) {
            throw new \RuntimeException("File too large");
        }

        if ($fileSize === 0) {
            throw new \RuntimeException("File is empty");
        }

        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

        if ($extension === 'pdf') {
            return $this->extractFromPdf($filePath);
        }

        if ($extension === 'txt') {
            return $this->extractFromText($filePath);
        }

        throw new \RuntimeException("Unsupported file type");
    }

    protected function extractFromText(string $filePath): string
    {
        $content = file_get_contents($filePath);

        if (!$content || trim($content) === '') {
            throw new \RuntimeException("Text file is empty");
        }

        return $this->cleanText($content);
    }

    protected function extractFromPdf(string $filePath): string
    {
        // 🔥 IMPORTANT:
        // Laravel ما فيه PDF parser قوي مثل Python
        // فهون يا:
        // 1. تستخدم library مثل smalot/pdfparser
        // 2. أو تبعت الملف لـ Python FastAPI

        try {
            $parser = new \Smalot\PdfParser\Parser();
            $pdf = $parser->parseFile($filePath);
            $text = $pdf->getText();

            if (!$text || trim($text) === '') {
                throw new \RuntimeException("No text found in PDF");
            }

            return $this->cleanText($text);
        } catch (\Throwable $e) {
            Log::error("PDF extraction failed", ['error' => $e->getMessage()]);
            throw new \RuntimeException("Failed to extract PDF text");
        }
    }

    protected function cleanText(string $text): string
    {
        $text = str_replace(["\r\n", "\r"], "\n", $text);

        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text);
        $text = preg_replace('/[ \t]+/', ' ', $text);
        $text = preg_replace('/\n\s*\n/', "\n\n", $text);
        $text = preg_replace('/\n{3,}/', "\n\n", $text);

        $clean = trim($text);

        if (strlen($clean) < 10) {
            throw new \RuntimeException("Text too short");
        }

        return $clean;
    }

    public function isFileTypeSupported(string $filePath): bool
    {
        if (!$filePath) {
            return false;
        }

        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        return in_array($ext, $this->supportedExtensions);
    }

    public function estimateReadingTime(string $text): int
    {
        if (!$text || trim($text) === '') {
            return 0;
        }

        $words = str_word_count($text);

        if ($words === 0) {
            return 0;
        }

        return max(1, round($words / 225));
    }

    public function countWords(string $text): int
    {
        if (!$text || trim($text) === '') {
            return 0;
        }

        return str_word_count($text);
    }
}
