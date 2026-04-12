<?php

namespace App\Services\AI;

/**
 * Helper class for text utilities
 * Provides methods for text chunking, token estimation, and text limiting
 */
class TextUtility
{
    /**
     * Estimate token count from text
     * Rough estimate: 1 token ≈ 4 characters
     */
    public static function estimateTokens(string $text): int
    {
        return (int) ceil(strlen($text) / 4);
    }

    /**
     * Limit text to maximum tokens
     */
    public static function limitByTokens(string $text, int $maxTokens): string
    {
        $maxCharacters = $maxTokens * 4;
        return self::limitByCharacters($text, $maxCharacters);
    }

    /**
     * Limit text to maximum characters
     */
    public static function limitByCharacters(string $text, int $maxCharacters): string
    {
        if (strlen($text) <= $maxCharacters) {
            return $text;
        }

        return substr($text, 0, $maxCharacters) . '...';
    }

    /**
     * Split text into chunks by approximate token count
     * 
     * @param string $text
     * @param int $tokensPerChunk
     * @return array
     */
    public static function chunkByTokens(string $text, int $tokensPerChunk = 2000): array
    {
        $charactersPerChunk = $tokensPerChunk * 4;
        return self::chunkByCharacters($text, $charactersPerChunk);
    }

    /**
     * Split text into chunks by character count
     */
    public static function chunkByCharacters(string $text, int $charactersPerChunk = 8000): array
    {
        if (strlen($text) <= $charactersPerChunk) {
            return [$text];
        }

        $chunks = [];
        $words = preg_split('/(\s+)/', $text, -1, PREG_SPLIT_DELIM_CAPTURE);

        $currentChunk = '';

        foreach ($words as $word) {
            if (strlen($currentChunk . $word) <= $charactersPerChunk) {
                $currentChunk .= $word;
            } else {
                if (!empty($currentChunk)) {
                    $chunks[] = trim($currentChunk);
                }

                $currentChunk = $word;
            }
        }

        if (!empty($currentChunk)) {
            $chunks[] = trim($currentChunk);
        }

        return $chunks;
    }

    /**
     * Clean text for processing
     * Remove extra whitespace, normalize line breaks
     */
    public static function clean(string $text): string
    {
        // Remove extra whitespace
        $text = preg_replace('/\s+/', ' ', $text);

        // Normalize line breaks
        $text = preg_replace('/\r\n|\r|\n/', "\n", $text);

        return trim($text);
    }

    /**
     * Extract first N words from text
     */
    public static function extractPreview(string $text, int $wordCount = 50): string
    {
        $words = explode(' ', $text);
        $preview = implode(' ', array_slice($words, 0, $wordCount));

        if (count($words) > $wordCount) {
            $preview .= '...';
        }

        return $preview;
    }
}
