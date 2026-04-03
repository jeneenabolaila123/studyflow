from fastapi import FastAPI
import httpx
import re
import hashlib
import random

app = FastAPI()

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
client = httpx.AsyncClient(timeout=40)

# 🧠 memory
used_hashes = set()

# =========================
# CLEAN TEXT (Memma style)
# =========================
def clean_text(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()[:150]  # 🔥 speed boost


# =========================
# EXTRACT KEY IDEA 🔥
# =========================
def extract_focus(text: str):
    sentences = re.split(r'[.?!]', text)
    sentences = [s.strip() for s in sentences if len(s) > 20]

    if not sentences:
        return text

    return random.choice(sentences)


# =========================
# PROMPT (phi3 optimized)
# =========================
def build_prompt(text: str):
    return f"""
Generate ONE university-level multiple-choice question.

Rules:
- No repetition
- Focus on ONE concept only
- 4 options only
- One correct answer
- No explanation
- Clear and short

Text:
{text}

Format:

Question: ...
A) ...
B) ...
C) ...
D) ...
Answer: ...
"""


# =========================
# DUPLICATE CHECK
# =========================
def is_duplicate(q: str):
    h = hashlib.md5(q.encode()).hexdigest()
    if h in used_hashes:
        return True
    used_hashes.add(h)
    return False


# =========================
# MAIN ENDPOINT 🔥🔥🔥
# =========================
@app.post("/question-fast")
async def generate_question(data: dict):

    raw_text = data.get("text", "")

    # 1. clean
    text = clean_text(raw_text)

    # 2. focus idea (Memma trick 🔥)
    text = extract_focus(text)

    # 3. retry system
    for _ in range(3):

        prompt = build_prompt(text)

        res = await client.post(OLLAMA_URL, json={
            "model": "phi3:mini",
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.6,
                "num_predict": 120
            }
        })

        result = res.json()["response"].strip()

        if not is_duplicate(result):
            return {
                "question": result
            }

    return {"question": result}


# =========================
# RESET (useful 🔥)
# =========================
@app.get("/reset")
async def reset():
    used_hashes.clear()
    return {"ok": True}
