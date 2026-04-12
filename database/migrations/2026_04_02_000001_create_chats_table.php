<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('note_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('title')->default('New Chat');
            $table->enum('context_type', ['pdf', 'text', 'note', 'general'])->default('general');
            $table->timestamps();

            // Indexes for faster queries
            $table->index('user_id');
            $table->index('note_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chats');
    }
};
