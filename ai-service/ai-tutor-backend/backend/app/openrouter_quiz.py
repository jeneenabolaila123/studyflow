import os
import re
import json
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

PRIMARY_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")
FALLBACK_MODEL = os.getenv("OPENROUTER_FALLBACK_MODEL", "deepseek/deepseek-v4-flash")


def extract_json(text: str):
    text = str(text or "").strip()

    text = re.sub(r"^```json\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    start = text.find("{")
    end = text.rfind("}")

    if start != -1 and end != -1 and end > start:
        text = text[start:end + 1]

    return json.loads(text)


def normalize_question(q, index):
    options = q.get("options") or {}

    correct = str(
        q.get("correctAnswer")
        or q.get("correct_answer")
        or ""
    ).strip().upper()[:1]

    return {
        "id": q.get("id") or f"openrouter_q_{index}",
        "question": str(q.get("question", "")).strip(),
        "options": {
            "A": str(options.get("A", "")).strip(),
            "B": str(options.get("B", "")).strip(),
            "C": str(options.get("C", "")).strip(),
            "D": str(options.get("D", "")).strip(),
        },
        "correctAnswer": correct,
        "correct_answer": correct,
        "explanation": str(q.get("explanation", "")).strip(),
        "difficulty": str(q.get("difficulty", "Medium")).strip(),
        "source": "openrouter",
    }


def generate_quiz_openrouter(
    content: str,
    title: str = "",
    quiz_type: str = "mcq",
    difficulty: str = "mixed",
    questions_count: int = 5,
):
    if not content or len(content.strip()) < 50:
        raise ValueError("Content text is too short for quiz generation.")

    questions_count = int(questions_count or 5)

    # Keep it fast and cheaper for deadline.
    safe_content = content[:70000]

    prompt = f"""
You are a strict exam quiz generator.

Use ONLY the provided PDF/content.
Do NOT use outside knowledge.

Generate exactly {questions_count} MCQ questions.

Difficulty rule:
- If {questions_count} = 5, make 3 Hard and 2 Medium.
- Otherwise mix mostly Hard with some Medium.

Requirements:
- Each question has A, B, C, D.
- Correct answer must be one letter only: A, B, C, or D.
- No "All of the above".
- No "None of the above".
- Keep options short.
- Questions must test concepts, not tiny memorized wording.
- Explanation must be short and based on the provided content.
- Return ONLY valid JSON.
- No markdown.
- No text outside JSON.

JSON format:
{{
  "questions": [
    {{
      "question": "...",
      "options": {{
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      }},
      "correctAnswer": "A",
      "explanation": "...",
      "difficulty": "Hard"
    }}
  ]
}}

TITLE:
{title}

CONTENT:
{safe_content}
"""

    response = client.chat.completions.create(
        model=PRIMARY_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You return only valid JSON. No markdown. No extra text.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        temperature=0.2,
        max_tokens=3500,
        extra_body={
            "models": [FALLBACK_MODEL]
        },
    )

    raw = response.choices[0].message.content
    data = extract_json(raw)

    questions = data.get("questions", [])
    cleaned = []

    for i, q in enumerate(questions, start=1):
        if not isinstance(q, dict):
            continue

        item = normalize_question(q, i)

        if (
            item["question"]
            and item["correctAnswer"] in ["A", "B", "C", "D"]
            and all(item["options"].values())
        ):
            cleaned.append(item)

    if len(cleaned) == 0:
        raise ValueError("OpenRouter returned no valid questions.")

    return {
        "success": True,
        "source": "openrouter",
        "model": response.model,
        "questions": cleaned[:questions_count],
    }