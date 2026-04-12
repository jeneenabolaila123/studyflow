<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            if (! Schema::hasColumn('notes', 'source_type')) {
                $table->string('source_type', 20)->default('file')->after('description');
            }

            if (! Schema::hasColumn('notes', 'text_content')) {
                $table->longText('text_content')->nullable()->after('ai_summary_generated_at');
            }
        });

        if (Schema::hasColumn('notes', 'text_content')) {
            DB::table('notes')
                ->whereNull('text_content')
                ->update([
                    'text_content' => DB::raw("COALESCE(NULLIF(extracted_text, ''), '')"),
                ]);
        }

        if (Schema::hasColumn('notes', 'source_type')) {
            DB::table('notes')
                ->where(function ($query) {
                    $query->whereNull('source_type')
                        ->orWhere('source_type', '');
                })
                ->update([
                    'source_type' => 'file',
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            if (Schema::hasColumn('notes', 'text_content')) {
                $table->dropColumn('text_content');
            }

            if (Schema::hasColumn('notes', 'source_type')) {
                $table->dropColumn('source_type');
            }
        });
    }
};
