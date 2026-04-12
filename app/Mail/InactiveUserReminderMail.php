<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class InactiveUserReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public User $user;
    public int $days;

    public function __construct(User $user, int $days = 2)
    {
        $this->user = $user;
        $this->days = $days;
    }

    public function build()
    {
        return $this->subject('We miss you on StudyFlow')
            ->view('emails.inactive-user-reminder');
    }
}
