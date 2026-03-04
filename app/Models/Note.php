<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'description',
        'original_filename',
        'stored_path',
        'mime_type',
        'file_size',
        'status',
        'source_type',
        'text_content',
        'ai_summary',
        'ai_summary_generated_at',
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'ai_summary_generated_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
