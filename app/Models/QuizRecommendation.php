<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuizRecommendation extends Model
{
    protected $fillable = [
        'quiz_attempt_id',
        'subject',
        'weak_areas',
        'recommendation_text',
        'exercises',
    ];

    protected $casts = [
        'weak_areas' => 'array',
        'exercises' => 'array',
    ];

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(QuizAttempt::class, 'quiz_attempt_id');
    }
}
