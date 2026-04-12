# 📋 Complete Setup Notes - AI Module Implementation

Comprehensive documentation of all components and how to integrate them.

---

## 📂 Files Created/Modified

### 1. **Models** (`app/Models/`)

#### `Chat.php` - Chat Session Model

```php
- Relationships: belongsTo(User), hasMany(Messages)
- Key method: getContextMessages() - retrieves last N messages for AI context
- Stores: user_id, note_id, title, context_type
- Automatically handles cascade deletes
```

#### `Message.php` - Message Model

```php
- Relationships: belongsTo(Chat)
- Stores: chat_id, role (user/assistant/system), content, tokens_used
- Used for persisting chat history in database
```

### 2. **Services** (`app/Services/AI/`)

#### `GroqAiService.php` - Main AI Service

**Purpose**: Handles all AI operations using Groq API

**Key Methods**:

- `summarize($text, $format)` - Returns summary with metadata
- `generateQuiz($text)` - Returns 5 MCQ questions in JSON
- `chat($messages, $context)` - Returns AI response with context awareness

**How it works**:

1. Receives request from controller
2. Limits text to prevent token overflow
3. Builds appropriate prompt from PromptLibrary
4. Calls Groq API using HTTP client
5. Handles errors and returns clean response

**Token Management**:

- Max input: 12,000 characters ≈ 3,000 tokens
- Max output: 1,000 tokens
- Context messages: Limited to 10 to stay within limits

#### `TextUtility.php` - Text Processing Helper

```php
Static methods for:
- estimateTokens($text) - Estimate token count
- limitByTokens() / limitByCharacters() - Trim text
- chunkByTokens() / chunkByCharacters() - Split into chunks
- clean($text) - Normalize whitespace
- extractPreview($text) - Get preview text
```

#### `PromptLibrary.php` - Prompt Templates

```php
Static methods containing all prompts:
- summarizeAsBulletPoints($text)
- summarizeAsParagraph($text)
- summarizeDetailed($text)
- generateQuiz($text)
- chatWithContext($context)
```

### 3. **Controller** (`app/Http/Controllers/Api/`)

#### `GroqAiController.php` - API Endpoints

**Key Methods**:

| Method             | Endpoint                     | Purpose                  |
| ------------------ | ---------------------------- | ------------------------ |
| `upload()`         | POST `/ai/upload`            | Extract text from files  |
| `summarize()`      | POST `/ai/summarize`         | Summarize text           |
| `generateQuiz()`   | POST `/ai/generate-quiz`     | Create MCQ quiz          |
| `startChat()`      | POST `/ai/chat/start`        | Create chat session      |
| `sendMessage()`    | POST `/ai/chat/{id}/message` | Send message & get reply |
| `getChatHistory()` | GET `/ai/chat/{id}`          | Get all messages         |
| `getUserChats()`   | GET `/ai/chats`              | List user's chats        |
| `deleteChat()`     | DELETE `/ai/chat/{id}`       | Delete chat              |

**Helper methods**:

- `extractPdfText()` - Uses smalot/pdfparser
- `extractDocxText()` - Uses ZipArchive
- `extractImageText()` - Calls Python OCR service

### 4. **Middleware** (`app/Http/Middleware/`)

#### `ChatAuthMiddleware.php` - Chat Access Control

```php
- Validates user owns the chat
- Returns 403 if unauthorized
- Attaches chat to request
- Can be applied to sensitive endpoints
```

### 5. **Form Requests** (`app/Http/Requests/`)

#### `AiRequests.php` - Input Validation

```php
Classes:
- ChatMessageRequest - Validates chat messages (min 1, max 2000 chars)
- StartChatRequest - Validates chat creation
- SummarizeRequest - Validates summarization input
- GenerateQuizRequest - Validates quiz input (min 50 chars)
- FileUploadRequest - Validates file uploads (max 20MB)
```

### 6. **Database** (`database/migrations/`)

#### `2026_04_02_000001_create_chats_table.php`

```sql
CREATE TABLE chats (
  id BIGINT PRIMARY KEY,
  user_id BIGINT (foreign key),
  note_id BIGINT (nullable, foreign key),
  title VARCHAR(255),
  context_type ENUM('pdf', 'text', 'note', 'general'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  indexes: user_id, note_id, created_at
);
```

#### `2026_04_02_000002_create_messages_table.php`

```sql
CREATE TABLE messages (
  id BIGINT PRIMARY KEY,
  chat_id BIGINT (foreign key),
  role ENUM('user', 'assistant', 'system'),
  content LONGTEXT,
  tokens_used INT (nullable),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  indexes: chat_id, role, created_at
);
```

