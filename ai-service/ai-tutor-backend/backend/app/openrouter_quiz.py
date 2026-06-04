import os
import re
import json
from dotenv import load_dotenv
from openai import OpenAI


BAD_MCQ_STEMS = [
    "primary",
    "main",
    "purpose",
    "definition",
    "define",
    "what is",
    "what are",
    "best describes",
    "which of the following best",
    "significance",
    "according to",
    "aim of",
    "goal of",
    "distinction between",
    "difference between",

    # blocks definition-style questions
    "which term",
    "which concept",
    "which pdf concept",
    "matches this description",
    "described as",
    "is described as",
    "refers to",
    "does the pdf define",
    "the pdf define",
    "the pdf describes",
    "in the pdf, which",
]

BAD_OPTION_TEXTS = [
    "all of the above",
    "none of the above",
    "both a and b",
    "both b and c",
]


def word_count(text: str) -> int:
    return len((text or "").split())


def is_weak_memorization_question(question: str) -> bool:
    q = (question or "").strip().lower()

    if any(bad in q for bad in BAD_MCQ_STEMS):
        return True

    # Reject copied-definition style after colon
    if ":" in q:
        after_colon = q.split(":", 1)[1].strip()
        if word_count(after_colon) >= 10:
            return True

    # Very long stems are usually copied from PDF
    if word_count(q) > 28:
        return True

    return False


def clean_mcq_questions(questions):
    cleaned = []

    for q in questions:
        if not isinstance(q, dict):
            continue

        question_text = (
            q.get("question")
            or q.get("text")
            or q.get("stem")
            or ""
        )

        if is_weak_memorization_question(question_text):
            continue

        options = q.get("options", {})

        if isinstance(options, dict):
            option_values = [
                str(options.get("A", "")).strip(),
                str(options.get("B", "")).strip(),
                str(options.get("C", "")).strip(),
                str(options.get("D", "")).strip(),
            ]
        elif isinstance(options, list):
            option_values = [str(opt).strip() for opt in options]
        else:
            continue

        if len(option_values) != 4:
            continue

        if any(not opt for opt in option_values):
            continue

        # reject duplicate options
        if len(set(opt.lower() for opt in option_values)) != 4:
            continue

        # reject All / None / Both
        if any(
            bad in opt.lower()
            for opt in option_values
            for bad in BAD_OPTION_TEXTS
        ):
            continue

        # reject copied long options
        if any(word_count(opt) > 12 for opt in option_values):
            continue

        correct = (
            q.get("correctAnswer")
            or q.get("correct_answer")
            or q.get("answer")
            or q.get("correct")
            or ""
        )

        correct = str(correct).strip().upper()[:1]

        if correct not in ["A", "B", "C", "D"]:
            continue

        cleaned.append(q)

    return cleaned


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
        or q.get("answer")
        or q.get("correct")
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
    safe_content = content[:70000]

    # We ask for more internally, then filter and keep the best 5.
    candidate_count = max(12, questions_count * 3)
    attempts = 3
    last_cleaned = []
    last_model = PRIMARY_MODEL

    for attempt in range(1, attempts + 1):
        prompt = f"""
You are a strict exam quiz generator.

Use ONLY the provided PDF/content.
Do NOT use outside knowledge.

Generate exactly {candidate_count} MCQ questions.

Difficulty rule:
- Make most questions Hard and some Medium.

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
            temperature=0.25 + (attempt * 0.05),
            max_tokens=5000,
            extra_body={
                "models": [FALLBACK_MODEL]
            },
        )

        last_model = response.model
        raw = response.choices[0].message.content
        data = extract_json(raw)

        questions = data.get("questions", [])
        normalized = []

        for i, q in enumerate(questions, start=1):
            if not isinstance(q, dict):
                continue

            item = normalize_question(q, i)

            if (
                item["question"]
                and item["correctAnswer"] in ["A", "B", "C", "D"]
                and all(item["options"].values())
            ):
                normalized.append(item)

        cleaned = clean_mcq_questions(normalized)
        last_cleaned = cleaned

        if len(cleaned) >= questions_count:
            return {
                "success": True,
                "source": "openrouter",
                "model": last_model,
                "questions": cleaned[:questions_count],
            }

    raise ValueError(
        f"Only {len(last_cleaned)} high-quality questions passed filtering. Please regenerate."
    )