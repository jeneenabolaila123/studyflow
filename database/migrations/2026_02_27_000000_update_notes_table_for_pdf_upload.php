<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            if (Schema::hasColumn('notes', 'content')) {
                $table->dropColumn('content');
            }

            if (! Schema::hasColumn('notes', 'description')) {
                $table->text('description')->nullable()->after('title');
            }

            if (! Schema::hasColumn('notes', 'original_filename')) {
                $table->string('original_filename')->after('description');
            }

            if (! Schema::hasColumn('notes', 'stored_path')) {
                $table->string('stored_path')->after('original_filename');
            }

            if (! Schema::hasColumn('notes', 'mime_type')) {
                $table->string('mime_type', 100)->after('stored_path');
            }

            if (! Schema::hasColumn('notes', 'file_size')) {
                $table->unsignedBigInteger('file_size')->after('mime_type');
            }

            if (! Schema::hasColumn('notes', 'status')) {
                $table->string('status', 50)->default('uploaded')->after('file_size');
            }
        });
    }

    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            foreach (['status', 'file_size', 'mime_type', 'stored_path', 'original_filename', 'description'] as $column) {
                if (Schema::hasColumn('notes', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
