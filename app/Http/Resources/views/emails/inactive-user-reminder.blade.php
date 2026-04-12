<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>We miss you on StudyFlow</title>
</head>
<body style="font-family: Arial, sans-serif; background: #f8fafc; padding: 30px;">
    <div style="max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #e5e7eb;">
        <h2 style="color: #111827; margin-bottom: 20px;">We miss you on StudyFlow</h2>

        <p style="color: #374151; font-size: 15px;">
            Hello {{ $user->name }},
        </p>

        <p style="color: #374151; font-size: 15px; line-height: 1.7;">
            You have not logged into StudyFlow for {{ $days }} days.
        </p>

        <p style="color: #374151; font-size: 15px; line-height: 1.7;">
            Come back and continue your learning journey.
        </p>

        <div style="margin-top: 25px;">
            <a href="http://localhost:5174/login"
               style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 20px; border-radius: 8px;">
                Go to StudyFlow
            </a>
        </div>

        <p style="margin-top: 30px; color: #6b7280; font-size: 13px;">
            StudyFlow Team
        </p>
    </div>
</body>
</html>