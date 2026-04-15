<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Log;

/**
 * PromptLibrary - Collection of AI prompts for various tasks
 * 
 * This class maintains all prompts used by the AI service
 * Easy to update and test different prompt templates
 */
class PromptLibrary
{
    /**
     * Summarize text as bullet points
     */
    public static function summarizeAsBulletPoints(string $text): string
    {
        return <<<PROMPT
You are an expert academic summarizer. Read the following text carefully and create a summary in 5-7 key bullet points.

Instructions:
- Each point should be concise and clear
- Cover the main ideas and concepts
- Use simple language for students
- Be accurate and don't add information not in the text
- Format each point as a clear statement

TEXT:
{$text}

SUMMARY (bullet points only):
PROMPT;
    }

    /**
     * Summarize text as paragraph
     */
    public static function summarizeAsParagraph(string $text): string
    {
        return <<<PROMPT
You are an expert academic summarizer. Write a clear and concise summary of the following text.

Instructions:
- Write 2-3 paragraphs covering the main ideas
- Use simple, student-friendly language
- Keep it informative but brief
- Don't add information not present in the text
- Flow naturally from one paragraph to the next

TEXT:
{$text}

SUMMARY (paragraphs only):
PROMPT;
    }

    /**
     * Detailed summary with explanations
     */
    public static function summarizeDetailed(string $text): string
    {
        return <<<PROMPT
You are an expert academic summarizer. Provide a detailed summary of the following text.

Instructions:
- Cover all main points and important details
- Explain key concepts clearly
- Maintain relationships between ideas
- Use clear, educational language
- Include specific details and examples from the text

TEXT:
{$text}

DETAILED SUMMARY:
PROMPT;
    }

    /**
     * Generate multiple choice quiz questions
     */
    public static function generateQuiz(string $text): string
    {
        return <<<PROMPT
You are an expert educational content creator. Generate 5 multiple-choice quiz questions based ONLY on the provided text.

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON, no markdown, no explanations
2. Each question must have 4 options (A, B, C, D)
3. Only one correct answer per question
4. Mark the correct answer clearly
5. Do not invent facts - use only what's in the text

JSON FORMAT (MUST BE EXACT):
{
  "questions": [
    {
      "id": 1,
      "question": "What is...?",
      "options": [
        {"letter": "A", "text": "Option text here"},
        {"letter": "B", "text": "Option text here"},
        {"letter": "C", "text": "Option text here"},
        {"letter": "D", "text": "Option text here"}
      ],
      "correct_answer": "B"
    }
  ]
}

TEXT TO CREATE QUIZ FROM:
{$text}

RETURN ONLY THE JSON:
PROMPT;
    }

    /**
     * Chat response with context
     */
    public static function chatWithContext(string $context): string
    {
        $contextPrompt = '';

        if (!empty($context)) {
            $contextPrompt = <<<CONTEXT

STUDY MATERIAL YOU SHOULD USE:
{$context}

Important: Use the note content as your main source. If the user's question is informal, vague, or refers to "this part", "that section", or a topic title, try to infer the most relevant section from the note before saying it is missing.
CONTEXT;
        }

        return <<<PROMPT
You are a friendly study assistant.

Your role:
- Answer in a simple and student-friendly way.
- If possible, explain the idea in plain language first.
- Then give 1-2 short examples when helpful.
- If the user asks for a summary, give a short focused summary.
- If the question is ambiguous, ask one brief clarification question instead of saying "Not found in the note."
- Only say "Not found in the note" if the topic is clearly absent.
- Keep the answer grounded in the note content.
- Return plain text only.
{$contextPrompt}

Now answer the student's question:
PROMPT;
    }

    /**
     * Log a prompt being used (for debugging)
     */
    public static function logPrompt(string $name, string $text = ''): void
    {
        Log::debug("AI Prompt Used: {$name}", [
            'text_preview' => substr($text, 0, 100) . '...',
        ]);
    }
}
