"""
StudyFlow FastAPI Local AI Backend - SUMMARY ONLY
PDF/TXT summarization with local Ollama.

Fixed version:
- Prevents summaries from stopping at only 2-3 sections by increasing num_predict.
- Uses controlled bullet counts so the model can finish all required sections.
- Keeps the summary detailed but not repetitive.
- Removes broken/incomplete output safely.
- Uses generic cleanup only; no PDF-specific memorized replacements.
- Keeps Section 5 as the final section for stability.
- This service DOES NOT save summaries to the database.
  Saving must be handled in Laravel/React after this API returns the summary.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import Any, Optional

import fitz
import requests
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# =========================================================
# CONFIG
# =========================================================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SUMMARY_MODEL = os.getenv("SUMMARY_MODEL", "qwen3:1.7b")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_TIMEOUT_SECONDS = int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "1800"))  # 30 minutes

# Good for CPU / 8GB RAM.
# These values reduce chunk count without making each prompt too huge.
SUMMARY_CHUNK_CHARS_SMALL = 3500
SUMMARY_CHUNK_CHARS_MEDIUM = 6500
SUMMARY_CHUNK_CHARS_LARGE = 8000

MIN_TEXT_LENGTH = 50


# =========================================================
# SCHEMAS
# =========================================================

class Input(BaseModel):
    human_input: str


class SummaryInput(BaseModel):
    text: Optional[str] = None
    human_input: Optional[str] = None


class SummaryOutput(BaseModel):
    output: str
    summary: str
    result: str
    processing_time_seconds: Optional[float] = None
    processing_time_minutes: Optional[float] = None


# =========================================================
# APP
# =========================================================

app = FastAPI(title="StudyFlow Local AI Backend - Summary Only")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# GENERAL HELPERS
# =========================================================

def clean_model_output(text: str) -> str:
    if not text:
        return ""

    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"```(?:json|text|python|markdown|md)?", "", text, flags=re.IGNORECASE)
    text = text.replace("```", "")
    return text.strip()


def is_pdf_file(uploaded_file: UploadFile) -> bool:
    filename = (uploaded_file.filename or "").lower()
    content_type = (uploaded_file.content_type or "").lower()
    return content_type == "application/pdf" or filename.endswith(".pdf")


def is_txt_file(uploaded_file: UploadFile) -> bool:
    filename = (uploaded_file.filename or "").lower()
    content_type = (uploaded_file.content_type or "").lower()
    return (
        content_type.startswith("text/plain")
        or filename.endswith(".txt")
        or filename.endswith(".text")
    )


def decode_txt_bytes(file_bytes: bytes) -> str:
    if not file_bytes:
        return ""

    for encoding in ["utf-8", "utf-8-sig", "latin-1"]:
        try:
            return file_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue

    return file_bytes.decode("latin-1", errors="ignore")


def clean_source_text(text: str) -> str:
    if not text:
        return ""

    text = clean_model_output(text)
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)

    generic_noise = [
        "copyright",
        "all rights reserved",
        "references",
        "bibliography",
        "index",
        "www.",
        "http://",
        "https://",
    ]

    cleaned_lines: list[str] = []

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        low = line.lower()

        if re.fullmatch(r"---\s*page\s*\d+\s*---", low, flags=re.IGNORECASE):
            cleaned_lines.append(line)
            continue

        if any(noise in low for noise in generic_noise):
            continue

        if re.fullmatch(r"\d{1,4}", line):
            continue

        if len(line) <= 2:
            continue

        cleaned_lines.append(line)

    text = "\n".join(cleaned_lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_pdf_text(file_bytes: bytes) -> str:
    try:
        pdf_document = fitz.open("pdf", file_bytes)
        pages_text: list[str] = []

        for page_index, page in enumerate(pdf_document, start=1):
            page_text = page.get_text("text")
            if page_text and page_text.strip():
                pages_text.append(f"\n--- PAGE {page_index} ---\n{page_text.strip()}")

        pdf_document.close()
        return clean_source_text("\n\n".join(pages_text))

    except Exception as e:
        logger.exception(f"PDF text extraction failed: {e}")
        return ""


def call_ollama_generate(
    prompt: str,
    model: str,
    format_json: bool = False,
    timeout: int = OLLAMA_TIMEOUT_SECONDS,
    num_ctx: int = 4096,
    num_predict: int = 1800,
    temperature: float = 0.07,
    top_p: float = 0.80,
    repeat_penalty: float = 1.18,
) -> str:
    payload: dict[str, Any] = {
        "model": model,
        "prompt": "/no_think\n" + prompt.strip(),
        "stream": True,
        "think": False,
        "keep_alive": "10m",
        "options": {
            "temperature": temperature,
            "top_p": top_p,
            "repeat_penalty": repeat_penalty,
            "num_ctx": num_ctx,
            "num_predict": num_predict,
        },
    }

    if format_json:
        payload["format"] = "json"

    parts: list[str] = []

    try:
        with requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json=payload,
            stream=True,
            timeout=(20, timeout),
        ) as response:
            if response.status_code == 404:
                raise HTTPException(
                    status_code=404,
                    detail=(
                        f"Ollama model not found: {model}. "
                        f"Run: ollama pull {model} or change SUMMARY_MODEL."
                    ),
                )

            response.raise_for_status()

            for line in response.iter_lines(decode_unicode=True):
                if not line:
                    continue

                try:
                    item = json.loads(line)
                except Exception:
                    continue

                if "response" in item:
                    parts.append(item.get("response") or "")

                if item.get("done") is True:
                    break

    except HTTPException:
        raise
    except requests.exceptions.ReadTimeout as e:
        raise HTTPException(
            status_code=504,
            detail=(
                "Ollama took too long while generating the summary. "
                "Try a smaller PDF section, restart Ollama, or lower num_predict."
            ),
        ) from e
    except requests.exceptions.ConnectionError as e:
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to Ollama. Make sure Ollama is running on http://127.0.0.1:11434.",
        ) from e
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Ollama request failed: {e}") from e

    return clean_model_output("".join(parts))


# =========================================================
# TEXT CHUNKING
# =========================================================

def split_text_into_chunks(text: str, max_chars: int = 6500) -> list[str]:
    text = clean_source_text(text)
    if not text:
        return []

    page_blocks = re.split(r"(?=---\s*PAGE\s*\d+\s*---)", text, flags=re.IGNORECASE)
    if len(page_blocks) <= 1:
        page_blocks = re.split(r"\n\s*\n+", text)

    chunks: list[str] = []
    current = ""

    for block in page_blocks:
        block = block.strip()
        if not block:
            continue

        if len(current) + len(block) + 2 <= max_chars:
            current += block + "\n\n"
        else:
            if current.strip():
                chunks.append(current.strip())

            if len(block) > max_chars:
                for i in range(0, len(block), max_chars):
                    part = block[i:i + max_chars].strip()
                    if part:
                        chunks.append(part)
                current = ""
            else:
                current = block + "\n\n"

    if current.strip():
        chunks.append(current.strip())

    return chunks


# =========================================================
# SUMMARY DEDUPLICATION HELPERS
# =========================================================

def _summary_line_words(line: str) -> set[str]:
    words = re.findall(r"[a-zA-Z][a-zA-Z0-9_-]+", str(line).lower())

    stop_words = {
        "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
        "is", "are", "was", "were", "as", "that", "which", "this", "these",
        "those", "be", "been", "being", "can", "could", "would", "should",
        "must", "may", "might", "will", "has", "have", "had", "not", "but",
        "from", "by", "into", "about", "also", "only", "more", "most",
        "page", "source", "material", "text", "section", "summary",
        "main", "important", "key", "concept", "concepts", "details",
    }

    return {w for w in words if w not in stop_words and len(w) > 2}


def _is_repeated_summary_line(line: str, previous_word_sets: list[set[str]]) -> bool:
    current_words = _summary_line_words(line)
    if len(current_words) < 3:
        return False

    for old_words in previous_word_sets:
        if not old_words:
            continue

        overlap = len(current_words & old_words) / max(1, min(len(current_words), len(old_words)))
        if overlap >= 0.76:
            return True

    return False


def remove_repeated_summary_bullets(text: str) -> str:
    if not text:
        return ""

    cleaned_lines: list[str] = []
    seen_word_sets: list[set[str]] = []

    for raw_line in text.splitlines():
        line = raw_line.strip()

        if not line:
            if cleaned_lines and cleaned_lines[-1] != "":
                cleaned_lines.append("")
            continue

        # Keep headings.
        if line.startswith("#") or re.match(r"^SECTION\s+\d+/\d+\s+NOTES", line, flags=re.IGNORECASE):
            cleaned_lines.append(line)
            continue

        if _is_repeated_summary_line(line, seen_word_sets):
            continue

        words = _summary_line_words(line)
        if words:
            seen_word_sets.append(words)

        cleaned_lines.append(line)

    output = "\n".join(cleaned_lines)
    output = re.sub(r"\n{3,}", "\n\n", output)
    return output.strip()


def has_required_summary_sections(text: str) -> bool:
    if not text:
        return False

    required_patterns = [
        r"##\s*1\.\s*Main Idea",
        r"##\s*2\.\s*Main Topics",
        r"##\s*3\.\s*Key Facts and Concepts",
        r"##\s*4\.\s*Important Details",
        r"##\s*5\.\s*Exam Revision Points",
    ]

    return all(re.search(pattern, text, flags=re.IGNORECASE) for pattern in required_patterns)


def count_summary_sections(text: str) -> int:
    if not text:
        return 0

    return len(re.findall(r"^##\s*\d+\.", text, flags=re.MULTILINE))


def remove_broken_rtl_visual_noise(text: str) -> str:
    """
    Generic cleanup for unreadable RTL/PDF extraction fragments.
    No memorized terms and no PDF-specific replacements.
    It only removes very short mostly-RTL lines that look visually broken.
    """
    if not text:
        return ""

    cleaned_lines: list[str] = []

    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()

        if not stripped:
            cleaned_lines.append(line)
            continue

        # Remove bullets that are mostly Arabic isolated examples mixed with unclear fragments.
        arabic_chars = re.findall(r"[\u0600-\u06FF]", stripped)
        english_chars = re.findall(r"[A-Za-z]", stripped)

        # If a line is mostly Arabic but very short/garbled, skip it.
        if len(arabic_chars) >= 4 and len(english_chars) < 8 and len(stripped) < 45:
            continue

        # Generic cleanup only.
        # Do NOT replace specific academic terms with guessed corrections.
        # This keeps the service unbiased and prevents memorization from one PDF.
        cleaned_lines.append(stripped)

    return "\n".join(cleaned_lines).strip()


def final_summary_cleanup(text: str) -> str:
    """
    Final safe display cleanup.
    Guarantees:
    - Keeps only sections 1 to 5.
    - Removes empty or broken section headings.
    - Removes near-duplicate bullets across sections.
    - Trims incomplete final sentences.
    """
    if not text:
        return ""

    text = clean_model_output(text)
    text = remove_broken_rtl_visual_noise(text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    # Keep only Section 1 to Section 5.
    section_6_match = re.search(r"\n##\s*6\.", text)
    if section_6_match:
        text = text[:section_6_match.start()].strip()

    cleaned_lines: list[str] = []
    seen_word_sets: list[set[str]] = []

    for raw_line in text.splitlines():
        line = raw_line.strip()

        if not line:
            if cleaned_lines and cleaned_lines[-1] != "":
                cleaned_lines.append("")
            continue

        # Keep title/headings.
        if line.startswith("#"):
            cleaned_lines.append(line)
            continue

        if line in ["- ...", "...", "-", "â€”"]:
            continue

        words = _summary_line_words(line)

        # Remove repeated meaning across final sections.
        if words and len(words) >= 4:
            repeated = False

            for old_words in seen_word_sets:
                overlap = len(words & old_words) / max(1, min(len(words), len(old_words)))
                if overlap >= 0.74:
                    repeated = True
                    break

            if repeated:
                continue

            seen_word_sets.append(words)

        cleaned_lines.append(line)

    output = "\n".join(cleaned_lines)
    output = re.sub(r"\n{3,}", "\n\n", output).strip()

    # Trim broken final sentence if the model stopped mid-sentence.
    if output and output[-1] not in ".!?":
        last_stop = max(output.rfind("."), output.rfind("!"), output.rfind("?"))
        last_heading = output.rfind("\n##")
        if last_stop > last_heading:
            output = output[: last_stop + 1].strip()

    # Remove headings with no real content under them.
    lines = output.splitlines()
    final_lines: list[str] = []
    i = 0

    while i < len(lines):
        line = lines[i].rstrip()

        if line.startswith("##"):
            section_lines: list[str] = []
            j = i + 1

            while j < len(lines) and not lines[j].startswith("##"):
                if lines[j].strip():
                    section_lines.append(lines[j].rstrip())
                j += 1

            has_real_content = any(
                item.strip() and item.strip() not in ["- ...", "...", "-", "â€”"]
                for item in section_lines
            )

            if has_real_content:
                final_lines.append(line)
                final_lines.extend(section_lines)
                final_lines.append("")

            i = j
            continue

        final_lines.append(line)
        i += 1

    output = "\n".join(final_lines)
    output = re.sub(r"\n{3,}", "\n\n", output).strip()

    # Emergency cutoff again.
    output = re.sub(r"\n##\s*6\..*", "", output, flags=re.DOTALL).strip()

    return output


# =========================================================
# PROMPTS
# =========================================================

FINAL_SUMMARY_FORMAT = """
FINAL OUTPUT FORMAT:
# Text Summary

