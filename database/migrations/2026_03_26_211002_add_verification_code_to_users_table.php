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
        if (! Schema::hasColumn('users', 'verification_code')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('verification_code', 6)->nullable()->after('email_verified_at');
            });
        }

        if (! Schema::hasColumn('users', 'reset_code')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('reset_code', 6)->nullable()->after('verification_code');
            });
        }

        if (! Schema::hasColumn('users', 'email_verified_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->timestamp('email_verified_at')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'reset_code')) {
                $table->dropColumn('reset_code');
            }

            if (Schema::hasColumn('users', 'verification_code')) {
                $table->dropColumn('verification_code');
            }
        });
    }
};