### 7. **Configuration** (`config/`)

#### `groq.php` - Configuration File

```php
- Groq API key, model, endpoint
- AI service settings (max tokens, timeout, temperature)
- All configurable via environment variables
```

### 8. **Routes** (`routes/api.php`)

**New routes added**:

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('ai')->group(function () {
        POST   /api/ai/upload              - Upload file
        POST   /api/ai/summarize           - Summarize text
        POST   /api/ai/generate-quiz       - Generate quiz
        POST   /api/ai/chat/start          - Create chat
        POST   /api/ai/chat/{id}/message   - Send message
        GET    /api/ai/chat/{id}           - Get history
        DELETE /api/ai/chat/{id}           - Delete chat
        GET    /api/ai/chats               - List chats
    });
});
```

---

## 🔄 Request/Response Flow

### Summarization Request Flow

```
Frontend Request
    ↓
POST /api/ai/summarize
    ↓
AiController::summarize()
    ↓
Validate input (SummarizeRequest)
    ↓
GroqAiService::summarize()
    ↓
1. Limit text to 12,000 chars
2. Select prompt from PromptLibrary based on format
3. Call Groq API with prompt
    ↓
Groq API Response
    ↓
Return structured response
    ↓
Return JSON to frontend
```

### Chat Flow

```
Frontend Request
    ↓
POST /api/ai/chat/start
    ↓
Create Chat in DB
    ↓
Return chat_id
    ↓
Frontend sends messages
    ↓
POST /api/ai/chat/{id}/message
    ↓
1. Validate message
2. Store user message in DB
3. Get last 10 messages for context
4. Get document text if linked
5. Call GroqAiService::chat()
6. Groq generates response
7. Store assistant response in DB
    ↓
Return response to frontend
```

### Quiz Generation Flow

```
Frontend Request (text)
    ↓
POST /api/ai/generate-quiz
    ↓
AiController::generateQuiz()
    ↓
GroqAiService::generateQuiz()
    ↓
1. Limit text to 12,000 chars
2. Build quiz prompt asking for JSON
3. Call Groq API
4. Parse response JSON
    ↓
Return questions array
    ↓
Each question has:
  - id: 1-5
  - question: question text
  - options: [A, B, C, D]
  - correct_answer: B (example)
```

---

## 🔧 Environment Setup

### Step-by-Step Setup

```bash
# 1. Copy example env file (if needed)
cp .env.groq.example .env.local

# 2. Add to .env
GROQ_API_KEY=gsk_your_key_from_console_groq_com
GROQ_MODEL=mixtral-8x7b-32768
GROQ_ENDPOINT=https://api.groq.com/openai/v1/chat/completions
AI_MAX_TEXT_LENGTH=12000
AI_MAX_TOKENS=1000
AI_TIMEOUT=60
AI_TEMPERATURE=0.7
AI_CONTEXT_MESSAGES=10

# 3. Clear config cache
php artisan config:clear
php artisan config:cache

# 4. Run migrations
php artisan migrate

# 5. Test connection
php artisan tinker
>>> config('services.groq.api_key')  # Should output your key
```

---

## 🧪 Testing Checklist

### Manual Testing

```bash
# Get token first
TOKEN=$(curl -s http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.data.token')

# Test 1: Upload
curl -X POST http://localhost:8000/api/ai/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf"

# Test 2: Summarize
curl -X POST http://localhost:8000/api/ai/summarize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your text here...",
    "format": "bullet_points"
  }'

# Test 3: Quiz
curl -X POST http://localhost:8000/api/ai/generate-quiz \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your text here..."
  }'