## 1. Main Idea
Write exactly 2 clear sentences.

## 2. Main Topics
- Write 5 to 7 unique bullets.
- Cover the main lecture areas without repeating the Main Idea.

## 3. Key Facts and Concepts
- Write 6 to 8 unique bullets.
- Each bullet must add a new fact, concept, example, or relationship from the text.

## 4. Important Details
- Write 6 to 8 unique bullets.
- Include specific challenges, examples, classifications, and computational effects.

## 5. Exam Revision Points
- Write 5 to 7 unique bullets.
- Write review-focused points without repeating previous bullet wording.
- Do not create any section after Exam Revision Points.
"""


STRICT_SUMMARY_RULES = """
STRICT RULES:
- Use ONLY the provided text.
- Do NOT use outside knowledge.
- Do NOT invent facts, dates, names, examples, definitions, or explanations.
- Remove repetition aggressively.
- Do NOT repeat the same idea in different sections.
- If an idea appears in Main Idea, do NOT repeat it again as a bullet unless adding a new detail.
- Each section must add new information, not restate earlier lines.
- Stop after section 5. Do not write section 6.
- Preserve important terms exactly when they are readable.
- If examples or non-English terms look reversed, broken, or unreadable after PDF extraction, explain the concept in English instead of copying broken text.
- Keep the answer in English.
- Make it useful for studying and exam revision.
- Make the summary detailed enough for exam study, but still organized and non-repetitive.
- Do not make it too short for long lecture PDFs.
"""


# =========================================================
# SUMMARY PIPELINE
# =========================================================

def summarize_single_text(text: str) -> str:
    """
    One-call summary for small input.
    Faster and avoids chunk-heading repetition.
    """
    prompt = f"""
