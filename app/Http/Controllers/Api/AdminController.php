<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Models\Note;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/**
 * AdminController - Handles admin user management
 * Protected by admin middleware
 */
class AdminController extends Controller
{
    /**
     * Get dashboard statistics
     */
    public function stats(Request $request)
    {
        $totalUsers = User::count();
        $verifiedUsers = User::whereNotNull('email_verified_at')->count();
        $adminUsers = User::where('is_admin', true)->count();
        $activeUsers = User::where('status', 'active')->count();
        $totalNotes = Note::count();

        return ApiResponse::success([
            'total_users' => $totalUsers,
            'verified_users' => $verifiedUsers,
            'admin_users' => $adminUsers,
            'active_users' => $activeUsers,
            'unverified_users' => $totalUsers - $verifiedUsers,
            'total_notes' => $totalNotes,
        ], 'Statistics retrieved');
    }

    /**
     * Get all users with pagination
     */
    public function users(Request $request)
    {
        $query = User::query();

        // Search functionality
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%");
        }

        // Filter by verified status
        if ($request->has('verified')) {
            $verified = $request->boolean('verified');
            if ($verified) {
                $query->whereNotNull('email_verified_at');
            } else {
                $query->whereNull('email_verified_at');
            }
        }

        // Filter by admin status
        if ($request->has('is_admin')) {
            $query->where('is_admin', $request->boolean('is_admin'));
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');
        $query->orderBy($sortBy, $sortDir);

        // Pagination
        $perPage = $request->input('per_page', 15);
        $users = $query->paginate($perPage);

        return ApiResponse::success([
            'users' => UserResource::collection($users->items()),
            'pagination' => [
                'current_page' => $users->currentPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
                'last_page' => $users->lastPage(),
            ]
        ], 'Users retrieved');
    }

    /**
     * Get single user details
     */
    public function show(Request $request, User $user)
    {
        return ApiResponse::success(
            new UserResource($user),
            'User retrieved'
        );
    }

    /**
     * Create new user
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'nullable|string|max:20',
            'is_admin' => 'boolean',
            'status' => Rule::in(['active', 'inactive', 'suspended']),
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'is_admin' => $validated['is_admin'] ?? false,
            'status' => $validated['status'] ?? 'active',
            'email_verified_at' => now(), // Admin-created users are auto-verified
        ]);

        return ApiResponse::success(
            new UserResource($user),
            'User created successfully',
            201
        );
    }

    /**
     * Update user
     */
    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'email' => Rule::unique('users')->ignore($user->id),
            'phone' => 'nullable|string|max:20',
            'is_admin' => 'boolean',
            'status' => Rule::in(['active', 'inactive', 'suspended']),
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        // Update basic info
        $user->update([
            'name' => $validated['name'] ?? $user->name,
            'email' => $validated['email'] ?? $user->email,
            'phone' => $validated['phone'] ?? $user->phone,
            'is_admin' => $validated['is_admin'] ?? $user->is_admin,
            'status' => $validated['status'] ?? $user->status,
        ]);

        // Update password if provided
        if (!empty($validated['password'])) {
            $user->update(['password' => Hash::make($validated['password'])]);
        }

        return ApiResponse::success(
            new UserResource($user),
            'User updated successfully'
        );
    }

    /**
     * Delete user
     */
    public function destroy(Request $request, User $user)
    {
        // Prevent self-deletion
        if ($user->id === $request->user()->id) {
            return ApiResponse::error('Cannot delete your own account', 403);
        }

        // Prevent deleting other admins (only superadmin can do this)
        if ($user->is_admin && !$request->user()->is_admin) {
            return ApiResponse::error('Cannot delete admin users', 403);
        }

        $user->delete();

        return ApiResponse::success(null, 'User deleted successfully');
    }

    /**
     * Change user role
     */
    public function changeRole(Request $request, User $user)
    {
        $validated = $request->validate([
            'is_admin' => 'required|boolean',
        ]);

        // Prevent removing own admin status if you're the only admin
        if (!$validated['is_admin'] && $user->is_admin && User::where('is_admin', true)->count() === 1) {
            return ApiResponse::error('Cannot remove admin status from the only admin', 403);
        }

        $user->update(['is_admin' => $validated['is_admin']]);

        return ApiResponse::success(
            new UserResource($user),
            'User role updated'
        );
    }

    /**
     * Change user status
     */
    public function changeStatus(Request $request, User $user)
    {
        $validated = $request->validate([
            'status' => Rule::in(['active', 'inactive', 'suspended']),
        ]);

        // Prevent deactivating only admin
        if ($validated['status'] !== 'active' && $user->is_admin && User::where('is_admin', true)->where('status', 'active')->count() === 1) {
            return ApiResponse::error('Cannot deactivate the only active admin', 403);
        }

        $user->update(['status' => $validated['status']]);

        return ApiResponse::success(
            new UserResource($user),
            'User status updated'
        );
    }

    /**
     * Verify user email manually
     */
    public function verifyEmail(Request $request, User $user)
    {
        $user->update(['email_verified_at' => now()]);

        return ApiResponse::success(
            new UserResource($user),
            'User email verified'
        );
    }

    /**
     * Resend verification code to user
     */
    public function resendVerification(Request $request, User $user)
    {
        if ($user->email_verified_at) {
            return ApiResponse::error('User email is already verified', 400);
        }

        $code = rand(100000, 999999);
        $user->update(['verification_code' => $code]);

        // In production, you would send an email here
        // Mail::send(new VerificationCodeMail($user, $code));

        return ApiResponse::success(null, 'Verification code sent');
    }

    /**
     * Legacy method - kept for backward compatibility
     */
    public function deleteUser($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json([
            "success" => true
        ]);
    }
}
