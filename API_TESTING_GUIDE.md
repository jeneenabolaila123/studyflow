# API Testing Guide - Groq AI Module

Complete guide for testing all AI endpoints with examples.

## 🔑 Getting Your Bearer Token

1. **Register/Login to get token:**

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Response will include `token` field.

2. **Use token for all subsequent requests:**

```bash
Authorization: Bearer your_token_here
```

---

## 📤 1. File Upload

### Upload PDF/DOCX/Image

```bash
curl -X POST http://localhost:8000/api/ai/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf"
```

**Success Response (200):**

```json
{
    "success": true,
    "message": "File uploaded and processed successfully",
    "data": {
        "text": "extracted text content...",
        "character_count": 5234,
        "estimated_tokens": 1309,
        "file_name": "document.pdf"
    }
}
```

---

## 📝 2. Summarization

### Summarize as Bullet Points

```bash
curl -X POST http://localhost:8000/api/ai/summarize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "your long text here...",
    "format": "bullet_points"
  }'
```

### Summarize as Paragraph

```bash
curl -X POST http://localhost:8000/api/ai/summarize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "your long text here...",
    "format": "paragraph"
  }'
```

### Summarize Detailed

```bash
curl -X POST http://localhost:8000/api/ai/summarize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "your long text here...",
    "format": "detailed"
  }'
```

**Success Response (200):**

```json
{
    "success": true,
    "message": "Summary generated successfully",
    "data": {
        "summary": "• Key point 1\n• Key point 2\n• Key point 3",
        "format": "bullet_points",
        "model": "mixtral-8x7b-32768",
        "input_length": 5234
    }
}
```

---

## 🎯 3. Quiz Generation

### Generate MCQ Quiz

```bash
curl -X POST http://localhost:8000/api/ai/generate-quiz \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "text to generate quiz from..."
  }'
```

**Success Response (200):**

```json
{
    "success": true,
    "message": "Quiz generated successfully",
    "data": {
        "questions": [
            {
                "id": 1,
                "question": "What is photosynthesis?",
                "options": [
                    { "letter": "A", "text": "Process of breaking down food" },
                    {
                        "letter": "B",
                        "text": "Process of converting light to chemical energy"
                    },
                    { "letter": "C", "text": "Process of water transport" },
                    { "letter": "D", "text": "Process of gas exchange" }
                ],
                "correct_answer": "B"
            }
        ],
        "total_questions": 5,
        "type": "multiple_choice"
    }
}
```

---

## 💬 4. Chat System

### 4.1 Start a Chat Session

```bash
curl -X POST http://localhost:8000/api/ai/chat/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Biology Study Chat",
    "note_id": 1,
    "context_type": "pdf"
  }'
```

**Success Response (200):**

```json
{
    "success": true,
    "message": "Chat session started",
    "data": {
        "chat_id": 1,
        "title": "Biology Study Chat",
        "created_at": "2026-04-02T10:30:00Z"
    }
}
```

### 4.2 Send Message to Chat

```bash
curl -X POST http://localhost:8000/api/ai/chat/1/message \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the main steps of photosynthesis?"
  }'
```

**Success Response (200):**

```json
{
    "success": true,
    "message": "Message processed successfully",
    "data": {
        "reply": "The main steps of photosynthesis are...",
        "message_count": 2
    }
}
```

### 4.3 Get Chat History

```bash
curl -X GET http://localhost:8000/api/ai/chat/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Success Response (200):**

```json
{
    "success": true,
    "message": "Chat history retrieved",
    "data": {
        "chat_id": 1,
        "title": "Biology Study Chat",
        "context_type": "pdf",
        "messages": [
            {
                "id": 1,
                "role": "user",
                "content": "What are the main steps of photosynthesis?",
                "created_at": "2026-04-02T10:30:00Z"
            },
            {
                "id": 2,
                "role": "assistant",
                "content": "The main steps of photosynthesis are...",
                "created_at": "2026-04-02T10:30:15Z"
            }
        ],
        "total_messages": 2
    }
}
```

### 4.4 Get All User Chats

```bash
curl -X GET http://localhost:8000/api/ai/chats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Success Response (200):**

```json
{
    "success": true,
    "message": "Chats retrieved",
    "data": {
        "chats": [
            {
                "id": 1,
                "title": "Biology Study Chat",
                "context_type": "pdf",
                "message_count": 5,
                "last_message_at": "2026-04-02T10:35:00Z",
                "created_at": "2026-04-02T10:30:00Z"
            },
            {
                "id": 2,
                "title": "Chemistry Questions",
                "context_type": "text",
                "message_count": 3,
                "last_message_at": "2026-04-02T11:00:00Z",
                "created_at": "2026-04-02T10:45:00Z"
            }
        ],
        "total_chats": 2
    }
}
```

