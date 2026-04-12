# 🚀 Quick Start Guide - Groq AI Module

Get the AI module running in 5 minutes!

## Step 1: Get Groq API Key (2 minutes)

1. Go to https://console.groq.com
2. Sign up or login
3. Create an API key (copy it)
4. Add to `.env`:

```env
GROQ_API_KEY=your_api_key_here
```

## Step 2: Configure Environment (1 minute)

Copy this to your `.env`:

```env
# Groq Configuration
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=mixtral-8x7b-32768
GROQ_ENDPOINT=https://api.groq.com/openai/v1/chat/completions

# AI Settings
AI_MAX_TEXT_LENGTH=12000
AI_MAX_TOKENS=1000
AI_TIMEOUT=60
AI_TEMPERATURE=0.7
AI_CONTEXT_MESSAGES=10
```

## Step 3: Run Migrations (1 minute)

```bash
php artisan migrate
```

This creates:

- `chats` table - stores chat sessions
- `messages` table - stores messages

## Step 4: Test the API (1 minute)

Test upload endpoint:

```bash
curl -X POST http://localhost:8000/api/ai/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf"
```

If successful, you'll get extracted text!

---

## 📚 Available Endpoints Summary

| Method | Endpoint                    | Purpose               |
| ------ | --------------------------- | --------------------- |
| POST   | `/api/ai/upload`            | Upload PDF/DOCX/Image |
| POST   | `/api/ai/summarize`         | Summarize text        |
| POST   | `/api/ai/generate-quiz`     | Generate MCQ quiz     |
| POST   | `/api/ai/chat/start`        | Start chat session    |
| POST   | `/api/ai/chat/{id}/message` | Send message          |
| GET    | `/api/ai/chat/{id}`         | Get chat history      |
| GET    | `/api/ai/chats`             | Get all user chats    |
| DELETE | `/api/ai/chat/{id}`         | Delete chat           |

---

## 🎯 Common Use Cases

### 1. Summarize Uploaded PDF

```javascript
// Step 1: Upload file
const formData = new FormData();
formData.append("file", pdfFile);

const uploadRes = await fetch("/api/ai/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
});

const {
    data: { text },
} = await uploadRes.json();

// Step 2: Summarize
const summaryRes = await fetch("/api/ai/summarize", {
    method: "POST",
    headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        text: text,
        format: "bullet_points", // or 'paragraph', 'detailed'
    }),
});

const {
    data: { summary },
} = await summaryRes.json();
console.log("Summary:", summary);
```

### 2. Generate Quiz from Text

```javascript
const quizRes = await fetch("/api/ai/generate-quiz", {
    method: "POST",
    headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        text: text, // your text here
    }),
});

const {
    data: { questions },
} = await quizRes.json();

// questions is an array of 5 MCQ questions with JSON structure
questions.forEach((q) => {
    console.log(q.question);
    console.log(q.options);
    console.log("Answer:", q.correct_answer);
});
```

### 3. Start Chatbot

```javascript
// Start chat
const chatRes = await fetch("/api/ai/chat/start", {
    method: "POST",
    headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        title: "My Study Chat",
        note_id: 1, // optional
        context_type: "pdf",
    }),
});

const {
    data: { chat_id },
} = await chatRes.json();

// Send message
const msgRes = await fetch(`/api/ai/chat/${chat_id}/message`, {
    method: "POST",
    headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        message: "Explain the first point from the summary",
    }),
});

const {
    data: { reply },
} = await msgRes.json();
console.log("Assistant:", reply);
```

---

## 🐛 Troubleshooting

### "Groq API key not configured"

```bash
# Check .env has key
grep GROQ_API_KEY .env

# Clear config cache
php artisan config:clear && php artisan config:cache
```

### "Timeout Error"

Increase timeout in `.env`:

```env
AI_TIMEOUT=120
```

### "Could not extract text from file"

- Ensure file is valid PDF/DOCX/Image
- PDF might need OCR (check if text-based)
- File size under 20MB

### Migrations not running

```bash
php artisan migrate:fresh  # (WARNING: clears all data)
# or
php artisan migrate --step
```

---

## 📊 Key Files Created

| File                                            | Purpose            |
| ----------------------------------------------- | ------------------ |
| `app/Models/Chat.php`                           | Chat session model |
| `app/Models/Message.php`                        | Message model      |
| `app/Services/AI/GroqAiService.php`             | Main AI service    |
| `app/Services/AI/TextUtility.php`               | Text utilities     |
| `app/Services/AI/PromptLibrary.php`             | Prompt templates   |
| `app/Http/Controllers/Api/GroqAiController.php` | API controller     |
| `app/Http/Middleware/ChatAuthMiddleware.php`    | Chat security      |
| `database/migrations/*`                         | Database tables    |
| `config/groq.php`                               | Configuration      |

---

## 🔒 Security Checklist

- [ ] API key in `.env` (not in code)
- [ ] GROQ_API_KEY not in git repo
- [ ] Use environment variables for sensitive data
- [ ] All endpoints require authentication
- [ ] Users can only access their own chats
- [ ] File upload limited to 20MB

---

## 🎓 Next Steps

1. ✅ Set up API key
2. ✅ Run migrations
3. ✅ Test endpoints with curl
4. ✅ Build frontend UI
5. ✅ Integrate with your app
6. ✅ Deploy to production

---

## 📖 Detailed Docs

- `AI_MODULE_GUIDE.md` - Complete feature documentation
- `API_TESTING_GUIDE.md` - Testing API endpoints
- `SETUP_NOTES.md` - Development notes

---

## ❓ Need Help?

Check the logs:

```bash
tail -f storage/logs/laravel.log
```

Enable debug mode in `.env`:

```env
APP_DEBUG=true
```

---

## 🎉 You're Ready!

Your AI module is now ready to use. Start building amazing features! 🚀

---

Built with ❤️ for your graduation project!
