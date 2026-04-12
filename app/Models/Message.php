<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    protected $fillable = [
        'chat_id',
        'role', // 'user' or 'assistant'
        'content',
        'tokens_used',
    ];

    protected function casts(): array
    {
        return [
            'tokens_used' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the chat that owns this message
     */
    public function chat(): BelongsTo
    {
        return $this->belongsTo(Chat::class);
    }
}
