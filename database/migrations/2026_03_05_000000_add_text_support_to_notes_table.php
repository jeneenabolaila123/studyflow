<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table) {

            if (!Schema::hasColumn('notes', 'source_type')) {
                $table->string('source_type')->default('pdf');
            }

            if (!Schema::hasColumn('notes', 'text_content')) {
                $table->longText('text_content')->nullable();
            }

        });
    }

    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {

            if (Schema::hasColumn('notes', 'source_type')) {
                $table->dropColumn('source_type');
            }

            if (Schema::hasColumn('notes', 'text_content')) {
                $table->dropColumn('text_content');
            }

        });
    }
};
