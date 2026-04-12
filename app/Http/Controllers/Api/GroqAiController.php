<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\Message;
use App\Models\Note;
use App\Services\AI\GroqAiService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Smalot\PdfParser\Parser as PdfParser;

/**
 * AiController - Enhanced with Groq API integration
 * 
 * Endpoints:
 * POST /api/ai/upload - Upload and extract text from PDF
 * POST /api/ai/summarize - Summarize text or PDF
 * POST /api/ai/quiz - Generate MCQ quiz
 * POST /api/ai/chat/start - Start new chat session
 * POST /api/ai/chat/{chatId}/message - Send message to chat
 * GET /api/ai/chat/{chatId} - Get chat history
 */
class GroqAiController extends Controller
{
    public function __construct(private readonly GroqAiService $groqAi) {}

    /**
     * Upload a file and extract text
     * Supports: PDF, Images (JPG, PNG), DOCX
     */
    public function upload(Request $request)
    {
        set_time_limit(300);

        $request->validate([
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png,docx',
        ]);

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());

        $text = match ($extension) {
            'pdf' => $this->extractPdfText($file),
            'docx' => $this->extractDocxText($file),
            default => $this->extractImageText($file),
        };

        if (empty(trim($text))) {
            return ApiResponse::error('Could not extract text from file', 422);
        }

        // Calculate summary length
        $characterCount = strlen($text);
        $estimatedTokens = (int) ($characterCount / 4); // Rough estimate