### 4.5 Delete Chat

```bash
curl -X DELETE http://localhost:8000/api/ai/chat/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Success Response (200):**

```json
{
    "success": true,
    "message": "Chat deleted successfully",
    "data": {}
}
```

---

## 🔴 Error Responses

### 401 - Unauthorized (Missing/Invalid Token)

```json
{
    "success": false,
    "message": "Unauthenticated"
}
```

### 403 - Forbidden (Don't own the resource)

```json
{
    "success": false,
    "message": "Chat not found or unauthorized"
}
```

### 422 - Validation Error

```json
{
    "success": false,
    "message": "Failed to process message",
    "errors": {
        "text": ["Text must be at least 10 characters"]
    }
}
```

### 422 - API Error

```json
{
    "success": false,
    "message": "Groq API error: Rate limit exceeded"
}
```

---

## 🧪 Testing Workflow

### Complete Test Workflow

```bash
# 1. Login and get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}' \
  | jq -r '.data.token')

echo "Token: $TOKEN"

# 2. Upload a file
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:8000/api/ai/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample.pdf")

TEXT=$(echo $UPLOAD_RESPONSE | jq -r '.data.text')
echo "Extracted: ${TEXT:0:100}..."

# 3. Summarize
curl -s -X POST http://localhost:8000/api/ai/summarize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$TEXT\",\"format\":\"bullet_points\"}" | jq '.data.summary'

# 4. Generate quiz
curl -s -X POST http://localhost:8000/api/ai/generate-quiz \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$TEXT\"}" | jq '.data.questions'

# 5. Start chat
CHAT_RESPONSE=$(curl -s -X POST http://localhost:8000/api/ai/chat/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Chat","context_type":"text"}')

CHAT_ID=$(echo $CHAT_RESPONSE | jq -r '.data.chat_id')
echo "Chat ID: $CHAT_ID"

# 6. Send message
curl -s -X POST http://localhost:8000/api/ai/chat/$CHAT_ID/message \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Explain the main concepts"}' | jq '.data.reply'
```

---

## 📦 Postman Collection

Save as `AI-API.postman_collection.json`:

```json
{
    "info": {
        "name": "Groq AI Module API",
        "version": "1.0.0"
    },
    "item": [
        {
            "name": "Upload File",
            "request": {
                "method": "POST",
                "url": "{{base_url}}/api/ai/upload",
                "header": [
                    {
                        "key": "Authorization",
                        "value": "Bearer {{token}}",
                        "type": "text"
                    }
                ],
                "body": {
                    "mode": "formdata",
                    "formdata": [{ "key": "file", "type": "file", "src": "" }]
                }
            }
        },
        {
            "name": "Summarize",
            "request": {
                "method": "POST",
                "url": "{{base_url}}/api/ai/summarize",
                "header": [
                    {
                        "key": "Authorization",
                        "value": "Bearer {{token}}",
                        "type": "text"
                    },
                    {
                        "key": "Content-Type",
                        "value": "application/json",
                        "type": "text"
                    }
                ],
                "body": {
                    "mode": "raw",
                    "raw": "{\"text\":\"your text\",\"format\":\"bullet_points\"}"
                }
            }
        }
    ],
    "variable": [
        { "key": "base_url", "value": "http://localhost:8000" },
        { "key": "token", "value": "" }
    ]
}
```

---

## 🚀 Quick PHP Script Test

```php
<?php
$token = 'your_bearer_token_here';
$baseUrl = 'http://localhost:8000/api';

// Helper function
function makeRequest($method, $endpoint, $data = null, $token) {
    $url = 'http://localhost:8000/api' . $endpoint;

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json',
    ]);

    if ($data) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }

    $response = curl_exec($ch);
    curl_close($ch);

    return json_decode($response, true);
}

// Test summarization
$result = makeRequest('POST', '/ai/summarize', [
    'text' => 'Your text here...',
    'format' => 'bullet_points'
], $token);

echo json_encode($result, JSON_PRETTY_PRINT);
?>
```

---

## ✅ Testing Checklist

- [ ] Upload PDF file successfully
- [ ] Generate bullet point summary
- [ ] Generate paragraph summary
- [ ] Generate detailed summary
- [ ] Generate quiz with 5 questions
- [ ] Verify quiz JSON format
- [ ] Start chat session
- [ ] Send message to chat
- [ ] Receive assistant reply
- [ ] Get chat history
- [ ] Get all chats list
- [ ] Delete chat
- [ ] Test error cases (invalid token, missing fields)
- [ ] Test file size limits
- [ ] Test text length limits

---

Built with ❤️ for testing success!