You are a careful academic summarization assistant.

TASK:
Create one clean study summary from the provided text.

{STRICT_SUMMARY_RULES}

{FINAL_SUMMARY_FORMAT}

TEXT:
{text}
"""

    output = call_ollama_generate(
        prompt=prompt,
        model=SUMMARY_MODEL,
        format_json=False,
        timeout=OLLAMA_TIMEOUT_SECONDS,
        num_ctx=4096,
        # FIX: 1400 was too small and caused output to stop at section 3.
        num_predict=2400,
        temperature=0.07,
        top_p=0.80,
        repeat_penalty=1.18,
    )

    output = final_summary_cleanup(output)

    # Safety: if the model still failed to finish, retry once with fewer bullets.
    if not has_required_summary_sections(output):
        logger.warning(
            f"Summary missing required sections after first pass. "
            f"Sections found: {count_summary_sections(output)}. Retrying once."
        )
        retry_prompt = f"""
You are a careful academic summarization assistant.

TASK:
Create a complete study summary from the provided text.
The previous answer was incomplete. You MUST include all 5 sections.

{STRICT_SUMMARY_RULES}

FINAL OUTPUT FORMAT:
# Text Summary

## 1. Main Idea
Write exactly 2 clear sentences.

## 2. Main Topics
- Write exactly 5 unique bullets.

