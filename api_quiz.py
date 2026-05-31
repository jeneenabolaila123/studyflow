import os
import re
import json
import uuid
import urllib.request
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data" / "openrouter_quiz_api"
PDF_DIR = DATA_DIR / "pdfs"
TEXT_DIR = DATA_DIR / "texts"
INDEX_FILE = DATA_DIR / "index.json"

PDF_DIR.mkdir(parents=True, exist_ok=True)
TEXT_DIR.mkdir(parents=True, exist_ok=True)

def env_value(key: str, default: str = "") -> str:
    value = os.environ.get(key)
    if value:
        return value.strip().strip('"').strip("'")

    env_path = ROOT / ".env"
    if not env_path.exists():
        return default

    for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        if k.strip() == key:
            return v.strip().strip('"').strip("'")
    return default

OPENROUTER_API_KEY = env_value("OPENROUTER_API_KEY")
OPENROUTER_MODEL = env_value("OPENROUTER_MODEL", "google/gemini-2.5-flash")

app = FastAPI(title="StudyFlow Fast OpenRouter Quiz API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str
    model: Optional[str] = None
    pdf_ids: Optional[List[str]] = None
    session_id: Optional[str] = None

def load_index() -> Dict[str, Any]:
    if not INDEX_FILE.exists():
        return {}
    try:
        return json.loads(INDEX_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}

def save_index(index: Dict[str, Any]) -> None:
    INDEX_FILE.write_text(json.dumps(index, indent=2, ensure_ascii=False), encoding="utf-8")

def extract_pdf_text(path: Path) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(str(path))
        pages = []
        for i, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            if text.strip():
                pages.append(f"[Page {i}]\n{text}")
        return "\n\n".join(pages).strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {e}")

def call_openrouter(prompt: str) -> str:
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY missing in .env")

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You generate exam-quality MCQs using only the provided PDF text. Return only the quiz, no markdown wrapper."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.12,
        "top_p": 0.85,
        "max_tokens": 1600
    }

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://127.0.0.1:5173",
            "X-Title": "StudyFlow"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=90) as res:
            data = json.loads(res.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenRouter failed: {e}")

def build_prompt(question: str, pdf_text: str) -> str:
    pdf_text = pdf_text[:16000]

    return f"""
Use ONLY this PDF content:

{pdf_text}

Task:
{question}

Generate exactly 5 MCQs:
- 3 Hard + 2 Medium.
- Each question has A, B, C, D.
- Correct answer is one letter only.
- No All of the above.
- No None of the above.
- Keep options short.
- Avoid copied long sentences.
- Prefer reasoning, comparison, cause-effect, process, limitation, or application.
- Add a short explanation.

Format exactly:

Q1 (Hard): ...
A. ...
B. ...
C. ...
D. ...
Correct answer: ...
Explanation: ...

Q2 (Hard): ...
A. ...
B. ...
C. ...
D. ...
Correct answer: ...
Explanation: ...

Q3 (Hard): ...
A. ...
B. ...
C. ...
D. ...
Correct answer: ...
Explanation: ...

Q4 (Medium): ...
A. ...
B. ...
C. ...
D. ...
Correct answer: ...
Explanation: ...

Q5 (Medium): ...
A. ...
B. ...
C. ...
D. ...
Correct answer: ...
Explanation: ...
""".strip()

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "StudyFlow OpenRouter Quiz API",
        "mode": "openrouter",
        "model": OPENROUTER_MODEL
    }

@app.get("/health")
@app.get("/api/v1/health")
def health():
    return {
        "status": "ok",
        "service": "StudyFlow OpenRouter Quiz API",
        "mode": "openrouter",
        "model": OPENROUTER_MODEL,
        "has_openrouter_key": bool(OPENROUTER_API_KEY),
        "total_pdfs": len(load_index())
    }

@app.get("/api/v1/models")
def models():
    return {
        "models": [
            OPENROUTER_MODEL,
            "google/gemini-2.5-flash"
        ]
    }

