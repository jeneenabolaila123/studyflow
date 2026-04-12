<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            if (! Schema::hasColumn('notes', 'is_featured')) {
                $table->boolean('is_featured')->default(false)->after('source_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            if (Schema::hasColumn('notes', 'is_featured')) {
                $table->dropColumn('is_featured');
            }
        });
    }
};
