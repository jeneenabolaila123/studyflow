<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * VerifyEmailForProtectedRoutes Middleware
 * Ensures user has verified their email before accessing certain routes
 */
class VerifyEmailForProtectedRoutes
{
    public function handle(Request $request, Closure $next): Response
    {
        // Check if user is authenticated
        if (!$request->user()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated'
            ], 401);
        }

        // Check if user's email is verified
        if (!$request->user()->email_verified_at) {
            return response()->json([
                'success' => false,
                'message' => 'Please verify your email first.',
                'needs_verification' => true
            ], 403);
        }

        return $next($request);
    }
}
