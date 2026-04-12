<?php

namespace App\Services\AI;

class TextChunker
{
    /**
     * @return list<string>
     */
    public function chunkByApproxTokens(string $text): array
    {
        $text = trim($text);

        if ($text === '') {
            return [];
        }

        $legacyChunkSize = (int) config('services.ollama.chunk_size', 0);

        if ($legacyChunkSize > 0) {
            $maxChars = $legacyChunkSize;
            $targetChars = $legacyChunkSize;
        } else {
            $minTokens = max(500, (int) config('services.ollama.min_chunk_tokens', 2000));
            $maxTokens = max($minTokens + 100, (int) config('services.ollama.max_chunk_tokens', 3000));
            $targetTokens = max($minTokens, min($maxTokens, (int) floor(($minTokens + $maxTokens) / 2)));
            $charsPerToken = max(1, (int) config('services.ollama.chunk_chars_per_token', 4));

            $maxChars = $maxTokens * $charsPerToken;
            $targetChars = $targetTokens * $charsPerToken;
        }

        $paragraphs = preg_split('/\n\s*\n/u', $text) ?: [];
        $chunks = [];
        $buffer = '';

        foreach ($paragraphs as $paragraph) {
            $paragraph = trim($paragraph);

            if ($paragraph === '') {
                continue;
            }

            $candidate = $buffer === '' ? $paragraph : $buffer . "\n\n" . $paragraph;

            if (mb_strlen($candidate) <= $targetChars) {
                $buffer = $candidate;
                continue;
            }

            if ($buffer !== '') {
                $chunks[] = $buffer;
                $buffer = '';
            }

            while (mb_strlen($paragraph) > $maxChars) {
                $splitAt = mb_strrpos(mb_substr($paragraph, 0, $maxChars), ' ');
                $splitAt = $splitAt === false ? $maxChars : $splitAt;
                $chunks[] = trim(mb_substr($paragraph, 0, $splitAt));
                $paragraph = trim(mb_substr($paragraph, $splitAt));
            }

            $buffer = $paragraph;
        }

        if ($buffer !== '') {
            $chunks[] = $buffer;
        }

        return array_values(array_filter($chunks, static fn(string $chunk): bool => $chunk !== ''));
    }
}
