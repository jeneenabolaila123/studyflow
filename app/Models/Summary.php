<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Summary extends Model
{
    protected $fillable = [
        'user_id',
        'note_id',
        'title',
        'source_type',
        'summary_text',
    ];

    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'note_id' => 'integer',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function note()
    {
        return $this->belongsTo(Note::class);
    }
}
