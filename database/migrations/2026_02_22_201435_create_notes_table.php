<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */

    public function up(): void
    {
        Schema::create('notes', function (Blueprint $table) {
           $table->id();
$table->foreignId('user_id')->constrained()->cascadeOnDelete();

$table->string('title');
$table->text('description')->nullable();

$table->string('original_filename')->nullable();
$table->string('stored_path')->nullable();
$table->string('mime_type')->nullable();
$table->integer('file_size')->nullable();

$table->longText('text_content')->nullable();
$table->string('source_type')->nullable();

$table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notes');
    }
};
