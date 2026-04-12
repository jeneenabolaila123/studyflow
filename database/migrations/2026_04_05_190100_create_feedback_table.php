<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('message');
            $table->unsignedTinyInteger('rating')->nullable();
            $table->boolean('is_visible')->default(true);
            $table->timestamps();

            $table->index(['is_visible', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedback');
    }
};
