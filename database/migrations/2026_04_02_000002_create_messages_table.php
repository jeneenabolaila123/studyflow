<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['user', 'assistant', 'system'])->default('user');
            $table->longText('content');
            $table->unsignedInteger('tokens_used')->nullable();
            $table->timestamps();

            // Indexes for faster queries
            $table->index('chat_id');
            $table->index('role');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
