"""FastAPI backend application for local PDF/TXT/direct-text summarization using Ollama."""

from fastapi import FastAPI, File, UploadFile, HTTPException
import fitz
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain.callbacks.manager import CallbackManager
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain.llms import Ollama
from backend.PDFProcessor import PDFProcessor
import logging
import re
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Local Ollama model
OLLAMA_MODEL = "qwen3:1.7b"


class Input(BaseModel):
    human_input: str


class Output(BaseModel):
    output: str
    processing_time_seconds: float | None = None
    processing_time_minutes: float | None = None


app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Local LLM using Ollama
llm = Ollama(
    model=OLLAMA_MODEL,
    temperature=0.1,
    top_p=0.9,
    repeat_penalty=1.1,
    verbose=True,
    callback_manager=CallbackManager([StreamingStdOutCallbackHandler()])
)


def clean_model_output(text: str) -> str:
    """
    Remove hidden thinking blocks if qwen returns them.
    """
    if not text:
        return ""

    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE)
    return text.strip()


def is_pdf_file(uploaded_file: UploadFile) -> bool:
    """
    Detect PDF by content type or filename.
    """
    filename = (uploaded_file.filename or "").lower()
    content_type = (uploaded_file.content_type or "").lower()

    return content_type == "application/pdf" or filename.endswith(".pdf")


def is_txt_file(uploaded_file: UploadFile) -> bool:
    """
    Detect TXT by content type or filename.
    """
    filename = (uploaded_file.filename or "").lower()
    content_type = (uploaded_file.content_type or "").lower()

    return (
        content_type.startswith("text/plain")
        or filename.endswith(".txt")
        or filename.endswith(".text")
    )


def decode_txt_bytes(file_bytes: bytes) -> str:
    """
    Decode uploaded TXT bytes safely.
    """
    if not file_bytes:
        return ""

    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            return file_bytes.decode("utf-8-sig")
        except UnicodeDecodeError:
            return file_bytes.decode("latin-1", errors="ignore")


def get_text_chunk_size(text: str) -> tuple[str, int]:
    """
    Adaptive chunk size for TXT files and direct pasted text.

    Small:
    - max_chars = 3000

    Medium:
    - max_chars = 6000

    Large:
    - up to 15000 chars: one large chunk
    - above 15000 chars: 12000 chars per chunk
    """
    text_length = len(text)

    if text_length <= 2500:
        document_size = "small"
        max_chars = 3000
    elif text_length <= 7000:
        document_size = "medium"
        max_chars = 6000
    elif text_length <= 15000:
        document_size = "large"
        max_chars = 15000
    else:
        document_size = "large"
        max_chars = 12000

    logger.info(
        f"Detected {document_size} text | text length={text_length} | max_chars={max_chars}"
    )

    return document_size, max_chars


def split_text_content(text: str, max_chars: int = 3000) -> list[str]:
    """
    Split text content into chunks.
    """
    chunks = []
    current_chunk = ""

    blocks = text.split("\n\n")

    for block in blocks:
        block = block.strip()

        if not block:
            continue

        if len(current_chunk) + len(block) + 2 <= max_chars:
            current_chunk += block + "\n\n"
        else:
            if current_chunk.strip():
                chunks.append(current_chunk.strip())

            if len(block) > max_chars:
                for i in range(0, len(block), max_chars):
                    part = block[i:i + max_chars].strip()
                    if part:
                        chunks.append(part)
                current_chunk = ""
            else:
                current_chunk = block + "\n\n"

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    logger.info(f"Text split into {len(chunks)} chunk(s)")
    return chunks


def summarize_text_chunk(chunk: str, index: int, total: int, llm=llm) -> str:
    """
    Summarize one text chunk.
    """
    prompt = f"""
You are a careful academic summarization assistant.

TASK:
Summarize this text section for a student.

VERY IMPORTANT RULES:
- Use ONLY information found in the provided text section.
- Be strict: Do NOT use outside knowledge, even if it is true.
- Do NOT add exact years, dates, rankings, or claims unless they are explicitly written in the provided text.
- Do NOT invent facts, names, dates, examples, topics, definitions, or explanations.
- Do NOT force the text into a specific subject like CSS, programming, science, history, or biography.
- Detect the real topic only from the provided text.
- If something is not clearly present in the text, do not mention it.
- Preserve important technical terms exactly as written.
- Keep the answer in English.
- Make the answer useful for studying and exam revision.
- Be concise but complete.

OUTPUT FORMAT:
### Main Ideas
- ...

### Key Facts and Concepts
- ...

### Important Details
- ...

### Examples or Evidence Mentioned
- ...

### Exam Revision Notes
- ...

Text Section {index} of {total}:
{chunk}
"""

    result = llm.invoke(prompt)
    return clean_model_output(result)


