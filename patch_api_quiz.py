from pathlib import Path

path = Path("api_quiz.py")
text = path.read_text(encoding="utf-8")

helper = '''
def parse_plain_text_mcqs(answer: str):
    import re

    if not answer or not isinstance(answer, str):
        return []

    blocks = re.split(r"(?=Q\\d+\\s*\\((?:Hard|Medium|Easy)\\)\\s*:)", answer)
    questions = []

    for block in blocks:
        block = block.strip()
        if not re.match(r"Q\\d+\\s*\\((?:Hard|Medium|Easy)\\)\\s*:", block, re.I):
            continue

        difficulty_match = re.match(r"Q\\d+\\s*\\((Hard|Medium|Easy)\\)\\s*:", block, re.I)
        question_match = re.search(r"Q\\d+\\s*\\((?:Hard|Medium|Easy)\\)\\s*:\\s*(.*?)(?=\\nA\\.)", block, re.I | re.S)

        a = re.search(r"\\nA\\.\\s*(.*?)(?=\\nB\\.)", block, re.I | re.S)
        b = re.search(r"\\nB\\.\\s*(.*?)(?=\\nC\\.)", block, re.I | re.S)
        c = re.search(r"\\nC\\.\\s*(.*?)(?=\\nD\\.)", block, re.I | re.S)
        d = re.search(r"\\nD\\.\\s*(.*?)(?=\\nCorrect answer\\s*:)", block, re.I | re.S)
        correct = re.search(r"Correct answer\\s*:\\s*([A-D])", block, re.I)
        explanation = re.search(r"Explanation\\s*:\\s*(.*)", block, re.I | re.S)

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

'''

if "def parse_plain_text_mcqs" not in text:
    text = text.replace('@app.post("/api/v1/query")', helper + '\n@app.post("/api/v1/query")')

lines = text.splitlines()
new_lines = []
after_openrouter_answer = False
inserted_question_line = "questions = parse_plain_text_mcqs(answer)" in text
inserted_return_questions = '"questions": questions' in text

for line in lines:
    new_lines.append(line)

    if "answer = call_openrouter(prompt)" in line:
        after_openrouter_answer = True
        if not inserted_question_line:
            new_lines.append("    questions = parse_plain_text_mcqs(answer)")
            inserted_question_line = True

    elif after_openrouter_answer and line.strip() == '"answer": answer,' and not inserted_return_questions:
        new_lines.append('        "questions": questions,')
        new_lines.append('        "data": {')
        new_lines.append('            "answer": answer,')
        new_lines.append('            "questions": questions')
        new_lines.append('        },')
        inserted_return_questions = True
        after_openrouter_answer = False

text = "\n".join(new_lines) + "\n"
path.write_text(text, encoding="utf-8")

print("PATCH_OK")
print("has_parser:", "def parse_plain_text_mcqs" in text)
print("has_questions_line:", "questions = parse_plain_text_mcqs(answer)" in text)
print("has_questions_return:", '"questions": questions' in text)
