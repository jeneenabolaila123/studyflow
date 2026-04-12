<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('summaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('note_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->string('source_type')->default('text');
            $table->longText('summary_text');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('summaries');
    }
};
