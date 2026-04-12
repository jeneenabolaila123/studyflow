<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->longText('extracted_text')->nullable()->after('ai_summary_generated_at');
            $table->unsignedBigInteger('extracted_text_length')->nullable()->after('extracted_text');
        });
    }

    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->dropColumn([
                'extracted_text',
                'extracted_text_length',
            ]);
        });
    }
};
