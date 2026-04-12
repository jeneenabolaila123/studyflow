<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'is_admin')) {
                $table->boolean('is_admin')->default(false)->after('email_verified_at');
            }

            if (!Schema::hasColumn('users', 'status')) {
                $table->string('status')->default('active')->after('is_admin');
            }

            if (!Schema::hasColumn('users', 'verification_code')) {
                $table->string('verification_code')->nullable()->after('password');
            }

            if (!Schema::hasColumn('users', 'reset_code')) {
                $table->string('reset_code')->nullable()->after('verification_code');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columns = [];

            foreach (['is_admin', 'status', 'verification_code', 'reset_code'] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $columns[] = $column;
                }
            }

            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
