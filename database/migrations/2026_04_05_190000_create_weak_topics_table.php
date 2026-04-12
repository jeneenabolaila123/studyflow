<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weak_topics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('topic');
            $table->unsignedInteger('wrong_count')->default(0);
            $table->unsignedInteger('total_count')->default(0);
            $table->decimal('weakness_percent', 5, 2)->default(0);
            $table->text('recommendation')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'topic']);
            $table->index(['user_id', 'weakness_percent']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weak_topics');
    }
};
