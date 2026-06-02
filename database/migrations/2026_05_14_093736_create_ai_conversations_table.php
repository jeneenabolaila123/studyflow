<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_conversations', function (Blueprint $table) {
            $table->id();

            $table->uuid('uuid')->unique();

            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('note_id')
                ->nullable()
                ->constrained('notes')
                ->nullOnDelete();

            $table->string('title')->nullable();

            // Ù‡ÙˆÙ† Ù…Ù†Ø®Ø²Ù† summary Ù„Ù„Ù…Ø­Ø§Ø¯Ø«Ø© Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø©
            $table->longText('summary')->nullable();

            $table->unsignedInteger('messages_count')->default(0);
            $table->timestamp('last_message_at')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'updated_at']);
            $table->index(['user_id', 'note_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_conversations');
    }
};
