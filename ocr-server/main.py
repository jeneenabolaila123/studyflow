from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import requests
import re

app = FastAPI(title="StudyFlow Quiz API")

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "qwen3:1.7b"


class QuizGenerateRequest(BaseModel):
    chapter_title: str
    text: str
    difficulty: str = "medium"
    count: int = 10


class QuestionItem(BaseModel):
    question: str
    topic: str
    options: List[str]
    correct_letter: str
    correct_answer: str


class QuizGenerateResponse(BaseModel):
    chapter_title: str
    questions: List[QuestionItem]
    raw_output: str


def build_quiz_prompt(extracted_text: str, count: int = 10, difficulty: str = "medium") -> str:
    return f"""
You are a strict university professor creating exam-quality MCQs.

Task:
Generate exactly {count} multiple-choice questions based only on the provided text.

Requirements:
- Difficulty: {difficulty}
- Each question must test understanding, not copying
- Each question must focus on a different concept
- Keep questions clear and concise
- Include a short topic label for each question
- Each question must have exactly 4 options: A, B, C, D
- Only one option is correct
- Do not repeat ideas
- Do not include explanations
- Do not include introductions, comments, reasoning, progress messages, or analysis
- Do not write anything before Q1
- Do not write anything after Q{count}

STRICT FORMAT:

Q1: question text
Topic: topic name
A) option
B) option
C) option
D) option
Correct: A

Q2: question text
Topic: topic name
A) option
B) option
C) option
D) option
Correct: B

Repeat until Q{count}.

TEXT:
\"\"\"
{extracted_text}
\"\"\"
""".strip()


def call_ollama(prompt: str) -> str:
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
            },
            timeout=120,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("response", "").strip()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Ollama request failed: {str(e)}")


def keep_only_quiz_output(text: str) -> str:
    start = text.find("Q1:")
    return text[start:].strip() if start != -1 else text.strip()


def parse_quiz(raw_text: str) -> List[QuestionItem]:
    cleaned = keep_only_quiz_output(raw_text)

    pattern = re.compile(
        r"Q\d+:\s*(.*?)\n"
        r"Topic:\s*(.*?)\n"
        r"A\)\s*(.*?)\n"
        r"B\)\s*(.*?)\n"
        r"C\)\s*(.*?)\n"
        r"D\)\s*(.*?)\n"
        r"Correct:\s*([ABCD])",
        re.DOTALL
    )

    matches = pattern.findall(cleaned)
    questions: List[QuestionItem] = []

    for match in matches:
        question_text, topic, a, b, c, d, correct_letter = match
        options = [a.strip(), b.strip(), c.strip(), d.strip()]
        correct_index = ord(correct_letter.strip()) - ord("A")
        correct_answer = options[correct_index]

        questions.append(
            QuestionItem(
                question=question_text.strip(),
                topic=topic.strip(),
                options=options,
                correct_letter=correct_letter.strip(),
                correct_answer=correct_answer.strip(),
            )
        )

    return questions


@app.post("/generate-quiz", response_model=QuizGenerateResponse)
def generate_quiz(request: QuizGenerateRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required.")

    if request.count < 1 or request.count > 20:
        raise HTTPException(status_code=400, detail="Count must be between 1 and 20.")

    prompt = build_quiz_prompt(
        extracted_text=request.text,
        count=request.count,
        difficulty=request.difficulty,
    )

    raw_output = call_ollama(prompt)
    questions = parse_quiz(raw_output)

    if len(questions) == 0:
        raise HTTPException(
            status_code=500,
            detail="Failed to parse quiz questions from model output."
        )

    return QuizGenerateResponse(
        chapter_title=request.chapter_title,
        questions=questions,
        raw_output=raw_output,
    )