## 3. Key Facts and Concepts
- Write exactly 6 unique bullets.

## 4. Important Details
- Write exactly 6 unique bullets.

## 5. Exam Revision Points
- Write exactly 5 unique bullets.
- Do not create any section after Exam Revision Points.

TEXT:
{text}
"""
        output = call_ollama_generate(
            prompt=retry_prompt,
            model=SUMMARY_MODEL,
            format_json=False,
            timeout=OLLAMA_TIMEOUT_SECONDS,
            num_ctx=4096,
            num_predict=2200,
            temperature=0.06,
            top_p=0.78,
            repeat_penalty=1.20,
        )
        output = final_summary_cleanup(output)

    return output


def summarize_chunk(chunk: str, index: int, total: int) -> str:
    """
    Chunk output is notes only, not a full formatted summary.
    This prevents each chunk from repeating Main Ideas / Key Facts headings.
    """
    prompt = f"""
You are a careful academic summarization assistant.

TASK:
Extract compact study notes from this text section.

STRICT RULES:
- Use ONLY the provided text section.
- Do NOT use outside knowledge.
- Do NOT invent facts, dates, names, examples, definitions, or explanations.
- Preserve important terms exactly when they are readable.
- If examples or non-English terms look reversed, broken, or unreadable after PDF extraction, explain the concept in English instead of copying broken text.
- Avoid repetition.
- Do NOT repeat an idea using different wording.
- Keep the answer in English.
- Focus on facts, relationships, processes, causes/effects, examples, and exam-useful details.
- Be concise but do not miss important concepts.