def combine_text_summaries_once(summaries: list[str], llm=llm) -> str:
    """
    Combine text section summaries into one clean summary.
    """
    joined_summaries = "\n\n".join(summaries)

    prompt = f"""
You are a careful academic summarization assistant.

TASK:
Combine the following section summaries into one clean study summary.

VERY IMPORTANT RULES:
- Use ONLY information found in the section summaries.
- Do NOT use outside knowledge, even if it is true.
- Do NOT add exact years, dates, rankings, or claims unless they are explicitly written in the section summaries.
- Do NOT invent new facts, names, dates, examples, topics, or concepts.
- The final summary must match the actual text topic.
- Remove repetition.
- Keep the summary in English.
- Do not translate to another language.
- Do not include word cloud information.
- Make the summary clear, structured, and useful for exam revision.

FINAL OUTPUT FORMAT:
# Text Summary

## 1. Main Idea
Write 2-3 sentences explaining what the text is about.

## 2. Main Topics
- ...

## 3. Key Facts and Concepts
- ...

## 4. Important Details
- ...

## 5. Examples or Evidence
- ...

## 6. Exam Revision Points
- ...

## 7. Short Final Summary
Write one short paragraph summarizing the whole text.

SECTION SUMMARIES:
{joined_summaries}
"""

    result = llm.invoke(prompt)
    return clean_model_output(result)


def combine_text_summaries(summaries: list[str]) -> str:
    """
    Combine text summaries safely.
    """
    if not summaries:
        return "No summary could be generated."

    if len(summaries) == 1:
        return summaries[0]

    return combine_text_summaries_once(summaries)


def summarize_uploaded_text(text: str) -> str:
    """
    Summarize uploaded TXT content or direct pasted text.
    """
    text = (text or "").strip()

    if not text:
        return "Please enter text to summarize."

    document_size, max_chars = get_text_chunk_size(text)
    chunks = split_text_content(text, max_chars=max_chars)

    if not chunks:
        return "Please enter text to summarize."

    partial_summaries = []

    for index, chunk in enumerate(chunks, start=1):
        logger.info(
            f"Summarizing text chunk {index}/{len(chunks)} | document_size={document_size}"
        )
        summary = summarize_text_chunk(chunk, index, len(chunks))
        partial_summaries.append(summary)

    logger.info("Combining text partial summaries into final summary.")
    final_summary = combine_text_summaries(partial_summaries)

    return final_summary


@app.get("/")
async def root():
    return {
        "message": "OllamaSummarizer backend is running",
        "model": OLLAMA_MODEL,
        "docs": "/docs"
    }


@app.post("/conversation", response_model=Output)
async def input_text(input: Input):
    """
    Endpoint to summarize direct pasted text.
    Uses the same text summarization logic as TXT upload.
    """

    start_time = time.time()

    output_text = summarize_uploaded_text(input.human_input)

    processing_time = round(time.time() - start_time, 2)

    logger.info(f"Direct text processing completed in {processing_time} seconds")

    return Output(
        output=output_text,
        processing_time_seconds=processing_time,
        processing_time_minutes=round(processing_time / 60, 2)
    )


@app.post("/file/upload", response_model=dict)
async def upload_file(uploaded_file: UploadFile = File(...), llm=llm):
    """
    Endpoint to upload and summarize a PDF or TXT file.
    Returns summary result + processing time.
    """

    start_time = time.time()

    try:
        file_bytes = await uploaded_file.read()

        if is_pdf_file(uploaded_file):
            pdf_document = fitz.open("pdf", file_bytes)

            pdf_processor = PDFProcessor(pdf_document, llm)

            output = pdf_processor.process()

            pdf_document.close()

            file_type = "pdf"

        elif is_txt_file(uploaded_file):
            text_content = decode_txt_bytes(file_bytes)

            output = summarize_uploaded_text(text_content)

            file_type = "txt"

        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload a PDF or TXT file."
            )

        processing_time = round(time.time() - start_time, 2)

        logger.info(
            f"{file_type.upper()} processing completed in {processing_time} seconds"
        )

        return {
            "message": "Processing successful",
            "model": OLLAMA_MODEL,
            "file_type": file_type,
            "processing_time_seconds": processing_time,
            "processing_time_minutes": round(processing_time / 60, 2),
            "result": output
        }

    except HTTPException as http_exception:
        raise http_exception

    except Exception as e:
        processing_time = round(time.time() - start_time, 2)
        logger.error(
            f"Error during file upload and processing after {processing_time} seconds: {e}"
        )
        raise HTTPException(status_code=500, detail="Internal Server Error")