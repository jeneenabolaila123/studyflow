<?php

namespace App\Http\Middleware;

use App\Models\Chat;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * ChatAuthMiddleware - Validates chat access
 * 
 * Ensures users can only access/modify their own chats
 * Applied to sensitive chat endpoints
 */
class ChatAuthMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $chatId = (int) $request->route('chatId');

        if (!$chatId) {
            return response()->json([
                'success' => false,
                'message' => 'Chat ID is required',
            ], 400);
        }

        $chat = Chat::find($chatId);

        if (!$chat) {
            return response()->json([
                'success' => false,
                'message' => 'Chat not found',
            ], 404);
        }

        // Verify user owns this chat
        if ($chat->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to chat',
            ], 403);
        }

        // Attach chat to request for easy access in controller
        $request->attributes->set('chat', $chat);

        return $next($request);
    }
}