OUTPUT FORMAT:
SECTION {index}/{total} NOTES:
- ...
- ...

LIMIT:
- Maximum 12 bullets.
- Each bullet must be useful, specific, and unique.
- Include important examples and subtopics if they appear in this section.

TEXT SECTION {index} OF {total}:
{chunk}
"""

    output = call_ollama_generate(
        prompt=prompt,
        model=SUMMARY_MODEL,
        format_json=False,
        timeout=OLLAMA_TIMEOUT_SECONDS,
        num_ctx=4096,
        num_predict=850,
        temperature=0.08,
        top_p=0.82,
        repeat_penalty=1.18,
    )

    return remove_repeated_summary_bullets(output)


def combine_summaries(summaries: list[str]) -> str:
    if not summaries:
        return "No summary could be generated."

    joined = "\n\n".join(summaries)
    joined = remove_repeated_summary_bullets(joined)

    prompt = f"""
You are a careful academic summarization assistant.

TASK:
Merge the section notes into one clean final study summary.

{STRICT_SUMMARY_RULES}

Additional merge rules:
- Use ONLY the section notes.
- Do NOT invent new facts.
- If the same idea appears multiple times, keep it once only.
- Do not repeat the topic name in every section.
- Do not restate the same main topic in multiple sections.
- For long lecture notes, include all major covered topics with enough details for studying.
- Prefer clear grouped points over many repeated bullets.

{FINAL_SUMMARY_FORMAT}

SECTION NOTES:
{joined}
"""

    output = call_ollama_generate(
        prompt=prompt,
        model=SUMMARY_MODEL,
        format_json=False,
        timeout=OLLAMA_TIMEOUT_SECONDS,
        num_ctx=4096,
        # FIX: 1400 was too small for 5 sections.
        num_predict=2600,
        temperature=0.07,
        top_p=0.80,
        repeat_penalty=1.18,
    )

    output = final_summary_cleanup(output)

    # Safety: retry once if final merge stopped early.
    if not has_required_summary_sections(output):
        logger.warning(
            f"Combined summary missing sections. "
            f"Sections found: {count_summary_sections(output)}. Retrying once."
        )
        retry_prompt = f"""
You are a careful academic summarization assistant.

TASK:
Merge the notes into a COMPLETE 5-section study summary.
The previous answer was incomplete. You MUST include sections 1, 2, 3, 4, and 5.

STRICT RULES:
- Use ONLY the section notes.
- Do NOT use outside knowledge.
- Do NOT invent facts.
- Remove repeated ideas.
- Keep the answer in English.
- If examples or non-English terms look broken or reversed after PDF extraction, describe the concept in English instead.
- Stop after section 5.

FINAL OUTPUT FORMAT:
# Text Summary

## 1. Main Idea
Write exactly 2 clear sentences.

## 2. Main Topics
- Write exactly 5 unique bullets.

## 3. Key Facts and Concepts
- Write exactly 6 unique bullets.

## 4. Important Details
- Write exactly 6 unique bullets.

## 5. Exam Revision Points
- Write exactly 5 unique bullets.
- Do not write section 6.

