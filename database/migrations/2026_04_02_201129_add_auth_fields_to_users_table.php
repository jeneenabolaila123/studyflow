<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'verification_code')) {
                $table->string('verification_code')->nullable()->after('password');
            }

            if (!Schema::hasColumn('users', 'reset_code')) {
                $table->string('reset_code')->nullable()->after('verification_code');
            }

            if (!Schema::hasColumn('users', 'is_admin')) {
                $table->boolean('is_admin')->default(false)->after('email_verified_at');
            }

            if (!Schema::hasColumn('users', 'status')) {
                $table->string('status')->default('active')->after('is_admin');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columns = [];

            if (Schema::hasColumn('users', 'verification_code')) {
                $columns[] = 'verification_code';
            }

            if (Schema::hasColumn('users', 'reset_code')) {
                $columns[] = 'reset_code';
            }

            if (Schema::hasColumn('users', 'is_admin')) {
                $columns[] = 'is_admin';
            }

            if (Schema::hasColumn('users', 'status')) {
                $columns[] = 'status';
            }

            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