        return ApiResponse::success([
            'text' => $text,
            'character_count' => $characterCount,
            'estimated_tokens' => $estimatedTokens,
            'file_name' => $file->getClientOriginalName(),
        ], 'File uploaded and processed successfully');
    }

    /**
     * Summarize text with different formats
     */
    public function summarize(Request $request)
    {
        $request->validate([
            'text' => 'required|string|min:10',
            'format' => 'string|in:bullet_points,paragraph,detailed',
        ]);

        try {
            $result = $this->groqAi->summarize(
                $request->input('text'),
                $request->input('format', 'paragraph')
            );

            return ApiResponse::success($result, 'Summary generated successfully');
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }
    }

    /**
     * Generate MCQ quiz from text
     */
    public function generateQuiz(Request $request)
    {
        $request->validate([
            'text' => 'required|string|min:50',
        ]);

        try {
            $questions = $this->groqAi->generateQuiz($request->input('text'));

            return ApiResponse::success([
                'questions' => $questions,
                'total_questions' => count($questions),
                'type' => 'multiple_choice',
            ], 'Quiz generated successfully');
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }
    }

    /**
     * Start a new chat session
     */
    public function startChat(Request $request)
    {
        $request->validate([
            'title' => 'string|max:255',
            'note_id' => 'nullable|integer|exists:notes,id',
            'context_type' => 'string|in:pdf,text,note,general',
        ]);

        try {
            // Ensure user owns the note if provided
            if ($request->has('note_id')) {
                $note = Note::find($request->input('note_id'));

                if (!$note || $note->user_id !== $request->user()->id) {
                    return ApiResponse::error('Note not found or unauthorized', 403);
                }
            }

            $chat = Chat::create([
                'user_id' => $request->user()->id,
                'note_id' => $request->input('note_id'),
                'title' => $request->input('title', 'New Chat'),
                'context_type' => $request->input('context_type', 'general'),
            ]);

            return ApiResponse::success([
                'chat_id' => $chat->id,
                'title' => $chat->title,
                'created_at' => $chat->created_at,
            ], 'Chat session started');
        } catch (\Exception $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }
    }

    /**
     * Send message to chat and get response
     */
    public function sendMessage(Request $request, int $chatId)
    {
        $request->validate([
            'message' => 'required|string|min:1',
        ]);

        try {
            // Get chat and verify ownership
            $chat = Chat::find($chatId);

            if (!$chat || $chat->user_id !== $request->user()->id) {
                return ApiResponse::error('Chat not found or unauthorized', 403);
            }

            // Store user message
            Message::create([
                'chat_id' => $chat->id,
                'role' => 'user',
                'content' => $request->input('message'),
            ]);

            // Prepare context from note if available
            $context = '';

            if ($chat->note && $chat->note->extracted_text) {
                $context = $chat->note->extracted_text;
            }

            // Prepare messages for AI (include conversation history for context)
            $conversationMessages = $chat->getContextMessages(10);

            // Call AI with conversation history
            $response = $this->groqAi->chat($conversationMessages, $context);

            // Store assistant response
            Message::create([
                'chat_id' => $chat->id,
                'role' => 'assistant',
                'content' => $response,
            ]);

            return ApiResponse::success([
                'reply' => $response,
                'message_count' => $chat->messages()->count(),
            ], 'Message processed successfully');
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to process message: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get chat history
     */
    public function getChatHistory(Request $request, int $chatId)
    {
        try {
            $chat = Chat::find($chatId);

            if (!$chat || $chat->user_id !== $request->user()->id) {
                return ApiResponse::error('Chat not found or unauthorized', 403);
            }

            $messages = $chat->messages()
                ->select('id', 'role', 'content', 'created_at')
                ->get()
                ->toArray();

            return ApiResponse::success([
                'chat_id' => $chat->id,
                'title' => $chat->title,
                'context_type' => $chat->context_type,
                'messages' => $messages,
                'total_messages' => count($messages),
            ], 'Chat history retrieved');
        } catch (\Exception $e) {
            return ApiResponse::error($e->getMessage(), 500);
        }
    }

    /**
     * Get user's all chats
     */
    public function getUserChats(Request $request)
    {
        try {
            $chats = Chat::where('user_id', $request->user()->id)
                ->with(['messages' => function ($query) {
                    $query->latest()->limit(1);
                }])
                ->latest()
                ->get()
                ->map(fn(Chat $chat) => [
                    'id' => $chat->id,
                    'title' => $chat->title,
                    'context_type' => $chat->context_type,
                    'message_count' => $chat->messages()->count(),
                    'last_message_at' => $chat->updated_at,
                    'created_at' => $chat->created_at,
                ])
                ->toArray();

            return ApiResponse::success([
                'chats' => $chats,
                'total_chats' => count($chats),
            ], 'Chats retrieved');
        } catch (\Exception $e) {
            return ApiResponse::error($e->getMessage(), 500);
        }
    }

    /**
     * Delete a chat
     */
    public function deleteChat(Request $request, int $chatId)
    {
        try {
            $chat = Chat::find($chatId);

            if (!$chat || $chat->user_id !== $request->user()->id) {
                return ApiResponse::error('Chat not found or unauthorized', 403);
            }

            $chat->delete();

            return ApiResponse::success([], 'Chat deleted successfully');
        } catch (\Exception $e) {
            return ApiResponse::error($e->getMessage(), 500);
        }
    }

    // =============== HELPER METHODS ===============

    /**
     * Extract text from PDF
     */
    private function extractPdfText($file): string
    {
        try {
            $filePath = $file->getRealPath();
            $parser = new PdfParser();
            $pdf = $parser->parseFile($filePath);
            $pages = $pdf->getPages();

            $text = '';

            foreach ($pages as $page) {
                $text .= $page->getText() . "\n";
            }

            return trim($text);
        } catch (\Exception $e) {
            throw new RuntimeException('Failed to extract PDF text: ' . $e->getMessage());
        }
    }

    /**
     * Extract text from DOCX
     */
    private function extractDocxText($file): string
    {
        try {
            $filePath = $file->getRealPath();

            // Use zip to extract document.xml from DOCX
            $zip = new \ZipArchive();

            if ($zip->open($filePath) === false) {
                throw new RuntimeException('Cannot open DOCX file');
            }

            $xmlContent = $zip->getFromName('word/document.xml');
            $zip->close();

            if (!$xmlContent) {
                return '';
            }

            // Simple XML parsing to extract text
            $xml = new \SimpleXMLElement($xmlContent);
            $text = '';

            foreach ($xml->xpath('.//w:t') as $textElement) {
                $text .= (string) $textElement . ' ';
            }

            return trim($text);
        } catch (\Exception $e) {
            throw new RuntimeException('Failed to extract DOCX text: ' . $e->getMessage());
        }
    }

    /**
     * Extract text from image using OCR (Python service)
     */
    private function extractImageText($file): string
    {
        try {
            $filePath = $file->store('temp');
            $fullPath = storage_path('app/' . $filePath);

            $response = Http::timeout(60)->post('http://127.0.0.1:8001/ocr', [
                'file_path' => $fullPath,
            ]);

            storage_delete($filePath);

            if (!$response->successful()) {
                return '';
            }

            return $response->json('text') ?? '';
        } catch (\Exception $e) {
            return '';
        }
    }
}
