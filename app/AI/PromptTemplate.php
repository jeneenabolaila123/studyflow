<?php

namespace App\AI;

class PromptTemplate
{
    public static function quiz(string $text,string $difficulty):string
    {
        return <<<PROMPT
You are a quiz generator AI.

Generate EXACTLY 5 multiple choice questions.

Difficulty: {$difficulty}

Rules:
- Return ONLY valid JSON
- No explanation
- Each question must have 4 options

JSON format:

{
 "questions":[
   {
     "question":"...",
     "options":["A","B","C","D"],
     "answer":"..."
   }
 ]
}

TEXT:
{$text}
PROMPT;
    }
}