# Test 4: Chat
CHAT=$(curl -s -X POST http://localhost:8000/api/ai/chat/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}' | jq -r '.data.chat_id')

curl -X POST http://localhost:8000/api/ai/chat/$CHAT/message \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Groq API key not found"

```php
// Problem: Environment variable not loaded
// Solution:
php artisan config:clear
php artisan config:cache
// Or restart Laravel server
```

### Issue 2: Timeout on large documents

```env
# Solution: Increase timeout
AI_TIMEOUT=120
GROQ_ENDPOINT_TIMEOUT=120
```

### Issue 3: "Database table doesn't exist"

```bash
# Solution: Run migrations
php artisan migrate
# Or if table exists:
php artisan migrate --step
```

### Issue 4: File extraction returns empty

```php
// PDF might be scanned image
// Solutions:
1. Use OCR service for image PDFs
2. Convert to text PDF first
3. Check file is valid: `file test.pdf`
```

---

## 📈 Performance Optimization

### Text Chunking Example

```php
use App\Services\AI\TextUtility;

// Large document (100KB)
$chunks = TextUtility::chunkByTokens($largeText, 2000);
// Returns: 3-4 chunks of ~2000 tokens each

foreach ($chunks as $chunk) {
    $summary = $groqService->summarize($chunk);
    // Summarize each chunk
}
```

### Database Optimization

```php
// Bad:
$chat = Chat::with('messages')->find($id); // Loads ALL messages

// Good:
$messages = $chat->messages()->latest()->limit(20)->get(); // Load 20 latest
```

---

## 🔐 Security Hardening

### 1. Rate Limiting

```php
// In routes/api.php
Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    Route::post('/ai/upload', ...);
});
```

### 2. Input Validation

```php
// Already implemented in AiRequests.php
// Files: max 20MB
// Text: min/max length enforced
// Chat messages: max 2000 characters
```

### 3. Authorization

```php
// All endpoints require auth:sanctum
// Users can only access their own resources
// Middleware checks ownership before processing
```

---

## 📊 Database Design

### Why separate chats and messages tables?

1. **Scalability**: Can archive old chats without losing messages
2. **Query Performance**: Index on chat_id allows fast message retrieval
3. **Flexibility**: Can add chat-level settings (title, context_type)
4. **Data Integrity**: Cascade deletes prevent orphaned messages

### Indexes Explained

```sql
-- Why these indexes?
- chat_id: Fast lookup of all messages in a chat
- user_id: List all chats for a user quickly
- role: Filter messages by sender type
- created_at: Sort by newest messages
```

---

## 🚀 Deployment Considerations

### Before Production

```bash
# 1. Set APP_DEBUG=false
APP_DEBUG=false

# 2. Use production Groq key (rotate old one)
GROQ_API_KEY=production_key_only

# 3. Set proper database
DB_CONNECTION=mysql  # Use production DB

# 4. Enable caching
CACHE_DRIVER=redis
SESSION_DRIVER=cookie

# 5. Monitor API usage
# Check Groq console for rate limits and costs

# 6. Database backups
# Set up automated backups of chats/messages

# 7. SSL/HTTPS required
# All API calls must be HTTPS
```

### Database Backup

```bash
# Backup chat history
php artisan db:backup --database=mysql --only=tables --tables=chats,messages

# Or using MySQL directly
mysqldump -u user -p database chats messages > backup.sql
```

---

## 📚 Alternative AI Models

You can easily switch models in `.env`:

```env
GROQ_MODEL=mixtral-8x7b-32768    # Best quality, slower
GROQ_MODEL=llama-2-70b-chat       # Balanced
GROQ_MODEL=llama-2-7b-chat        # Fastest, less capable
```

---

## 💡 Future Enhancements

1. **Vector Database**: Add embeddings for semantic search
2. **Long-term Memory**: Store summaries for faster subsequent requests
3. **Multi-language**: Support for non-English content
4. **Custom Prompts**: Allow users to customize system prompts
5. **Usage Analytics**: Track API calls and costs
6. **Export Chat**: Download chat history as PDF
7. **Collaborative Chats**: Share chats with other users

---

## 🎯 Code Quality Principles Used

1. **DRY** (Don't Repeat Yourself)
    - Prompts in PromptLibrary
    - Text utilities in TextUtility

2. **SOLID** (Single Responsibility)
    - GroqAiService: AI operations only
    - GroqAiController: HTTP handling only
    - Models: Data representation only

3. **Composition Over Inheritance**
    - Controller composes services
    - Services compose utilities

4. **Separation of Concerns**
    - Database: Eloquent models
    - Business Logic: Services
    - HTTP: Controllers
    - HTTP Routing: Routes

---

## 🎓 Learning Resources

- **Groq API Docs**: https://console.groq.com/docs
- **Laravel Service Patterns**: https://laravel.com/docs/services
- **ChatGPT Prompting Guide**: https://platform.openai.com/docs/guides/prompt-engineering
- **PDF Parsing**: https://github.com/smalot/pdfparser

---

## 📞 Support

If something doesn't work:

1. Check `.env` has all required variables
2. Run migrations: `php artisan migrate`
3. Clear cache: `php artisan config:clear`
4. Check logs: `tail storage/logs/laravel.log`
5. Test Groq connection: Try API directly from console.groq.com

---

## ✅ Final Checklist

- [ ] Groq API key configured
- [ ] Migrations run successfully
- [ ] File upload working
- [ ] Summarization working
- [ ] Quiz generation working
- [ ] Chat system working
- [ ] All routes accessible with proper auth
- [ ] Error handling working
- [ ] Database queries indexed properly
- [ ] Ready for production

---

Built with ❤️ for your success! 🚀
