<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Chat extends Model
{
    protected $fillable = [
        'user_id',
        'note_id',
        'title',
        'context_type', // 'pdf', 'text', 'note'
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the user that owns the chat
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the note that this chat is associated with
     */
    public function note(): BelongsTo
    {
        return $this->belongsTo(Note::class);
    }

    /**
     * Get all messages in this chat
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class)->orderBy('created_at');
    }

    /**
     * Get the last N messages for context
     */
    public function getContextMessages(int $limit = 10): array
    {
        return $this->messages()
            ->latest()
            ->limit($limit)
            ->get()
            ->reverse()
            ->map(fn(Message $msg) => [
                'role' => $msg->role,
                'content' => $msg->content,
            ])
            ->toArray();
    }
}
