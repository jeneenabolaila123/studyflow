# AI Module Implementation Guide

This document explains the complete AI-powered module built with Laravel and Groq API.

## 📋 Features

1. **PDF/Document Summarization** - Extract and summarize text from PDFs, DOCx, and images
2. **Chat System** - Multi-message context-aware chatbot with persistent history
3. **Quiz Generation** - Generate MCQ quizzes in structured JSON format
4. **Error Handling** - Comprehensive error handling and API validation
5. **Token Optimization** - Automatic text limiting to prevent token overflow

---

## 🗂️ Project Structure

```
app/
├── Models/
│   ├── Chat.php                 # Chat session model
│   └── Message.php              # Chat message model
├── Services/AI/
│   ├── GroqAiService.php       # Main AI service (Groq API integration)
│   └── TextUtility.php          # Text processing utilities
├── Http/Controllers/Api/
│   └── GroqAiController.php     # AI endpoints controller
├── Http/Middleware/
│   └── ChatAuthMiddleware.php   # Chat access validation
└── Support/
    └── ApiResponse.php          # Standardized API responses

database/
├── migrations/
│   ├── 2026_04_02_000001_create_chats_table.php
│   └── 2026_04_02_000002_create_messages_table.php

config/
└── groq.php                     # Groq API configuration

routes/
└── api.php                      # API endpoints definitions
```

---

## 🚀 Setup Instructions

### 1. **Get Groq API Key**

- Visit: https://console.groq.com
- Sign up and create an API key
- Add to `.env` file

### 2. **Update .env**

```env
# Groq API Configuration
GROQ_API_KEY=your-api-key-here
GROQ_MODEL=mixtral-8x7b-32768
GROQ_ENDPOINT=https://api.groq.com/openai/v1/chat/completions

# AI Configuration
AI_MAX_TEXT_LENGTH=12000
AI_MAX_TOKENS=1000
AI_TIMEOUT=60
AI_TEMPERATURE=0.7
AI_CONTEXT_MESSAGES=10
```

### 3. **Run Migrations**

```bash
php artisan migrate
```

This creates:

- `chats` table - Stores chat sessions
- `messages` table - Stores individual messages

### 4. **Update User Model (if needed)**

The Chat model already has relationships to the User model:

```php
public function user(): BelongsTo
{
    return $this->belongsTo(User::class);
}
```

---

## 📡 API Endpoints

### Authentication

All endpoints require Bearer token authentication:

```bash
Authorization: Bearer your-sanctum-token
```

### File Upload

```http
POST /api/ai/upload
Content-Type: multipart/form-data

file: <PDF, DOCX, or Image>
```

**Response:**

```json
{
    "success": true,
    "data": {
        "text": "extracted text content...",
        "character_count": 5000,
        "estimated_tokens": 1250,
        "file_name": "document.pdf"
    }
}
```

### Summarization

```http
POST /api/ai/summarize
Content-Type: application/json

{
  "text": "your text here...",
  "format": "bullet_points|paragraph|detailed"
}
```

**Response:**

```json
{
    "success": true,
    "data": {
        "summary": "summary content...",
        "format": "bullet_points",
        "model": "mixtral-8x7b-32768",
        "input_length": 5000
    }
}
```

### Quiz Generation

```http
POST /api/ai/generate-quiz
Content-Type: application/json

{
  "text": "your text for quiz..."
}
```

**Response:**

```json
{
    "success": true,
    "data": {
        "questions": [
            {
                "id": 1,
                "question": "What is...?",
                "options": [
                    { "letter": "A", "text": "Option A" },
                    { "letter": "B", "text": "Option B" },
                    { "letter": "C", "text": "Option C" },
                    { "letter": "D", "text": "Option D" }
                ],
                "correct_answer": "B"
            }
        ],
        "total_questions": 5,
        "type": "multiple_choice"
    }
}
```

### Chat - Start Session

```http
POST /api/ai/chat/start
Content-Type: application/json

{
  "title": "Chat Title",
  "note_id": 1,
  "context_type": "pdf|text|note|general"
}
```

**Response:**

```json
{
    "success": true,
    "data": {
        "chat_id": 1,
        "title": "Chat Title",
        "created_at": "2026-04-02T10:00:00Z"
    }
}
```

### Chat - Send Message

```http
POST /api/ai/chat/{chatId}/message
Content-Type: application/json

{
  "message": "your question or message..."
}
```

**Response:**

```json
{
    "success": true,
    "data": {
        "reply": "assistant response...",
        "message_count": 2
    }
}
```

### Chat - Get History

```http
GET /api/ai/chat/{chatId}
```

**Response:**

```json
{
    "success": true,
    "data": {
        "chat_id": 1,
        "title": "Chat Title",
        "context_type": "pdf",
        "messages": [
            {
                "id": 1,
                "role": "user",
                "content": "message text...",
                "created_at": "2026-04-02T10:00:00Z"
            },
            {
                "id": 2,
                "role": "assistant",
                "content": "reply text...",
                "created_at": "2026-04-02T10:01:00Z"
            }
        ],
        "total_messages": 2
    }
}
```

### Get All Chats

```http
GET /api/ai/chats
```

**Response:**

```json
{
    "success": true,
    "data": {
        "chats": [
            {
                "id": 1,
                "title": "Chat Title",
                "context_type": "pdf",
                "message_count": 5,
                "last_message_at": "2026-04-02T10:00:00Z",
                "created_at": "2026-04-02T09:00:00Z"
            }
        ],
        "total_chats": 1
    }
}
```

### Delete Chat

```http
DELETE /api/ai/chat/{chatId}
```

---

## 💾 Database Schema

### chats table