@app.post("/api/v1/pdfs/upload")
async def upload_pdf(file: UploadFile = File(...)):
    pdf_id = "pdf_" + uuid.uuid4().hex[:16]
    safe_name = file.filename or f"{pdf_id}.pdf"

    pdf_path = PDF_DIR / f"{pdf_id}_{safe_name}"
    pdf_path.write_bytes(await file.read())

    text = extract_pdf_text(pdf_path)
    if not text.strip():
        raise HTTPException(status_code=400, detail="No text could be extracted from this PDF.")

    text_path = TEXT_DIR / f"{pdf_id}.txt"
    text_path.write_text(text, encoding="utf-8", errors="ignore")

    page_count = len(re.findall(r"\[Page\s+\d+\]", text)) or 1

    index = load_index()
    index[pdf_id] = {
        "pdf_id": pdf_id,
        "name": safe_name,
        "collection_name": pdf_id,
        "pdf_path": str(pdf_path),
        "text_path": str(text_path),
        "doc_count": max(1, len(text) // 2500),
        "page_count": page_count,
        "is_sample": False
    }
    save_index(index)

    return index[pdf_id]

@app.get("/api/v1/pdfs")
def list_pdfs():
    return list(load_index().values())

@app.delete("/api/v1/pdfs/{pdf_id}")
def delete_pdf(pdf_id: str):
    index = load_index()
    meta = index.pop(pdf_id, None)

    if meta:
        for key in ["pdf_path", "text_path"]:
            p = Path(meta.get(key, ""))
            if p.exists():
                try:
                    p.unlink()
                except Exception:
                    pass

    save_index(index)
    return {"success": True, "deleted": pdf_id}


def parse_plain_text_mcqs(answer: str):
    import re

    if not answer or not isinstance(answer, str):
        return []

    blocks = re.split(r"(?=Q\d+\s*\((?:Hard|Medium|Easy)\)\s*:)", answer)
    questions = []

    for block in blocks:
        block = block.strip()
        if not re.match(r"Q\d+\s*\((?:Hard|Medium|Easy)\)\s*:", block, re.I):
            continue

        difficulty_match = re.match(r"Q\d+\s*\((Hard|Medium|Easy)\)\s*:", block, re.I)
        question_match = re.search(r"Q\d+\s*\((?:Hard|Medium|Easy)\)\s*:\s*(.*?)(?=\nA\.)", block, re.I | re.S)

        a = re.search(r"\nA\.\s*(.*?)(?=\nB\.)", block, re.I | re.S)
        b = re.search(r"\nB\.\s*(.*?)(?=\nC\.)", block, re.I | re.S)
        c = re.search(r"\nC\.\s*(.*?)(?=\nD\.)", block, re.I | re.S)
        d = re.search(r"\nD\.\s*(.*?)(?=\nCorrect answer\s*:)", block, re.I | re.S)
        correct = re.search(r"Correct answer\s*:\s*([A-D])", block, re.I)
        explanation = re.search(r"Explanation\s*:\s*(.*)", block, re.I | re.S)

        if not (question_match and a and b and c and d and correct):
            continue

        letter = correct.group(1).upper()

        questions.append({
            "difficulty": difficulty_match.group(1).capitalize() if difficulty_match else "Medium",
            "question": question_match.group(1).strip(),
            "options": {
                "A": a.group(1).strip(),
                "B": b.group(1).strip(),
                "C": c.group(1).strip(),
                "D": d.group(1).strip(),
            },
            "correct_answer": letter,
            "answer": letter,
            "correctAnswer": letter,
            "explanation": explanation.group(1).strip() if explanation else "",
        })

    return questions[:5]


@app.post("/api/v1/query")
def query(req: QueryRequest):
    index = load_index()

    selected_ids = req.pdf_ids or list(index.keys())
    texts = []
    used_ids = []

    for pdf_id in selected_ids:
        meta = index.get(pdf_id)
        if not meta:
            continue

        text_path = Path(meta["text_path"])
        if text_path.exists():
            text = text_path.read_text(encoding="utf-8", errors="ignore")
            if text.strip():
                texts.append(f"PDF: {meta.get('name', pdf_id)}\n{text}")
                used_ids.append(pdf_id)

    if not texts:
        return {
            "answer": "No PDFs found to query.",
            "sources": {},
            "metadata": {
                "model_used": OPENROUTER_MODEL,
                "mode": "openrouter",
                "pdfs_queried": 0,
                "chunks_retrieved": 0
            },
            "session_id": req.session_id or str(uuid.uuid4()),
            "message_id": int(uuid.uuid4().int % 100000)
        }

    prompt = build_prompt(req.question, "\n\n".join(texts))
    answer = call_openrouter(prompt)
    questions = parse_plain_text_mcqs(answer)

    # Force parser-friendly format if OpenRouter returns markdown/json/extra text
    if "Q1" not in answer or "Correct answer:" not in answer:
        repair_prompt = f"""
Rewrite the following quiz output into EXACTLY this plain text format.
Do not add markdown. Do not add code fences. Do not add JSON.

Required format:
Q1 (Hard): ...
A. ...
B. ...
C. ...
D. ...
Correct answer: A
Explanation: ...

Q2 (Hard): ...
A. ...
B. ...
C. ...
D. ...
Correct answer: B
Explanation: ...

Q3 (Hard): ...
A. ...
B. ...
C. ...
D. ...
Correct answer: C
Explanation: ...

Q4 (Medium): ...
A. ...
B. ...
C. ...
D. ...
Correct answer: D
Explanation: ...

Q5 (Medium): ...
A. ...
B. ...
C. ...
D. ...
Correct answer: A
Explanation: ...

Quiz output to rewrite:
{answer}
"""
        answer = call_openrouter(repair_prompt)

    # Clean common wrappers
    answer = answer.replace("```text", "").replace("```json", "").replace("```", "").strip()

    return {
        "answer": answer,
        "questions": questions,
        "data": {
            "answer": answer,
            "questions": questions
        },
        "sources": {pid: {"pdf_id": pid} for pid in used_ids},
        "metadata": {
            "model_used": OPENROUTER_MODEL,
            "mode": "openrouter",
            "pdfs_queried": len(used_ids),
            "chunks_retrieved": len(texts)
        },
        "session_id": req.session_id or str(uuid.uuid4()),
        "message_id": int(uuid.uuid4().int % 100000)
    }