SECTION NOTES:
{joined}
"""
        output = call_ollama_generate(
            prompt=retry_prompt,
            model=SUMMARY_MODEL,
            format_json=False,
            timeout=OLLAMA_TIMEOUT_SECONDS,
            num_ctx=4096,
            num_predict=2400,
            temperature=0.06,
            top_p=0.78,
            repeat_penalty=1.20,
        )
        output = final_summary_cleanup(output)

    return output


def summarize_uploaded_text(text: str) -> str:
    text = clean_source_text(text)

    if len(text) < 20:
        return "Please enter enough text to summarize."

    # Small input: one call only.
    if len(text) <= SUMMARY_CHUNK_CHARS_SMALL:
        return summarize_single_text(text)

    # Medium/large input: chunk then merge.
    if len(text) <= 13000:
        max_chars = SUMMARY_CHUNK_CHARS_MEDIUM
    else:
        max_chars = SUMMARY_CHUNK_CHARS_LARGE

    chunks = split_text_into_chunks(text, max_chars=max_chars)

    if not chunks:
        return "Please enter enough text to summarize."

    # If split produced only one chunk, avoid unnecessary combine call.
    if len(chunks) == 1:
        return summarize_single_text(chunks[0])

    partial_summaries: list[str] = []

    for index, chunk in enumerate(chunks, start=1):
        logger.info(f"Summarizing chunk {index}/{len(chunks)}")
        partial_summaries.append(summarize_chunk(chunk, index, len(chunks)))

    return combine_summaries(partial_summaries)


# =========================================================
# ROUTES - SUMMARY ONLY
# =========================================================

@app.get("/")
async def root():
    return {
        "service": "StudyFlow Local AI Backend",
        "mode": "summary_only",
        "summary_model": SUMMARY_MODEL,
        "ollama_base_url": OLLAMA_BASE_URL,
        "summary_text_endpoint": "/summarize",
        "summary_conversation_endpoint": "/conversation",
        "summary_file_endpoint": "/file/upload",
        "health_endpoint": "/health",
        "important_note": "This service generates summaries only. It uses generic cleanup only; no PDF-specific memorized replacements. Database saving must be done in Laravel/React.",
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "mode": "summary_only",
        "summary_model": SUMMARY_MODEL,
        "ollama_base_url": OLLAMA_BASE_URL,
        "summary_chunk_chars_small": SUMMARY_CHUNK_CHARS_SMALL,
        "summary_chunk_chars_medium": SUMMARY_CHUNK_CHARS_MEDIUM,
        "summary_chunk_chars_large": SUMMARY_CHUNK_CHARS_LARGE,
        "anti_repetition": True,
        "final_cleanup_enabled": True,
        "empty_section_cleanup_enabled": True,
        "section_6_removed": True,
        "required_sections": 5,
        "larger_study_summary": True,
        "summary_size": "larger_but_clean",
        "num_predict_single": 2400,
        "num_predict_combine": 2600,
        "retry_if_incomplete": True,
        "no_pdf_specific_hardcoding": True,
        "generic_cleanup_only": True,
        "ollama_timeout_seconds": OLLAMA_TIMEOUT_SECONDS,
        "ollama_timeout_minutes": round(OLLAMA_TIMEOUT_SECONDS / 60, 2),
    }


@app.post("/conversation", response_model=SummaryOutput)
async def conversation(input: Input):
    start_time = time.time()

    output_text = summarize_uploaded_text(input.human_input)
    processing_time = round(time.time() - start_time, 2)

    return SummaryOutput(
        output=output_text,
        summary=output_text,
        result=output_text,
        processing_time_seconds=processing_time,
        processing_time_minutes=round(processing_time / 60, 2),
    )


@app.post("/summarize", response_model=SummaryOutput)
async def summarize(input: SummaryInput):
    start_time = time.time()

    text = input.text or input.human_input or ""
    output_text = summarize_uploaded_text(text)
    processing_time = round(time.time() - start_time, 2)

    return SummaryOutput(
        output=output_text,
        summary=output_text,
        result=output_text,
        processing_time_seconds=processing_time,
        processing_time_minutes=round(processing_time / 60, 2),
    )


@app.post("/file/upload", response_model=dict)
async def upload_file_summary(uploaded_file: UploadFile = File(...)):
    start_time = time.time()

    try:
        file_bytes = await uploaded_file.read()

        if is_pdf_file(uploaded_file):
            text_content = extract_pdf_text(file_bytes)
            file_type = "pdf"
        elif is_txt_file(uploaded_file):
            text_content = clean_source_text(decode_txt_bytes(file_bytes))
            file_type = "txt"
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload a PDF or TXT file.",
            )

        if not text_content or len(text_content.strip()) < MIN_TEXT_LENGTH:
            raise HTTPException(status_code=422, detail="Not enough readable text found.")

        output = summarize_uploaded_text(text_content)
        processing_time = round(time.time() - start_time, 2)

        return {
            "message": "Processing successful",
            "mode": "summary_only",
            "model": SUMMARY_MODEL,
            "file_type": file_type,
            "processing_time_seconds": processing_time,
            "processing_time_minutes": round(processing_time / 60, 2),
            "result": output,
            "summary": output,
            "output": output,
        }

    except HTTPException:
        raise
    except Exception as e:
        processing_time = round(time.time() - start_time, 2)
        logger.exception(f"Summary file upload failed after {processing_time} seconds")
        raise HTTPException(status_code=500, detail=str(e))