```sql
CREATE TABLE chats (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  note_id BIGINT NULLABLE,
  title VARCHAR(255),
  context_type ENUM('pdf', 'text', 'note', 'general'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### messages table

```sql
CREATE TABLE messages (
  id BIGINT PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  role ENUM('user', 'assistant', 'system'),
  content LONGTEXT,
  tokens_used INT NULLABLE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🔧 How It Works

### 1. **Text Summarization**

- User provides text or uploads PDF
- Text is limited to 12,000 characters (prevents token overflow)
- Groq API generates summary in requested format:
    - **Bullet Points**: Key points in list format
    - **Paragraph**: 2-3 paragraph summary
    - **Detailed**: Comprehensive summary with all details

### 2. **Chat System**

- User starts a chat session (with optional document context)
- Chat stores all messages with user and assistant roles
- Each new message includes context of last 10 messages
- If document is linked, its text is used as context
- AI responds with document-aware answers

### 3. **Quiz Generation**

- Text is extracted from document or provided directly
- Groq generates 5 MCQ questions with 4 options each
- Correct answer is clearly marked
- Returned as structured JSON for easy frontend integration
- Questions are based ONLY on provided text (no hallucination)

### 4. **Error Handling**

- All API calls wrapped in try-catch
- Groq API errors are caught and returned with helpful messages
- Missing documents/chats return 403/404 errors
- Invalid inputs return 422 validation errors

---

## 🎯 Best Practices Implemented

1. **Service Layer Architecture**
    - `GroqAiService` handles all AI logic
    - Controller only handles HTTP requests
    - Easy to test and maintain

2. **Text Optimization**
    - Automatic text limiting prevents token overflow
    - TextUtility provides chunking capabilities
    - Token estimation helps users understand limits

3. **Database Efficiency**
    - Proper indexes on frequently queried columns
    - Relationships defined in models
    - Cascade deletes for data integrity

4. **Security**
    - All endpoints require authentication
    - User can only access their own chats/notes
    - API key stored in environment variables

5. **Error Handling**
    - Comprehensive validation
    - Meaningful error messages
    - Proper HTTP status codes

---

## 📝 Example Usage

### Frontend Integration (JavaScript)

```javascript
// 1. Upload PDF and get text
const formData = new FormData();
formData.append("file", pdfFile);

const uploadResponse = await fetch("/api/ai/upload", {
    method: "POST",
    headers: {
        Authorization: `Bearer ${token}`,
    },
    body: formData,
});

const {
    data: { text, character_count },
} = await uploadResponse.json();

// 2. Generate summary
const summaryResponse = await fetch("/api/ai/summarize", {
    method: "POST",
    headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        text: text,
        format: "bullet_points",
    }),
});

const {
    data: { summary },
} = await summaryResponse.json();

// 3. Generate quiz
const quizResponse = await fetch("/api/ai/generate-quiz", {
    method: "POST",
    headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        text: text,
    }),
});

const {
    data: { questions },
} = await quizResponse.json();

// 4. Start chat
const chatResponse = await fetch("/api/ai/chat/start", {
    method: "POST",
    headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        title: "Study Chat",
        context_type: "pdf",
    }),
});

const {
    data: { chat_id },
} = await chatResponse.json();

// 5. Send message
const messageResponse = await fetch(`/api/ai/chat/${chat_id}/message`, {
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
} = await messageResponse.json();
```

---

## 🐛 Troubleshooting

### "Groq API key not configured"

- Ensure `GROQ_API_KEY` is set in `.env`
- Run `php artisan config:cache` to refresh config

### "Could not extract text from file"

- PDF might be image-based (needs OCR)
- Ensure OCR service (Python) is running at `http://127.0.0.1:8001`
- Check file format is supported

### Timeout errors

- Increase `AI_TIMEOUT` in `.env` (default: 60 seconds)
- Check Groq API is accessible from your server

### Chat messages not saving

- Ensure migrations ran: `php artisan migrate`
- Check database connection

---

## 📊 Performance Tips

1. **Text Limiting**
    - Default limit: 12,000 characters
    - Adjustable via `AI_MAX_TEXT_LENGTH` in `.env`
    - Helps keep response times fast

2. **Context Messages**
    - Default: Last 10 messages for context
    - Adjust via `AI_CONTEXT_MESSAGES` in .env
    - More context = longer responses but better understanding

3. **Model Selection**
    - Using `mixtral-8x7b-32768` for good balance of speed/quality
    - Can change via `GROQ_MODEL` in .env
    - Other options: `llama-2-70b-chat`, `llama-2-7b-chat`

---

## 🔐 Security Considerations

1. **API Key Protection**
    - Never commit `.env` to version control
    - Use different keys for dev/production
    - Rotate keys regularly

2. **Rate Limiting**
    - Consider adding rate limiting middleware
    - Groq API has usage limits
    - Monitor API costs

3. **Data Privacy**
    - Chat history stored in database
    - Consider encryption for sensitive documents
    - Add data retention policies

---

## 📚 Resources

- [Groq API Documentation](https://console.groq.com/docs)
- [Laravel Eloquent](https://laravel.com/docs/eloquent)
- [smalot/pdfparser](https://github.com/smalot/pdfparser)

---

## ✅ Checklist

- [ ] Add `GROQ_API_KEY` to `.env`
- [ ] Run migrations: `php artisan migrate`
- [ ] Test file upload endpoint
- [ ] Test summarization
- [ ] Test quiz generation
- [ ] Test chat functionality
- [ ] Set up frontend integration
- [ ] Configure rate limiting (optional)
- [ ] Set up monitoring/logging
- [ ] Deploy to production

---

Built with ❤️ for your graduation project!
