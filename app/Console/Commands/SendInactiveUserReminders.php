<?php

namespace App\Console\Commands;

use App\Mail\InactiveUserReminderMail;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendInactiveUserReminders extends Command
{
    protected $signature = 'users:send-inactive-reminders';
    protected $description = 'Send reminder emails to users who have not logged in recently';

    public function handle(): int
    {
        $days = 2;

        $users = User::query()
            ->whereNotNull('email_verified_at')
            ->where('status', 'active')
            ->where(function ($query) {
                $query->whereNull('last_login_at')
                    ->orWhere('last_login_at', '<=', now()->subMinutes(1));
            })
            ->where(function ($query) {
                $query->whereNull('last_reminder_sent_at')
                    ->orWhere('last_reminder_sent_at', '<=', now()->subDays(2));
            })
            ->get();
        foreach ($users as $user) {
            Mail::to($user->email)->send(
                new InactiveUserReminderMail($user, $days));

            $user->last_reminder_sent_at = now();
            $user->save();
        }

        $this->info("Sent reminders to {$users->count()} users.");

        return self::SUCCESS;
    }
}
