<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * CheckAdmin Middleware
 * Verifies that the authenticated user is an admin
 */
class CheckAdmin
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

        // Check if user is admin
        if (!$request->user()->is_admin) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.'
            ], 403);
        }

        // Check if admin account is active
        if ($request->user()->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Your admin account is not active.'
            ], 403);
        }

        return $next($request);
    }
}
