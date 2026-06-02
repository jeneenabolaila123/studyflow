import os
import time
import requests
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel

try:
    from PyPDF2 import PdfReader
except Exception:
    PdfReader = None


app = FastAPI(title="StudyFlow Local Summary Service")

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("SUMMARY_MODEL", os.getenv("OLLAMA_MODEL", "llama3.2:3b"))


class ConversationRequest(BaseModel):
    human_input: str


def ask_ollama(text: str) -> str:
  prompt = f"""
You are an academic study assistant.

Summarize the following content using ONLY the provided text.
Do not add outside information.
Make the summary detailed enough for exam revision.

Return the answer in this exact structure:

Main Ideas
- Write 4 to 6 clear bullet points.
- Focus on the central concepts, not only the title.

Key Facts
- Write 5 to 8 important facts from the content.
- Include definitions, classifications, causes, examples, or steps when available.

Important Details
- Write 6 to 10 detailed bullet points.
- Explain relationships between ideas.
- Include examples from the text when available.

Exam Revision Notes
- Write 5 to 8 revision points.
- Focus on what a student should remember for an exam.
- Avoid very short or generic notes.

Content:
{text}
"""

    response = requests.post(
        f"{OLLAMA_HOST}/api/generate",
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.1,
                "top_p": 0.85,
                "num_ctx": 4096,
                "num_predict": 2200
            },
        },
        timeout=600,
    )

    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"Ollama failed: {response.text}",
        )

    data = response.json()
    summary = data.get("response", "").strip()

    if not summary:
        raise HTTPException(status_code=502, detail="Ollama returned empty summary.")

    return summary


def extract_text_from_upload(uploaded_file: UploadFile, raw_bytes: bytes) -> str:
    filename = (uploaded_file.filename or "").lower()

    if filename.endswith(".pdf"):
        if PdfReader is None:
            raise HTTPException(
                status_code=500,
                detail="PyPDF2 is not installed. Run: pip install PyPDF2",
            )

        import io

        reader = PdfReader(io.BytesIO(raw_bytes))
        pages = []

        for page in reader.pages:
            pages.append(page.extract_text() or "")

        return "\n".join(pages).strip()

    try:
        return raw_bytes.decode("utf-8", errors="ignore").strip()
    except Exception:
        return ""


@app.get("/")
def health():
    try:
        tags = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=10)
        return {
            "success": True,
            "message": "Summary FastAPI is running.",
            "ollama_status": tags.status_code,
            "model": OLLAMA_MODEL,
        }
    except Exception as e:
        return {
            "success": False,
            "message": "FastAPI is running, but Ollama is not reachable.",
            "error": str(e),
            "model": OLLAMA_MODEL,
        }


@app.post("/conversation")
def summarize_text(payload: ConversationRequest):
    text = payload.human_input.strip()

    if len(text) < 5:
        raise HTTPException(status_code=422, detail="Text is too short.")

    start = time.time()
    summary = ask_ollama(text)
    seconds = round(time.time() - start, 2)

    return {
        "success": True,
        "output": summary,
        "summary": summary,
        "processing_time_seconds": seconds,
        "processing_time_minutes": round(seconds / 60, 2),
    }


@app.post("/file/upload")
async def summarize_file(uploaded_file: UploadFile = File(...)):
    raw_bytes = await uploaded_file.read()
    text = extract_text_from_upload(uploaded_file, raw_bytes)

    if len(text.strip()) < 5:
        raise HTTPException(status_code=422, detail="Could not extract enough text from file.")

    start = time.time()
    summary = ask_ollama(text[:12000])
    seconds = round(time.time() - start, 2)

    return {
        "success": True,
        "result": summary,
        "summary": summary,
        "file_type": uploaded_file.filename.split(".")[-1] if uploaded_file.filename else "file",
        "processing_time_seconds": seconds,
        "processing_time_minutes": round(seconds / 60, 2),
    }