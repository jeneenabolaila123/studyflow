<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable()->after('email_verified_at');
            }

            if (!Schema::hasColumn('users', 'last_reminder_sent_at')) {
                $table->timestamp('last_reminder_sent_at')->nullable()->after('last_login_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columns = [];

            if (Schema::hasColumn('users', 'last_login_at')) {
                $columns[] = 'last_login_at';
            }

            if (Schema::hasColumn('users', 'last_reminder_sent_at')) {
                $columns[] = 'last_reminder_sent_at';
            }

            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
