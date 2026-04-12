<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('notes', 'text_content')) {
            return;
        }

        DB::table('notes')->whereNull('text_content')->update(['text_content' => '']);

        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE notes MODIFY text_content LONGTEXT NOT NULL");
        } elseif ($driver === 'pgsql') {
            DB::statement("ALTER TABLE notes ALTER COLUMN text_content SET DEFAULT ''");
            DB::statement("ALTER TABLE notes ALTER COLUMN text_content SET NOT NULL");
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('notes', 'text_content')) {
            return;
        }

        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE notes MODIFY text_content LONGTEXT NULL");
        } elseif ($driver === 'pgsql') {
            DB::statement("ALTER TABLE notes ALTER COLUMN text_content DROP NOT NULL");
            DB::statement("ALTER TABLE notes ALTER COLUMN text_content DROP DEFAULT");
        }
    }
};
