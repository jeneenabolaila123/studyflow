<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WeakTopic;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class RecommendationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $items = WeakTopic::query()
            ->where('user_id', $user->id)
            ->orderByDesc('weakness_percent')
            ->orderByDesc('total_count')
            ->get([
                'id',
                'topic',
                'wrong_count',
                'total_count',
                'weakness_percent',
                'recommendation',
                'updated_at',
            ]);

        return ApiResponse::success($items, 'Recommendations loaded');
    }
}
