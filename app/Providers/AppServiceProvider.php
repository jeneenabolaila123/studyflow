<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $email = (string) $request->input('email');

            return Limit::perMinutes(60, 5)
                ->by(strtolower($email) . '|' . $request->ip());
        });

        RateLimiter::for('ai', function (Request $request) {
            $userId = (string) optional($request->user())->id;

            return Limit::perMinute(30)
                ->by($userId . '|' . $request->ip());
        });
    }
}
