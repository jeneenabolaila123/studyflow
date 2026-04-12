<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WeakTopic extends Model
{
    protected $fillable = [
        'user_id',
        'topic',
        'wrong_count',
        'total_count',
        'weakness_percent',
        'recommendation',
    ];

    protected function casts(): array
    {
        return [
            'wrong_count' => 'integer',
            'total_count' => 'integer',
            'weakness_percent' => 'float',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
