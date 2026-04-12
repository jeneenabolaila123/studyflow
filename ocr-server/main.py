from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pdf2image import convert_from_path
import pytesseract
import httpx
import os
import re
import uuid

# =========================
# 🔥 APP FIRST (مهم جدًا)
# =========================
app = FastAPI()

# =========================
# 🔥 CORS
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# 🔥 CONFIG
# =========================
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

OLLAMA_URL = "http://localhost:11434/api/generate"

# 🔥 timeout أكبر
client = httpx.AsyncClient(timeout=60)

# =========================
# 🔥 HELPER (IMPORTANT)
# =========================
def extract_text(res):
    try:
        data = res.json()
        print("🔥 OLLAMA RESPONSE:", data)

        if "response" in data:
            return data["response"]
        elif "message" in data:
            return data["message"]["content"]
        else:
            return "No response from model"

    except Exception as e:
        return f"Error parsing response: {str(e)}"

# =========================
# CLEAN TEXT
# =========================
def clean_text(text: str):
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^a-zA-Z0-9.,!? ]", "", text)
    return text.strip()

# =========================
# OCR UPLOAD
# =========================
@app.post("/ocr-upload")
async def ocr_upload(file: UploadFile = File(...)):
    try:
        file_name = f"{uuid.uuid4()}.pdf"

        with open(file_name, "wb") as f:
            f.write(await file.read())

        images = convert_from_path(file_name, first_page=1, last_page=3)

        text = ""
        for img in images:
            extracted = pytesseract.image_to_string(img)
            text += extracted + " "

        os.remove(file_name)

        return {"text": text[:1000]}

    except Exception as e:
        return {"error": str(e)}

# =========================
# SUMMARY
# =========================
@app.post("/summary")
async def summary(data: dict):
    text = data.get("text", "")[:300]

    prompt = f"""
Summarize in 5 short bullet points:

{text}
"""

    try:
        response = await client.post(OLLAMA_URL, json={
            "model": "phi3:mini",
            "prompt": prompt,
            "stream": False,
            "options": {"num_predict": 120}
        })

        result = extract_text(response)
        return {"summary": result.strip()}

    except Exception as e:
        return {"error": str(e)}

# =========================
# QUESTION
# =========================
@app.post("/question")
async def question(data: dict):
    text = data.get("text", "")[:250]

    prompt = f"""
Generate ONE short question:

{text}
"""

    try:
        response = await client.post(OLLAMA_URL, json={
            "model": "phi3:mini",
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": 50,
                "temperature": 0.3,
                "top_p": 0.9,
                "repeat_penalty": 1.1
            }
        })

        result = extract_text(response)
        return {"question": result.strip()}

    except Exception as e:
        return {"error": str(e)}

# =========================
# FAST QUESTION
# =========================
@app.post("/question-fast")
async def question_fast(data: dict):
    text = data.get("text", "")[:150]

    prompt = f"""
Generate ONE short university question:

{text}
"""

    try:
        response = await client.post(OLLAMA_URL, json={
            "model": "phi3:mini",
            "prompt": prompt,
            "stream": False,
            "options": {"num_predict": 50}
        })

        result = extract_text(response)
        return {"question": result.strip()}

    except Exception as e:
        return {"error": str(e)}

# =========================
# CHAT
# =========================
@app.post("/chat")
async def chat(data: dict):
    question = data.get("question", "")
    text = data.get("text", "")[:150]

    prompt = f"""
Answer briefly and clearly:

Question: {question}

Context: {text}
"""

    try:
        response = await client.post(OLLAMA_URL, json={
            "model": "phi3:mini",
            "prompt": prompt,
            "stream": False,
            "options": {"num_predict": 100}
        })

        result = extract_text(response)
        return {"answer": result.strip()}

    except Exception as e:
        return {"error": str(e)}
    @app.post("/recommend")
async def recommend(data: dict):
    text = data.get("text", "")[:300]

    prompt = f"""
Based on this study text:

{text}

Give:
1. 3 related topics
2. 2 advanced questions
3. 1 study tip

Keep it short.
"""

    try:
        response = await client.post(OLLAMA_URL, json={
            "model": "phi3:mini",
            "prompt": prompt,
            "stream": False,
            "options": {"num_predict": 120}
        })

        result = extract_text(response)
        return {"recommendation": result.strip()}

    except Exception as e:
        return {"error": str(e)}