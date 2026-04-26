<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class QuizAttempt extends Model
{
    protected $fillable = [
        'user_id',
        'note_id',
        'score',
        'total_questions',
        'difficulty',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function note(): BelongsTo
    {
        return $this->belongsTo(Note::class);
    }

    public function responses(): HasMany
    {
        return $this->hasMany(QuizResponse::class);
    }

    public function recommendation(): HasOne
    {
        return $this->hasOne(QuizRecommendation::class);
    }
}
