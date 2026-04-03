<?php

namespace App\AI;

class TextChunker
{
    public function chunk(string $text,int $size=600):array
    {
        $text = strip_tags($text);
        $text = preg_replace('/\s+/',' ',$text);

        return str_split($text,$size);
    }
}
