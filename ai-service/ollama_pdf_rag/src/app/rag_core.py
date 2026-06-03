"""
FastAPI core logic for PDF-based Retrieval-Augmented Generation (RAG) using Ollama + LangChain.

This module contains reusable PDF processing, retrieval, quiz, and question-answering logic without UI code.
"""

import logging
import os
import tempfile
import io
import shutil
import pdfplumber
import ollama
import warnings
import hashlib
import json
import re
from datetime import datetime
from pathlib import Path

# Suppress torch warning
warnings.filterwarnings('ignore', category=UserWarning, message='.*torch.classes.*')

from langchain_community.document_loaders import PyPDFLoader
from langchain_ollama import OllamaEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_ollama import ChatOllama
from langchain_core.runnables import RunnablePassthrough
from langchain_classic.retrievers.multi_query import MultiQueryRetriever
from typing import List, Tuple, Dict, Any, Optional

# Import Document explicitly for creating custom summary chunks
from langchain_core.documents import Document

# Set protobuf environment variable to avoid error messages
# This might cause some issues with latency but it's a tradeoff
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"
os.environ["ANONYMIZED_TELEMETRY"] = "False"

# Local runtime storage.
# IMPORTANT:
# This module is used as a local/dev PDF playground. To prevent "No space left on
# device", callers can clean old vector/temp data as needed.
DATA_DIR = Path("data")
PERSIST_DIRECTORY = str(DATA_DIR / "vectors")
TEMP_UPLOAD_DIR = DATA_DIR / "tmp_uploads"

# When True, old Chroma vectors from previous crashed/closed runs are removed
# once at service start. This stops data/vectors from growing
# forever while you test different PDFs.
RESET_VECTOR_STORE_ON_START = True

# When True, if you upload a new PDF and the previous PDF is no longer selected
# in the uploader, the old PDF collection is deleted automatically.
KEEP_ONLY_CURRENT_UPLOADS = True

DATA_DIR.mkdir(parents=True, exist_ok=True)
TEMP_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
os.makedirs(PERSIST_DIRECTORY, exist_ok=True)

# V4_NOTE_GENERAL_MCQ_RULES: Generic MCQ rules for any PDF: answer-first, 10 candidates, no placeholder/only/both options.
# V3_NOTE_10_CHUNKS: MCQ now uses 10 diverse evidence chunks + 8 answer-first candidates.
# MCQ retrieval controls.
# These are generic settings only; they do NOT hardcode any PDF/domain answers.
# Balanced settings for local CPU/8GB RAM:
# - Uses semantic relevance + keyword/category coverage + whole-PDF coverage.
# - Avoids the very slow multi-judge pipeline that can take 20-30 minutes.
MCQ_RETRIEVE_K = 10        # CPU-safe: retrieve enough candidates without overloading 8GB RAM
MCQ_CONTEXT_CHUNKS = 6     # CPU-safe: final diverse evidence chunks sent to the LLM
MCQ_MAX_CONTEXT_CHARS = 3200 # CPU-safe evidence budget to avoid Ollama KV-cache crashes
MCQ_CHUNK_CHAR_LIMIT = 520   # richer evidence chunks for answer validation
GENERAL_MAX_CONTEXT_CHARS = 5500

# Paper-inspired MCQ controls.
# We generate one extra internal candidate, validate deterministically, then display exactly 5 valid MCQs.
# This is safer than returning a known-bad Q5 just because the user asked for five questions.
MCQ_CANDIDATE_COUNT = 7
MCQ_FINAL_COUNT = 5
MCQ_CHUNK_SIMILARITY_LIMIT = 0.74
MCQ_MAX_CHUNKS_PER_PAGE = 2
MCQ_ANSWER_SIMILARITY_LIMIT = 0.45
MCQ_DISTRACTOR_TOO_CLOSE_LIMIT = 0.82
ADD_SUMMARY_TO_MCQ_CONTEXT = False  # summaries can repeat facts; MCQs should cite real evidence chunks

# Speed controls for local CPU / 8GB RAM.
# The old version summarized EVERY PDF chunk with Ollama during upload,
# which caused 15-20 minute delays before the quiz even started.
# This fast summary is extractive only: no LLM call during PDF upload.
ENABLE_LLM_PDF_SUMMARY = False
USE_EXTRACTIVE_FAST_SUMMARY = True
FAST_SUMMARY_CHUNKS = 8
FAST_SUMMARY_CHARS_PER_CHUNK = 300

# Guarded quality MCQ mode. This version is bounded:
# - no slow per-chunk LLM summary during upload
# - MCQ generation uses Ollama JSON Schema structured output first
# - no LLM judge / repair loop, because it was slow and kept returning the same bad flags
# - at most 2 full structured attempts, then return the best structured quiz
MCQ_QUALITY_NUM_CTX = 2048
MCQ_GENERATE_NUM_PREDICT = 1200
MCQ_REPAIR_NUM_PREDICT = 450
MCQ_JUDGE_NUM_PREDICT = 220
MCQ_MAX_REPAIR_QUESTIONS = 0
MCQ_USE_LLM_JUDGE = False
MCQ_ALLOW_FREE_TEXT_FALLBACK = True
# Do not run a second long JSON backup call if schema parsing fails.
# The previous slowdown was caused by schema response extraction failing, then backup JSON taking ~11 minutes.
MCQ_USE_JSON_BACKUP = False
MCQ_STRUCTURED_RETRIES = 1

# Final MCQ context composition. Total should be close to MCQ_CONTEXT_CHUNKS.
# This helps the quiz use the whole PDF while still staying relevant.
MCQ_SEMANTIC_TARGET = 2
MCQ_KEYWORD_TARGET = 2
MCQ_BALANCED_TARGET = 2

# Generic coverage keywords only; these are not answers and are not domain-specific.
# They help locate definition/application/challenge/method/example chunks in any PDF.
MCQ_GENERIC_KEYWORDS = [
    "definition", "defined", "concept", "term", "means",
    "application", "applications", "used", "use", "purpose",
    "challenge", "challenges", "limitation", "limitations", "problem", "problems",
    "method", "methods", "approach", "approaches", "technique", "techniques",
    "task", "tasks", "process", "steps", "example", "examples",
    "advantage", "advantages", "disadvantage", "disadvantages",
    "classification", "classify", "comparison", "compare",

]

# Subjective/Written quiz controls (V6 evidence-card tournament).
# These are separate from MCQ controls because written questions need deeper, more
# diverse evidence instead of option/distractor validation.
SUBJECTIVE_RETRIEVE_K = 12
SUBJECTIVE_CONTEXT_CHUNKS = 8
SUBJECTIVE_MAX_CONTEXT_CHARS = 4300
SUBJECTIVE_CHUNK_CHAR_LIMIT = 650
SUBJECTIVE_FINAL_COUNT = 5
SUBJECTIVE_MAX_CARDS_TO_TRY = 10
SUBJECTIVE_GENERATE_NUM_CTX = 2048
SUBJECTIVE_GENERATE_NUM_PREDICT = 560

# Subjective grounding controls (generic, no memorized domain words).
# These tighten claim-level evidence support without touching MCQ/upload/Chroma.
SUBJECTIVE_ANSWER_SENTENCE_MIN_SCORE = 0.38
SUBJECTIVE_KEY_POINT_MIN_SCORE = 0.34
SUBJECTIVE_WHOLE_ANSWER_MIN_OVERLAP = 0.19
SUBJECTIVE_DUPLICATE_CONTAINMENT_LIMIT = 0.56
SUBJECTIVE_DUPLICATE_JACCARD_LIMIT = 0.34


# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


def safe_rmtree(path: Any) -> None:
    """Remove a file/folder safely. Never crash the API during cleanup."""
    try:
        target = Path(path)
        if target.exists():
            if target.is_dir():
                shutil.rmtree(target, ignore_errors=True)
            else:
                target.unlink(missing_ok=True)
    except Exception as exc:
        logger.warning(f"Cleanup skipped for {path}: {exc}")


def ensure_runtime_dirs() -> None:
    """Recreate runtime folders after cleanup."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    TEMP_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    os.makedirs(PERSIST_DIRECTORY, exist_ok=True)


def cleanup_runtime_storage(reset_vectors: bool = False) -> None:
    """Clean local runtime storage that commonly causes Errno 28.

    reset_vectors=True removes data/vectors from previous app runs. Use this
    once at startup before any Chroma collection is opened.
    """
    safe_rmtree(TEMP_UPLOAD_DIR)
    TEMP_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    if reset_vectors:
        safe_rmtree(PERSIST_DIRECTORY)
        os.makedirs(PERSIST_DIRECTORY, exist_ok=True)

    # Old paths used by some versions of this project.
    safe_rmtree(".chroma")
    safe_rmtree("chroma_db")


def write_upload_to_temp_pdf(file_upload, pdf_id: str) -> Path:
    """Write the uploaded PDF to a controlled temp folder and return its path."""
    TEMP_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    safe_name = "".join(
        ch if ch.isalnum() or ch in ("-", "_", ".") else "_"
        for ch in str(file_upload.name)
    )
    if not safe_name.lower().endswith(".pdf"):
        safe_name += ".pdf"

    temp_path = (TEMP_UPLOAD_DIR / f"{pdf_id}_{safe_name}").resolve()

    file_bytes = file_upload.getvalue()
    with open(temp_path, "wb") as f:
        # Uploaded file wrappers can support getvalue(); the SampleFile class below
        # also supports getvalue(). This keeps both paths working.
        f.write(file_bytes)
        f.flush()
        os.fsync(f.fileno())

    if not temp_path.exists() or temp_path.stat().st_size == 0:
        raise FileNotFoundError(f"Temporary PDF was not written correctly: {temp_path}")

    logger.info(f"File saved to temporary path: {temp_path} ({temp_path.stat().st_size} bytes)")
    return temp_path


def extract_model_names(models_info: Any) -> Tuple[str, ...]:
    """
    Extract model names from the provided models information.

    Args:
        models_info: Response from ollama.list()

    Returns:
        Tuple[str, ...]: A tuple of model names.
    """
    logger.info("Extracting model names from models_info")
    try:
        # The new response format returns a list of Model objects
        if hasattr(models_info, "models"):
            # Extract model names from the Model objects
            model_names = tuple(model.model for model in models_info.models)
        else:
            # Fallback for any other format
            model_names = tuple()

        logger.info(f"Extracted model names: {model_names}")
        return model_names
    except Exception as e:
        logger.error(f"Error extracting model names: {e}")
        return tuple()


def create_vector_db(file_upload) -> Chroma:
    """
    Create a vector database from an uploaded PDF file.

    This helper is kept for compatibility. It now writes to the controlled
    data/tmp_uploads folder and always removes the temporary PDF afterward.
    """
    logger.info(f"Creating vector DB from file upload: {file_upload.name}")
    pdf_id = generate_pdf_id(file_upload)
    temp_path = write_upload_to_temp_pdf(file_upload, pdf_id)

    try:
        loader = PyPDFLoader(str(temp_path))
        data = loader.load()

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=700,
            chunk_overlap=100
        )
        chunks = text_splitter.split_documents(data)
        logger.info("Document split into chunks")

        embeddings = OllamaEmbeddings(
            model="nomic-embed-text:latest",
            base_url="http://127.0.0.1:11434"
        )
        vector_db = Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
            persist_directory=PERSIST_DIRECTORY,
            collection_name=f"pdf_{hashlib.md5(file_upload.getvalue()).hexdigest()[:12]}"
        )
        logger.info("Vector DB created with persistent storage")
        return vector_db

    finally:
        safe_rmtree(temp_path)
        logger.info(f"Temporary file removed: {temp_path}")


def generate_pdf_id(file_upload) -> str:
    """Generate stable ID for PDF so reruns do not re-process the same file."""
    file_bytes = file_upload.getvalue()
    digest = hashlib.md5(file_bytes).hexdigest()[:16]
    safe_name = "".join(ch if ch.isalnum() else "_" for ch in file_upload.name.lower())[:40]
    return f"pdf_{safe_name}_{digest}"






def get_doc_unique_key(doc) -> str:
    """Create a stable key for a retrieved chunk without using domain-specific text."""
    meta = getattr(doc, "metadata", {}) or {}
    pdf_id = meta.get("pdf_id", "")
    source_file = meta.get("source_file", meta.get("pdf_name", ""))
    page = meta.get("page", "")
    chunk_index = meta.get("chunk_index", "")

    if pdf_id or source_file or page != "" or chunk_index != "":
        return f"{pdf_id}|{source_file}|{page}|{chunk_index}"

    # Fallback only when metadata is missing.
    content = getattr(doc, "page_content", "") or ""
    return hashlib.md5(content[:500].encode("utf-8", errors="ignore")).hexdigest()


def select_balanced_pdf_chunks(chunks: List[Any], limit: int = MCQ_CONTEXT_CHUNKS) -> List[Any]:
    """Pick chunks spread across the whole PDF so quiz generation is not based on one small area."""
    valid = [c for c in chunks if getattr(c, "page_content", "").strip()]

    if len(valid) <= limit:
        return valid

    # Evenly sample from start, middle, and end of the PDF.
    indexes = []
    for i in range(limit):
        idx = round(i * (len(valid) - 1) / max(limit - 1, 1))
        indexes.append(idx)

    selected = []
    seen_indexes = set()
    for idx in indexes:
        if idx not in seen_indexes:
            selected.append(valid[idx])
            seen_indexes.add(idx)

    return selected[:limit]


def select_keyword_pdf_chunks(chunks: List[Any], limit: int = MCQ_CONTEXT_CHUNKS) -> List[Any]:
    """Select chunks containing generic educational signals.

    This is not memorization: the keywords are generic labels such as
    definition/application/challenge/method/example and work for any PDF.
    """
    scored = []

    for chunk in chunks:
        content = getattr(chunk, "page_content", "") or ""
        clean = " ".join(content.lower().split())
        if not clean:
            continue

        score = 0
        for keyword in MCQ_GENERIC_KEYWORDS:
            # Use word boundaries for simple English tokens.
            if re.search(rf"\b{re.escape(keyword)}\b", clean):
                score += 1

        if score > 0:
            meta = getattr(chunk, "metadata", {}) or {}
            page = meta.get("page", 10**9)
            chunk_index = meta.get("chunk_index", 10**9)
            scored.append((score, page, chunk_index, chunk))

    # Prefer richer chunks, then spread by page/chunk order.
    scored.sort(key=lambda item: (-item[0], item[1], item[2]))

    selected = []
    seen_pages = set()
    seen_keys = set()

    # First pass: prefer different pages for coverage.
    for _score, _page, _chunk_index, chunk in scored:
        key = get_doc_unique_key(chunk)
        page = (getattr(chunk, "metadata", {}) or {}).get("page", None)
        if key in seen_keys:
            continue
        if page in seen_pages and len(seen_pages) < limit:
            continue
        selected.append(chunk)
        seen_keys.add(key)
        seen_pages.add(page)
        if len(selected) >= limit:
            return selected

    # Second pass: fill remaining slots if many useful chunks are on same page.
    for _score, _page, _chunk_index, chunk in scored:
        key = get_doc_unique_key(chunk)
        if key in seen_keys:
            continue
        selected.append(chunk)
        seen_keys.add(key)
        if len(selected) >= limit:
            break

    return selected


def take_unique_docs(source_docs: List[Any], selected: List[Any], seen: set, target: int) -> None:
    """Append up to target unique docs to selected."""
    added = 0
    for doc in source_docs:
        if added >= target:
            break
        if not getattr(doc, "page_content", "").strip():
            continue
        key = get_doc_unique_key(doc)
        if key in seen:
            continue
        seen.add(key)
        selected.append(doc)
        added += 1


def select_mixed_context_docs(
    semantic_docs: List[Any],
    keyword_docs: List[Any],
    balanced_docs: List[Any],
    limit: int = MCQ_CONTEXT_CHUNKS
) -> List[Any]:
    """Build final MCQ context from relevance + category coverage + whole-PDF coverage.

    The order is intentional:
    - semantic docs keep the quiz relevant to the request,
    - keyword docs favor definitions/applications/challenges/methods/examples,
    - balanced docs force coverage from across the PDF.
    """
    selected = []
    seen = set()

    take_unique_docs(semantic_docs, selected, seen, MCQ_SEMANTIC_TARGET)
    take_unique_docs(keyword_docs, selected, seen, MCQ_KEYWORD_TARGET)
    take_unique_docs(balanced_docs, selected, seen, MCQ_BALANCED_TARGET)

    if len(selected) < limit:
        # Fill remaining slots from all candidates without duplicates.
        for docs in (semantic_docs, keyword_docs, balanced_docs):
            for doc in docs:
                if len(selected) >= limit:
                    break
                if not getattr(doc, "page_content", "").strip():
                    continue
                key = get_doc_unique_key(doc)
                if key in seen:
                    continue
                seen.add(key)
                selected.append(doc)

    return selected[:limit]


def summarize_doc_pages(docs: List[Any]) -> str:
    """Small log helper to confirm the context spans multiple PDF pages."""
    pages = []
    for doc in docs:
        page = (getattr(doc, "metadata", {}) or {}).get("page", None)
        if isinstance(page, int):
            pages.append(page + 1)
    unique_pages = sorted(set(pages))
    return str(unique_pages[:20])


def merge_unique_docs(*doc_lists: List[Any], limit: int = 30) -> List[Any]:
    """Merge document lists while keeping original order and avoiding duplicate chunks."""
    merged = []
    seen = set()

    for docs in doc_lists:
        for doc in docs:
            if not getattr(doc, "page_content", "").strip():
                continue

            key = get_doc_unique_key(doc)
            if key in seen:
                continue

            seen.add(key)
            merged.append(doc)

            if len(merged) >= limit:
                return merged

    return merged


def trim_evidence_text(text: str, max_chars: int = MCQ_CHUNK_CHAR_LIMIT) -> str:
    """Keep evidence chunks compact so local models run faster.

    This is generic trimming only; it does not hardcode any domain terms or answers.
    """
    clean = " ".join((text or "").split())
    if len(clean) <= max_chars:
        return clean
    return clean[:max_chars].rsplit(" ", 1)[0].strip() + " ..."


# -----------------------------------------------------------------------------
# Summarization helpers
#
# To improve whole-document coverage, we provide optional summarization of
# extracted PDF chunks. Summarization condenses each chunk into concise
# bullet points and combines them into a global summary. This approach is
# inspired by the map‑reduce summarization pattern, where a large document is
# split into chunks, each is summarized independently, and the summaries are
# combined in a reduction step【507135316094589†L96-L114】.

# Use a dedicated model for summarization. We default to a compact model
# available via Ollama. This can be adjusted if you have other models.
SUMMARY_MODEL = "llama3.2:3b"


def summarize_text_with_ollama(text: str, model: str = SUMMARY_MODEL) -> str:
    """Summarize an arbitrary text into concise bullet points using a local LLM.

    This helper uses ChatOllama to generate a short summary capturing
    definitions, concepts, methods, challenges, and conclusions. It runs with
    conservative settings to keep latency reasonable on local machines.

    Args:
        text: The input text to summarize.
        model: The Ollama model name to use for summarization.

    Returns:
        A concise summary string.
    """
    if not text or not text.strip():
        return ""
    try:
        llm = ChatOllama(
            model=model,
            temperature=0.0,
            num_ctx=2048,
            num_predict=400,
        )
        prompt = (
            "Summarize the following text into concise bullet points capturing "
            "all key definitions, concepts, methods, challenges, applications, "
            "and conclusions. Use as few words as possible while preserving "
            "essential information.\n\n"
            f"{text}\n\n"
            "Summary:"
        )
        result = llm.invoke(prompt)
        summary = getattr(result, "content", str(result))
        return summary.strip()
    except Exception as exc:
        logger.warning(f"Summarization failed: {exc}")
        return ""



def generate_pdf_summary(chunks: List[Any], model: str = SUMMARY_MODEL, max_chars: int = 2000) -> Optional[str]:
    """Create a fast extractive summary without calling Ollama.

    This function is intentionally NOT an LLM summary. It samples chunks from
    the beginning, middle, and end of the PDF and trims them into a compact
    overview. That removes the slow per-chunk Ollama calls while preserving
    broad PDF coverage for the MCQ generator.
    """
    valid = [c for c in chunks if getattr(c, "page_content", "").strip()]
    if not valid:
        return None

    selected = select_balanced_pdf_chunks(valid, limit=FAST_SUMMARY_CHUNKS)

    parts = []
    for i, chunk in enumerate(selected, start=1):
        text = " ".join((getattr(chunk, "page_content", "") or "").split())
        if not text:
            continue

        meta = getattr(chunk, "metadata", {}) or {}
        page = meta.get("page", None)
        page_label = f"page {page + 1}" if isinstance(page, int) else f"part {i}"

        trimmed = trim_evidence_text(text, max_chars=FAST_SUMMARY_CHARS_PER_CHUNK)
        parts.append(f"- [{page_label}] {trimmed}")

    summary = "\n".join(parts).strip()
    if not summary:
        return None

    if len(summary) > max_chars:
        summary = summary[:max_chars].rsplit(" ", 1)[0].strip() + " ..."

    return summary


def generate_pdf_summary_with_ollama(chunks: List[Any], model: str = SUMMARY_MODEL, max_chars: int = 2000) -> Optional[str]:
    """Generate a condensed summary for the entire PDF from its text chunks.

    Each chunk is summarized individually using the local LLM. The resulting
    summaries are concatenated and optionally trimmed to a maximum character
    count. This function follows the map‑reduce summarization pattern
    described in the literature【507135316094589†L96-L114】, which is well-suited
    for long documents where a single pass would exceed the model's context.

    Args:
        chunks: A list of document chunks (LangChain Document objects) with
            page_content attributes.
        model: The name of the Ollama model used for summarization.
        max_chars: The maximum length of the final summary (in characters).

    Returns:
        A single string containing the combined summary, or None if
        summarization fails.
    """
    summaries = []
    for chunk in chunks:
        text = getattr(chunk, "page_content", "") or ""
        text = text.strip()
        if not text:
            continue
        # Skip very short chunks (less than 100 chars) since they don't need summarization.
        if len(text) < 100:
            summaries.append(text)
            continue
        summary = summarize_text_with_ollama(text, model=model)
        if summary:
            summaries.append(summary)

    if not summaries:
        return None

    combined = "\n".join(summaries)
    # If the combined summary is too long, trim it to max_chars.
    if len(combined) > max_chars:
        combined = combined[:max_chars].rsplit(" ", 1)[0].strip() + " ..."
    return combined.strip() if combined else None



FORBIDDEN_OPTION_PATTERNS = [
    r"all\s+of\s+the\s+above",
    r"none\s+of\s+the\s+above",
    r"both\s+[a-d]\s+and\s+[a-d]",
    r"\bneither\b",
]

# V4: bad option shapes are checked on option text only, not the full question/explanation.
# These are generic, not domain-specific. They prevent weak MCQs such as:
# "only government", "both X and Y", and placeholder distractors.
BAD_OPTION_PATTERNS = [
    r"\bonly\b",
    r"\bboth\b",
    r"\ball\s+of\s+the\s+above\b",
    r"\bnone\s+of\s+the\s+above\b",
    r"\bneither\b",
    r"\ball\s+(options|answers|choices|statements)\b",
    r"\bnot\s+(mentioned|provided|stated|specified)\b",
    r"a\s+different\s+statement\s+not\s+supported",
    r"not\s+supported\s+by\s+the\s+selected\s+evidence",
    r"placeholder",
]

# Tournament-9 stem filter: reject memorization-style stems before they reach the UI.
# This stays generic: it blocks weak wording, not domain-specific facts.
BAD_QUESTION_STEM_PATTERNS = [
    r"\bprimary\s+(goal|purpose|aim|objective|reason|role|function)\b",
    r"\bmain\s+(goal|purpose|aim|objective|reason|role|function|idea)\b",
    r"\bwhat\s+is\s+one\s+(common\s+)?(application|use|type|example)\b",
    r"\bwhich\s+of\s+the\s+following\s+is\s+(not\s+)?(a|an)?\s*(example|type|application|definition)\b",
    r"\bwhat\s+is\s+the\s+definition\s+of\b",
    r"\bdefine\b",
]

FORBIDDEN_UNGROUNDED_LANGUAGE = [
    "according to general knowledge",
    "although the context does not explicitly state",
    "although not explicitly stated",
    "not explicitly stated",
    "can be inferred",
    "can be considered",
    "could be inferred",
    "in practice",
    "generally speaking",
    "generally",
    "potential benefit",
    "potential application",
    "without context",

    # Additional phrases that often signal ungrounded reasoning or mismatched answer/explanation.
    "this suggests",
    "suggests that",
    "this implies",
    "implies that",
    "indicates that",
]


def clean_quiz_output(text: str) -> str:
    """Remove intro/outro around quiz and keep Q1-Q5 blocks only."""
    if not text:
        return ""

    text = text.strip()
    match = re.search(r"(?is)Q1\s*\((?:Hard|Medium|Easy)\).*", text)
    if match:
        text = match.group(0).strip()

    # Cut common assistant endings after Q5 explanation, but only if they appear after Q5.
    endings = [
        "please review",
        "let me know",
        "i hope",
        "these questions",
    ]
    lower = text.lower()
    q5_pos = lower.find("q5")
    if q5_pos >= 0:
        for phrase in endings:
            pos = lower.find(phrase, q5_pos)
            if pos > 0:
                text = text[:pos].strip()
                lower = text.lower()

    return text.strip()


def split_mcq_blocks(quiz_text: str) -> List[str]:
    """Split final quiz into Q blocks without changing content."""
    text = clean_quiz_output(quiz_text)
    matches = list(re.finditer(r"(?m)^Q\d+\s*\((?:Hard|Medium|Easy)\)\s*:?", text))
    if not matches:
        matches = list(re.finditer(r"(?m)^Q\d+\b", text))
    if not matches:
        return [text] if text else []

    blocks = []
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block = text[start:end].strip()
        if block:
            blocks.append(block)
    return blocks


def has_forbidden_option_or_ungrounded_language(text: str) -> bool:
    """Generic guardrail: no domain answers, only unsupported wording / bad option forms."""
    lower = text.lower()
    if any(re.search(pattern, lower) for pattern in FORBIDDEN_OPTION_PATTERNS):
        return True
    return any(phrase in lower for phrase in FORBIDDEN_UNGROUNDED_LANGUAGE)


def is_bad_mcq_option_text(option_text: str) -> bool:
    """Reject weak/placeholder option wording.

    This is intentionally generic so it works for any PDF:
    - no "only ..." distractors
    - no "both/all/none/neither" grouped choices
    - no placeholder options shown to the user
    """
    text = str(option_text or "").strip().lower()
    if not text:
        return True
    return any(re.search(pattern, text, flags=re.I) for pattern in BAD_OPTION_PATTERNS)


def has_bad_mcq_option(options: Dict[str, Any]) -> bool:
    """Return True if any MCQ option has weak or forbidden wording."""
    if not isinstance(options, dict):
        return True
    for letter in ["A", "B", "C", "D"]:
        if is_bad_mcq_option_text(options.get(letter, "")):
            return True
    return False


def is_bad_mcq_question_stem(question_text: str) -> bool:
    """Reject weak memorization stems that usually produce ambiguous MCQs."""
    text = str(question_text or "").strip().lower()
    if not text:
        return True
    return any(re.search(pattern, text, flags=re.I) for pattern in BAD_QUESTION_STEM_PATTERNS)


def other_option_supported_by_same_evidence(q: Dict[str, Any], evidence_texts: Dict[str, str]) -> bool:
    """Reject MCQs where another option is also explicitly present in the same evidence.

    This catches questions like NER examples where persons, companies, locations,
    dates, and organizations may all appear in the evidence, making several
    choices reasonably correct.
    """
    evidence_id = str(q.get("evidence_id", "")).strip().upper()
    evidence = normalize_for_duplicate_check(evidence_texts.get(evidence_id, ""))
    correct = str(q.get("correct_answer", "")).strip().upper()
    options = q.get("options", {}) or {}

    if not evidence or correct not in {"A", "B", "C", "D"}:
        return False

    for letter in ["A", "B", "C", "D"]:
        if letter == correct:
            continue
        option_text = str(options.get(letter, "")).strip()
        norm_option = normalize_for_duplicate_check(option_text)
        option_tokens = content_tokens_for_similarity(option_text)

        # Exact phrase support is enough to make the MCQ ambiguous.
        if norm_option and len(norm_option) >= 6 and norm_option in evidence:
            return True

        # If most meaningful option tokens occur in evidence, it is probably also true.
        if len(option_tokens) >= 2:
            supported = sum(1 for token in option_tokens if re.search(rf"\b{re.escape(token)}\b", evidence))
            if supported / max(len(option_tokens), 1) >= 0.80:
                return True

    return False


def get_correct_option_text(block: str) -> str:
    answer_match = re.search(r"Correct answer:\s*([A-D])", block, flags=re.I)
    if not answer_match:
        return ""
    letter = answer_match.group(1).upper()
    option_match = re.search(rf"(?m)^{letter}\.\s*(.+)$", block, flags=re.I)
    return option_match.group(1).strip() if option_match else ""


def rule_based_bad_question_numbers(blocks: List[str]) -> set:
    """Cheap deterministic checks. No PDF/domain-specific facts are hardcoded."""
    bad = set()

    for idx, block in enumerate(blocks, start=1):
        lower = block.lower()

        # Required structure.
        if not re.search(r"Correct answer:\s*[A-D]", block, flags=re.I):
            bad.add(idx)
            continue
        for letter in ["A", "B", "C", "D"]:
            if not re.search(rf"(?m)^{letter}\.\s+", block):
                bad.add(idx)
                break
        if idx in bad:
            continue

        # Forbidden option shapes and explicit ungrounded wording.
        if has_forbidden_option_or_ungrounded_language(block):
            bad.add(idx)
            continue

        # Very short or missing explanations are often unsupported.
        exp = re.search(r"Explanation:\s*(.+)", block, flags=re.I | re.S)
        if not exp or len(exp.group(1).strip()) < 35:
            bad.add(idx)
            continue

        # In the evidence-first pipeline, explanations should cite an evidence ID or a page/source.
        # This catches unsupported answers without using any domain-specific facts.
        explanation_text = exp.group(1)
        has_evidence_marker = bool(re.search(r"\[E\d+\]", explanation_text, flags=re.I))
        has_page_or_source = bool(re.search(r"\b(page|source)\b", explanation_text, flags=re.I))
        if not (has_evidence_marker or has_page_or_source):
            bad.add(idx)
            continue

        # Reject list/count questions such as "five levels", "four steps", etc.
        # These questions are prone to mismatched answers when only part of a list is retrieved.
        if re.search(r"\b(five|5|four|4|three|3)\s+(levels|steps|types|stages|components|parts)\b", lower):
            bad.add(idx)
            continue

        # Check that the explanation actually relates to the selected correct option.
        # Extract correct option text and ensure some keywords overlap between the option and explanation.
        opt_text = get_correct_option_text(block)
        if opt_text:
            opt_tokens = set(re.findall(r"\w+", opt_text.lower()))
            expl_tokens = set(re.findall(r"\w+", explanation_text.lower()))
            # If there is no overlap of keywords between the correct option and the explanation, mark as bad.
            if opt_tokens and not opt_tokens.intersection(expl_tokens):
                bad.add(idx)
                continue

    return bad


def judge_bad_mcq_questions(quiz_text: str, context: str, selected_model: str) -> set:
    """LLM judge only marks bad question numbers; it does not rewrite the quiz."""
    judge_llm = ChatOllama(
        model=selected_model,
        temperature=0,
        num_ctx=MCQ_QUALITY_NUM_CTX,
        num_predict=MCQ_JUDGE_NUM_PREDICT,
    )

    judge_template = """You are a strict MCQ validator.

Use ONLY the evidence chunks below. Each evidence chunk has an ID like [E1].
{context}

Quiz:
{quiz}

Mark a question as bad ONLY if one of these is true:
- the correct answer is not supported by the evidence chunks
- the explanation is not supported by the evidence chunks
- the explanation supports a different option than the selected answer
- more than one option can reasonably be correct
- it uses All/None/Both of the above
- it relies on general knowledge instead of the evidence chunks
- it repeats nearly the same idea as another question

Return ONLY valid JSON, no markdown:
{{"bad_question_numbers":[1,3],"reason":"short generic reason"}}

If all are valid:
{{"bad_question_numbers":[],"reason":"all valid"}}"""

    prompt = ChatPromptTemplate.from_template(judge_template)
    chain = (
        {"context": lambda x: context, "quiz": lambda x: quiz_text}
        | prompt
        | judge_llm
        | StrOutputParser()
    )

    try:
        result = chain.invoke(quiz_text).strip()
        match = re.search(r"\{.*\}", result, flags=re.S)
        if not match:
            logger.warning(f"MCQ judge returned non-JSON: {result[:200]}")
            return set()
        data = json.loads(match.group(0))
        nums = data.get("bad_question_numbers", [])
        return {int(n) for n in nums if str(n).isdigit() and 1 <= int(n) <= 5}
    except Exception as e:
        logger.warning(f"MCQ judge failed: {e}")
        return set()


def fix_one_mcq_question(question_block: str, context: str, selected_model: str) -> str:
    """Fix exactly one bad question using evidence only."""
    fixer_llm = ChatOllama(
        model=selected_model,
        temperature=0,
        num_ctx=2048,
        num_predict=420,
    )

    fix_template = """You are fixing ONE invalid MCQ.

Use ONLY these evidence chunks. Each chunk has an ID like [E1].
{context}

Invalid MCQ:
{question_block}

Fix ONLY this MCQ.
Rules:
- Keep the same question number and difficulty label.
- Use exactly A, B, C, D.
- Do not use All/None/Both of the above.
- Use one clear evidence chunk as the basis.
- Make exactly one correct answer.
- Make the correct option directly supported by the evidence.
- Make the explanation directly support the selected option only.
- Do not use general knowledge.
- Do not mention that something is inferred or not explicitly stated.
- Output only the corrected MCQ block.

Corrected MCQ:"""

    prompt = ChatPromptTemplate.from_template(fix_template)
    chain = (
        {"context": lambda x: context, "question_block": lambda x: question_block}
        | prompt
        | fixer_llm
        | StrOutputParser()
    )

    try:
        fixed = clean_quiz_output(chain.invoke(question_block).strip())
        blocks = split_mcq_blocks(fixed)
        return blocks[0] if blocks else question_block
    except Exception as e:
        logger.warning(f"Single MCQ fix failed: {e}")
        return question_block


def validate_and_repair_mcq_quiz(raw_quiz: str, context: str, selected_model: str, max_rounds: int = 1) -> str:
    """Evidence-first validation pipeline.

    It keeps valid questions unchanged and repairs only invalid ones.
    This avoids the quality drop caused by rewriting the whole quiz.
    """
    quiz = clean_quiz_output(raw_quiz)

    for round_idx in range(1, max_rounds + 1):
        blocks = split_mcq_blocks(quiz)
        if len(blocks) < 5:
            logger.info("MCQ validation: fewer than 5 blocks, attempting full cleanup via single-question repair is skipped")
            return quiz

        # Fast path: rule-based validation only.
        # We intentionally do NOT call the LLM judge here because it made local CPU runs too slow.
        bad = rule_based_bad_question_numbers(blocks)

        if not bad:
            logger.info(f"MCQ validation round {round_idx}: all questions passed")
            return "\n\n".join(blocks[:5])

        logger.info(f"MCQ validation round {round_idx}: fixing bad questions {sorted(bad)}")
        fixed_blocks = blocks[:5]

        # Fix at most two bad questions. This balances quality and speed on local CPU.
        for qnum in sorted(bad)[:2]:
            idx = qnum - 1
            if 0 <= idx < len(fixed_blocks):
                fixed_blocks[idx] = fix_one_mcq_question(fixed_blocks[idx], context, selected_model)

        quiz = "\n\n".join(fixed_blocks)

    return clean_quiz_output(quiz)



def extract_json_object_from_text(text: str) -> Optional[Dict[str, Any]]:
    """Extract the first valid JSON object from model output.

    The model is instructed to return JSON only, but local small models may wrap it
    in markdown. This parser is defensive and generic.
    """
    if not text:
        return None

    raw = text.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.I).strip()
    raw = re.sub(r"\s*```$", "", raw).strip()

    # Fast path
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except Exception:
        pass

    # Brace-matching fallback, safer than a greedy regex.
    start = raw.find("{")
    if start < 0:
        return None

    depth = 0
    in_string = False
    escape = False

    for idx in range(start, len(raw)):
        ch = raw[idx]

        if escape:
            escape = False
            continue

        if ch == "\\":
            escape = True
            continue

        if ch == '"':
            in_string = not in_string
            continue

        if in_string:
            continue

        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                candidate = raw[start:idx + 1]
                try:
                    data = json.loads(candidate)
                    return data if isinstance(data, dict) else None
                except Exception:
                    return None

    return None


def normalize_for_duplicate_check(text: str) -> str:
    """Small normalization helper for duplicate question/option detection."""
    text = (text or "").lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text



MCQ_DUP_STOPWORDS = {
    "what", "which", "how", "why", "when", "where", "is", "are", "was", "were",
    "the", "a", "an", "of", "in", "on", "to", "for", "and", "or", "as", "by",
    "does", "do", "did", "main", "primary", "focus", "aim", "purpose", "technology"
}


def content_tokens_for_similarity(text: str) -> set:
    """Token set for generic duplicate-question detection."""
    tokens = set(re.findall(r"[a-z0-9]+", (text or "").lower()))
    return {t for t in tokens if len(t) > 2 and t not in MCQ_DUP_STOPWORDS}


def questions_too_similar(a: str, b: str) -> bool:
    """Detect near-duplicate question ideas without domain-specific rules."""
    ta = content_tokens_for_similarity(a)
    tb = content_tokens_for_similarity(b)
    if not ta or not tb:
        return False
    overlap = len(ta & tb)
    smaller = min(len(ta), len(tb))
    jaccard = overlap / max(len(ta | tb), 1)
    containment = overlap / max(smaller, 1)
    # Slightly lenient: Arabic/NLP lecture PDFs often reuse terms in distinct questions.
    return jaccard >= 0.58 or (containment >= 0.82 and overlap >= 4)


def text_similarity(a: str, b: str) -> float:
    """Lightweight similarity for answer-option alignment and duplicate checks."""
    from difflib import SequenceMatcher
    return SequenceMatcher(None, normalize_for_duplicate_check(a), normalize_for_duplicate_check(b)).ratio()


def extract_evidence_texts_from_context(context: str) -> Dict[str, str]:
    """Parse formatted evidence chunks into {E1: text, E2: text, ...}."""
    evidence = {}
    if not context:
        return evidence

    pattern = re.compile(r"\[(E\d+)\]\s*\[[^\]]*\]\s*(.*?)(?=\n---\n\[(?:E\d+)\]|\Z)", re.S | re.I)
    for match in pattern.finditer(context):
        evidence_id = match.group(1).upper()
        evidence_text = " ".join(match.group(2).split())
        evidence[evidence_id] = evidence_text
    return evidence


def assign_correct_letter_from_answer_text(q: Dict[str, Any]) -> Dict[str, Any]:
    """Paper-inspired answer-first safety step.

    The model writes answer_text first. The backend, not the model, assigns the final letter.
    This prevents cases where the explanation supports B but the model says C.
    """
    options = q.get("options", {}) or {}
    answer_text = str(q.get("answer_text") or q.get("correct_answer_text") or "").strip()

    # If the model forgot answer_text, use the stated option only as a fallback.
    stated = str(q.get("correct_answer", "")).strip().upper()
    if not answer_text and stated in options:
        answer_text = str(options.get(stated, "")).strip()
        q["answer_text"] = answer_text

    if not answer_text:
        q["validation_error"] = "missing answer_text"
        return q

    best_letter = ""
    best_score = 0.0
    norm_answer = normalize_for_duplicate_check(answer_text)

    for letter in ["A", "B", "C", "D"]:
        option_text = str(options.get(letter, "")).strip()
        norm_option = normalize_for_duplicate_check(option_text)
        score = text_similarity(answer_text, option_text)

        if norm_answer and norm_answer in norm_option:
            score += 0.35
        if norm_option and norm_option in norm_answer:
            score += 0.20

        if score > best_score:
            best_score = score
            best_letter = letter

    if best_letter and best_score >= MCQ_ANSWER_SIMILARITY_LIMIT:
        q["correct_answer"] = best_letter
        q["correct_answer_text"] = str(options.get(best_letter, "")).strip()
        q["answer_alignment_score"] = round(best_score, 3)
    else:
        q["validation_error"] = "answer_text does not match any option"

    return q


def evidence_supports_answer_text(q: Dict[str, Any], evidence_texts: Dict[str, str]) -> bool:
    """Check that answer_text is grounded in the selected evidence chunk.

    This is a lightweight local alternative to expensive RAG faithfulness judges.
    """
    evidence_id = str(q.get("evidence_id", "")).strip().upper()
    evidence = evidence_texts.get(evidence_id, "")
    answer_text = str(q.get("answer_text", "")).strip()
    explanation = str(q.get("explanation", "")).strip()

    if not evidence_id or not evidence or not answer_text:
        return False

    norm_answer = normalize_for_duplicate_check(answer_text)
    norm_evidence = normalize_for_duplicate_check(evidence)
    norm_explanation = normalize_for_duplicate_check(explanation)

    if norm_answer and norm_answer in norm_evidence:
        return True

    # Let paraphrases pass, but require the explanation to also point toward the same answer.
    evidence_score = text_similarity(answer_text, evidence)
    explanation_score = text_similarity(answer_text, explanation)
    token_overlap = len(content_tokens_for_similarity(answer_text) & content_tokens_for_similarity(evidence))

    # Be practical: local small models paraphrase answers. Require some grounding, not exact copy.
    return (token_overlap >= 1 and explanation_score >= 0.12) or (evidence_score >= 0.16 and explanation_score >= 0.12)


def explanation_supports_selected_option(q: Dict[str, Any]) -> bool:
    """Reject cases where the explanation is closer to another option than the selected answer."""
    options = q.get("options", {}) or {}
    correct = str(q.get("correct_answer", "")).strip().upper()
    explanation = str(q.get("explanation", "")).strip()

    if correct not in options or not explanation:
        return False

    correct_text = str(options.get(correct, ""))
    correct_score = text_similarity(explanation, correct_text)

    other_scores = []
    for letter, option_text in options.items():
        if letter == correct:
            continue
        other_scores.append(text_similarity(explanation, str(option_text)))

    best_other = max(other_scores) if other_scores else 0.0

    # Pass if the explanation is closer to the selected option, or reasonably close.
    # Keep this lenient because short options can make SequenceMatcher noisy.
    return (correct_score + 0.05) >= best_other or correct_score >= 0.22


def validate_distractors_for_question(q: Dict[str, Any]) -> bool:
    """Distractors should be plausible, but not near-duplicates of the correct answer."""
    options = q.get("options", {}) or {}
    correct = str(q.get("correct_answer", "")).strip().upper()
    answer_text = str(q.get("answer_text", "")).strip()

    if correct not in options:
        return False

    correct_text = str(options.get(correct, "")).strip()
    norm_answer = normalize_for_duplicate_check(answer_text)

    for letter in ["A", "B", "C", "D"]:
        option_text = str(options.get(letter, "")).strip()

        # V4: never allow weak grouped/placeholder option wording to reach the UI.
        if is_bad_mcq_option_text(option_text):
            return False

        if len(normalize_for_duplicate_check(option_text).split()) < 2:
            return False

        if letter == correct:
            continue

        if text_similarity(option_text, correct_text) >= MCQ_DISTRACTOR_TOO_CLOSE_LIMIT:
            return False

        if norm_answer and norm_answer in normalize_for_duplicate_check(option_text):
            return False

    return True


def answer_ideas_too_similar(q1: Dict[str, Any], q2: Dict[str, Any]) -> bool:
    """Detect repeated MCQs by answer concept, not just question wording."""
    a1 = str(q1.get("answer_text") or q1.get("correct_answer_text") or "")
    a2 = str(q2.get("answer_text") or q2.get("correct_answer_text") or "")
    if not a1 or not a2:
        return False

    if text_similarity(a1, a2) >= 0.84:
        return True

    t1 = content_tokens_for_similarity(a1)
    t2 = content_tokens_for_similarity(a2)
    if not t1 or not t2:
        return False
    overlap = len(t1 & t2)
    return overlap >= 4 and overlap / max(min(len(t1), len(t2)), 1) >= 0.86


def select_valid_mcq_questions(data: Dict[str, Any], bad_numbers: set, needed: int = MCQ_FINAL_COUNT) -> Dict[str, Any]:
    """Keep only valid non-repeated questions and reindex them for display."""
    data = coerce_mcq_json_shape(data)
    selected = []
    used_evidence = set()

    for idx, q in enumerate(data.get("questions", []), start=1):
        if idx in bad_numbers:
            continue

        if any(questions_too_similar(q.get("question", ""), old.get("question", "")) for old in selected):
            continue
        if any(answer_ideas_too_similar(q, old) for old in selected):
            continue

        evidence_id = str(q.get("evidence_id", "")).upper()
        # Prefer different evidence IDs. If we still need to fill later, a second pass handles it.
        if evidence_id and evidence_id in used_evidence:
            continue

        selected.append(q)
        if evidence_id:
            used_evidence.add(evidence_id)
        if len(selected) >= needed:
            break

    # Second pass: fill remaining slots from valid questions even if evidence repeats.
    if len(selected) < needed:
        for idx, q in enumerate(data.get("questions", []), start=1):
            if idx in bad_numbers or q in selected:
                continue
            if any(questions_too_similar(q.get("question", ""), old.get("question", "")) for old in selected):
                continue
            if any(answer_ideas_too_similar(q, old) for old in selected):
                continue
            selected.append(q)
            if len(selected) >= needed:
                break

    for new_id, q in enumerate(selected, start=1):
        q["id"] = new_id
        q["difficulty"] = "Hard" if new_id <= 3 else "Medium"

    return {"questions": selected[:needed]}


def docs_too_similar(a: Any, b: Any) -> bool:
    """Detect repeated chunks before they reach the LLM."""
    ta = getattr(a, "page_content", "") or ""
    tb = getattr(b, "page_content", "") or ""
    if not ta or not tb:
        return False

    # Use both token containment and sequence ratio. Lecture slides often repeat headers.
    ratio = text_similarity(ta[:900], tb[:900])
    ca = content_tokens_for_similarity(ta[:1200])
    cb = content_tokens_for_similarity(tb[:1200])
    overlap = len(ca & cb)
    containment = overlap / max(min(len(ca), len(cb)), 1) if ca and cb else 0.0
    return ratio >= MCQ_CHUNK_SIMILARITY_LIMIT or (overlap >= 8 and containment >= 0.62)


def select_diverse_context_docs(docs: List[Any], limit: int = MCQ_CONTEXT_CHUNKS) -> List[Any]:
    """Select final evidence chunks with low repetition and page spread."""
    selected = []
    page_counts = {}

    for doc in docs:
        if not getattr(doc, "page_content", "").strip():
            continue

        meta = getattr(doc, "metadata", {}) or {}
        page = meta.get("page", "unknown")

        if page_counts.get(page, 0) >= MCQ_MAX_CHUNKS_PER_PAGE:
            continue

        if any(docs_too_similar(doc, old) for old in selected):
            continue

        selected.append(doc)
        page_counts[page] = page_counts.get(page, 0) + 1
        if len(selected) >= limit:
            return selected

    # Fill if the PDF has only a few pages or many repeated slide headers.
    for doc in docs:
        if len(selected) >= limit:
            break
        if doc in selected or not getattr(doc, "page_content", "").strip():
            continue
        if any(docs_too_similar(doc, old) for old in selected):
            continue
        selected.append(doc)

    # Last resort: fill unique metadata docs so we still have enough context.
    for doc in docs:
        if len(selected) >= limit:
            break
        if doc not in selected and getattr(doc, "page_content", "").strip():
            selected.append(doc)

    return selected[:limit]


def coerce_mcq_json_shape(data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a parsed JSON quiz into the expected shape when possible."""
    if not isinstance(data, dict):
        data = {}

    questions = data.get("questions", [])
    if not isinstance(questions, list):
        questions = []

    clean_questions = []
    for idx, q in enumerate(questions[:MCQ_CANDIDATE_COUNT], start=1):
        if not isinstance(q, dict):
            continue

        options = q.get("options", {})
        if not isinstance(options, dict):
            options = {}

        clean_options = {}
        for letter in ["A", "B", "C", "D"]:
            value = options.get(letter, options.get(letter.lower(), ""))
            clean_options[letter] = str(value).strip()

        difficulty = str(q.get("difficulty", "Hard" if idx <= 3 else "Medium")).strip()
        if difficulty.lower() not in {"hard", "medium", "easy"}:
            difficulty = "Hard" if idx <= 3 else "Medium"
        else:
            difficulty = difficulty.capitalize()
            if difficulty == "Easy":
                difficulty = "Medium"

        correct = str(q.get("correct_answer", "")).strip().upper()
        if correct not in {"A", "B", "C", "D"}:
            correct = ""

        evidence_id = str(q.get("evidence_id", "")).strip().upper().replace("[", "").replace("]", "")
        if evidence_id and evidence_id.isdigit():
            evidence_id = f"E{evidence_id}"
        if evidence_id and not evidence_id.startswith("E"):
            evidence_id = f"E{evidence_id}"

        answer_text = str(q.get("answer_text") or q.get("correct_answer_text") or "").strip()
        if not answer_text and correct in clean_options:
            answer_text = clean_options.get(correct, "")

        clean_questions.append({
            "id": int(q.get("id", idx)) if str(q.get("id", idx)).isdigit() else idx,
            "difficulty": difficulty,
            "evidence_id": evidence_id,
            "question": str(q.get("question", "")).strip(),
            "answer_text": answer_text,
            "options": clean_options,
            "correct_answer": correct,
            "correct_answer_text": str(q.get("correct_answer_text", "")).strip(),
            "explanation": str(q.get("explanation", "")).strip(),
        })

    return {"questions": clean_questions}


def validate_mcq_json_data(data: Dict[str, Any], context: str = "") -> Tuple[Dict[str, Any], set]:
    """Deterministic validation for structured MCQ candidates.

    Paper-inspired safety checks:
    - answer_text first, backend assigns final correct letter
    - explanation must align with the selected option
    - selected answer must be grounded in the chosen evidence chunk
    - distractors cannot duplicate the correct answer
    - repeated question/answer ideas are rejected
    """
    data = coerce_mcq_json_shape(data)
    questions = data.get("questions", [])
    evidence_texts = extract_evidence_texts_from_context(context)
    bad = set()

    if len(questions) < MCQ_FINAL_COUNT:
        return data, set(range(1, max(MCQ_FINAL_COUNT, len(questions)) + 1))

    previous_questions = []
    previous_valid_answer_questions = []
    used_evidence_ids = set()

    for idx, q in enumerate(questions, start=1):
        q["id"] = idx
        q["difficulty"] = "Hard" if idx <= 3 else "Medium"

        whole = json.dumps(q, ensure_ascii=False).lower()

        if has_forbidden_option_or_ungrounded_language(whole):
            bad.add(idx)
            continue

        q = assign_correct_letter_from_answer_text(q)
        questions[idx - 1] = q
        if q.get("validation_error"):
            bad.add(idx)
            continue

        question_text = q.get("question", "")
        normalized_question = normalize_for_duplicate_check(question_text)
        if len(normalized_question) < 12:
            bad.add(idx)
            continue

        if is_bad_mcq_question_stem(question_text):
            bad.add(idx)
            continue

        if any(questions_too_similar(question_text, prev) for prev in previous_questions):
            bad.add(idx)
            continue
        previous_questions.append(question_text)

        options = q.get("options", {})
        if set(options.keys()) != {"A", "B", "C", "D"}:
            bad.add(idx)
            continue

        option_values = [str(options.get(letter, "")).strip() for letter in ["A", "B", "C", "D"]]
        if any(len(value) < 2 for value in option_values):
            bad.add(idx)
            continue

        # V4: reject the whole candidate if any option is weak, grouped, or a placeholder.
        # Do NOT replace it with fake text.
        if has_bad_mcq_option(options):
            bad.add(idx)
            continue

        normalized_options = [normalize_for_duplicate_check(value) for value in option_values]
        if len(set(normalized_options)) != 4:
            bad.add(idx)
            continue

        correct = q.get("correct_answer", "")
        if correct not in {"A", "B", "C", "D"}:
            bad.add(idx)
            continue

        explanation = q.get("explanation", "")
        if len(explanation.strip()) < 40:
            bad.add(idx)
            continue

        evidence_id = q.get("evidence_id", "")
        evidence_marker_ok = bool(re.search(r"\[E\d+\]", explanation, flags=re.I))
        if evidence_id:
            evidence_marker_ok = evidence_marker_ok or (f"[{evidence_id.upper()}]" in explanation.upper())

        page_or_source_ok = bool(re.search(r"\b(page|source)\b", explanation, flags=re.I))
        if not (evidence_marker_ok or page_or_source_ok):
            bad.add(idx)
            continue

        # Reusing an evidence ID is not automatically wrong.
        # We prefer diverse evidence during selection, but we do not remove a good MCQ only for same evidence.
        if context and not evidence_supports_answer_text(q, evidence_texts):
            bad.add(idx)
            continue

        if context and other_option_supported_by_same_evidence(q, evidence_texts):
            bad.add(idx)
            continue

        if not explanation_supports_selected_option(q):
            bad.add(idx)
            continue

        if not validate_distractors_for_question(q):
            bad.add(idx)
            continue

        if any(answer_ideas_too_similar(q, old_q) for old_q in previous_valid_answer_questions):
            bad.add(idx)
            continue

        # Reject list/count questions such as "five levels", "four steps", etc.
        lower = question_text.lower()
        if re.search(r"\b(five|5|four|4|three|3)\s+(levels|steps|types|stages|components|parts)\b", lower):
            bad.add(idx)
            continue

        if evidence_id:
            used_evidence_ids.add(evidence_id)
        previous_valid_answer_questions.append(q)

    return {"questions": questions}, bad


def format_mcq_json_for_display(data: Dict[str, Any]) -> str:
    """Convert structured JSON quiz to the user-facing MCQ format."""
    data = coerce_mcq_json_shape(data)
    lines = []

    for idx, q in enumerate(data.get("questions", [])[:MCQ_FINAL_COUNT], start=1):
        difficulty = "Hard" if idx <= 3 else "Medium"
        question = q.get("question", "").strip()
        options = q.get("options", {})
        correct = q.get("correct_answer", "").strip().upper()
        explanation = q.get("explanation", "").strip()
        evidence_id = q.get("evidence_id", "").strip().upper()

        if evidence_id and f"[{evidence_id}]" not in explanation.upper():
            explanation = f"According to [{evidence_id}], {explanation}" if explanation else f"According to [{evidence_id}], the selected option is supported by the evidence."

        lines.append(f"Q{idx} ({difficulty}): {question}")
        for letter in ["A", "B", "C", "D"]:
            lines.append(f"{letter}. {str(options.get(letter, '')).strip()}")
        lines.append(f"Correct answer: {correct}")
        lines.append(f"Explanation: {explanation}")
        lines.append("")

    return "\n".join(lines).strip()


def get_mcq_json_schema() -> Dict[str, Any]:
    """Strict JSON schema for Ollama structured outputs."""
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["questions"],
        "properties": {
            "questions": {
                "type": "array",
                "minItems": MCQ_CANDIDATE_COUNT,
                "maxItems": MCQ_CANDIDATE_COUNT,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": [
                        "id",
                        "difficulty",
                        "evidence_id",
                        "question",
                        "answer_text",
                        "options",
                        "correct_answer",
                        "explanation",
                    ],
                    "properties": {
                        "id": {"type": "integer", "minimum": 1, "maximum": MCQ_CANDIDATE_COUNT},
                        "difficulty": {"type": "string", "enum": ["Hard", "Medium"]},
                        "evidence_id": {"type": "string", "pattern": "^E[0-9]+$"},
                        "question": {"type": "string", "minLength": 12},
                        "answer_text": {"type": "string", "minLength": 2},
                        "options": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["A", "B", "C", "D"],
                            "properties": {
                                "A": {"type": "string", "minLength": 2},
                                "B": {"type": "string", "minLength": 2},
                                "C": {"type": "string", "minLength": 2},
                                "D": {"type": "string", "minLength": 2},
                            },
                        },
                        "correct_answer": {"type": "string", "enum": ["A", "B", "C", "D"]},
                        "explanation": {"type": "string", "minLength": 45},
                    },
                },
            }
        },
    }



def get_ollama_response_content(result: Any) -> str:
    """Extract only assistant message content from Ollama Python responses.

    The Ollama Python client may return either a dict-like response or a typed
    ChatResponse object. Converting the whole object with str(result) produces
    text like "model='llama3.2:3b' ... message=Message(...)" which is NOT JSON.
    This helper avoids the slow false-failure path by reading message.content.
    """
    try:
        if isinstance(result, dict):
            msg = result.get("message", {})
            if isinstance(msg, dict):
                return msg.get("content", "") or result.get("response", "") or ""
            content = getattr(msg, "content", None)
            if content:
                return content
            return result.get("response", "") or ""

        message = getattr(result, "message", None)
        if message is not None:
            content = getattr(message, "content", None)
            if content:
                return content
            if isinstance(message, dict):
                return message.get("content", "") or ""

        response = getattr(result, "response", None)
        if response:
            return response

        # Last-resort only: never use this as the main path.
        return ""
    except Exception as exc:
        logger.warning(f"Could not extract Ollama response content: {exc}")
        return ""


def normalize_mcq_data_before_validation(data: Dict[str, Any]) -> Dict[str, Any]:
    """Small safe normalizations before validation/display.

    This does not invent answers. It only fixes common formatting issues from
    small local models: missing evidence marker in explanation, lowercase option
    letters, and dangerous grouped option text.
    """
    data = coerce_mcq_json_shape(data)
    for q in data.get("questions", []):
        evidence_id = str(q.get("evidence_id", "")).strip().upper()
        if evidence_id and evidence_id.isdigit():
            evidence_id = f"E{evidence_id}"
        if evidence_id and not evidence_id.startswith("E"):
            evidence_id = f"E{evidence_id}"
        q["evidence_id"] = evidence_id

        explanation = str(q.get("explanation", "")).strip()
        if evidence_id and f"[{evidence_id}]" not in explanation.upper():
            q["explanation"] = f"According to [{evidence_id}], {explanation}" if explanation else f"According to [{evidence_id}], the selected answer is directly supported by the evidence."

        options = q.get("options", {}) or {}
        # V4: never create placeholder distractors. If an option is bad,
        # mark the candidate invalid and let the validator/replacement logic skip it.
        if has_bad_mcq_option(options):
            q["validation_error"] = "bad option text"
        q["options"] = options
        q = assign_correct_letter_from_answer_text(q)
    return data


def generate_mcq_json_once(context: str, user_request: str, selected_model: str) -> Optional[Dict[str, Any]]:
    """Generate a structured MCQ quiz as JSON using Ollama JSON Schema mode first."""
    schema = get_mcq_json_schema()
    prompt_text = f"""You are a strict PDF-based exam-question generator.

Use ONLY these evidence chunks. Each chunk has an ID like [E1].
{context}

User request:
{user_request}

Generate {MCQ_CANDIDATE_COUNT} candidate MCQs. The app will validate them and display exactly {MCQ_FINAL_COUNT} valid MCQs.

Research-inspired generation process:
1. Choose ONE clear evidence chunk.
2. Select the exact answer_text from that evidence BEFORE writing options.
3. Write a question whose answer is exactly answer_text.
4. Create the correct option using answer_text.
5. Create three distractors using the question + answer_text. Distractors must be plausible but clearly wrong according to the same evidence.
6. Set correct_answer to the option letter matching answer_text.
7. Write an explanation that directly supports answer_text and cites the same evidence ID.

Quality requirements:
- Candidate Q1, Q2, Q3 should be Hard when possible.
- Remaining candidates may be Medium.
- Generate extra candidates so the validator can keep 5 strong MCQs without showing weak ones.
- Prefer different evidence IDs across questions.
- Do NOT ask two questions about the same concept's aim, purpose, definition, or focus.
- Hard questions should test comparison, consequence, limitation, method, or application when the evidence supports it.
- The evidence_id must be like "E1", "E2", etc.
- The explanation must mention the same evidence ID in square brackets, like [E1].
- The correct_answer must be one letter only: A, B, C, or D.
- The correct option must match answer_text.
- The explanation must support the selected answer, not another option.
- NEVER use All of the above, None of the above, Both A and B, Neither, or any grouped option.
- NEVER use option text containing: "only", "both", "not mentioned", "not provided", "not supported", or placeholder wording.
- If you cannot create three real plausible distractors for a candidate, skip that candidate and create another one.
- Do not use outside knowledge or general knowledge.
- Do not write: although not stated, can be inferred, can be considered, generally, in practice.
- Do not create vague questions like "what is the main idea" unless the evidence clearly states it.
- Avoid memorization stems: primary goal, main purpose, main idea, define, what is one common application.
- Do not make a question where more than one option is explicitly supported by the same evidence.

Return ONLY valid JSON matching this schema:
{json.dumps(schema, ensure_ascii=False)}"""

    # Best path: Ollama structured outputs with a JSON schema. This is more reliable
    # than free-text MCQs and prevents missing fields/options in most runs.
    try:
        result = ollama.chat(
            model=selected_model,
            messages=[
                {
                    "role": "system",
                    "content": "Return only valid JSON matching the schema. No markdown. No prose."
                },
                {
                    "role": "user",
                    "content": prompt_text
                }
            ],
            format=schema,
            options={
                "temperature": 0,
                "num_ctx": MCQ_QUALITY_NUM_CTX,
                "num_predict": MCQ_GENERATE_NUM_PREDICT,
            },
        )

        raw = get_ollama_response_content(result)
        parsed = extract_json_object_from_text(raw)
        if parsed:
            return normalize_mcq_data_before_validation(parsed)

        logger.warning(f"Ollama schema mode returned unparsable output: {raw[:250]}")
    except Exception as e:
        logger.warning(f"Ollama schema generation failed: {e}")

    if not MCQ_USE_JSON_BACKUP:
        return None

    # Backup: plain JSON mode, still structured and validated afterward.
    try:
        result = ollama.chat(
            model=selected_model,
            messages=[
                {"role": "system", "content": "Return only valid JSON. Do not use markdown."},
                {"role": "user", "content": prompt_text},
            ],
            format="json",
            options={
                "temperature": 0,
                "num_ctx": MCQ_QUALITY_NUM_CTX,
                "num_predict": MCQ_GENERATE_NUM_PREDICT,
            },
        )
        raw = get_ollama_response_content(result)
        parsed = extract_json_object_from_text(raw)
        if parsed:
            return normalize_mcq_data_before_validation(parsed)
        logger.warning(f"Ollama JSON backup returned unparsable output: {raw[:250]}")
    except Exception as e:
        logger.warning(f"Ollama JSON backup failed: {e}")

    return None

def repair_mcq_json_questions(
    data: Dict[str, Any],
    bad_numbers: set,
    context: str,
    selected_model: str
) -> Dict[str, Any]:
    """Repair only invalid structured questions, keeping valid ones untouched."""
    data = coerce_mcq_json_shape(data)
    questions = data.get("questions", [])
    if not questions or not bad_numbers:
        return data

    bad_numbers = sorted(n for n in bad_numbers if 1 <= int(n) <= MCQ_CANDIDATE_COUNT)[:MCQ_MAX_REPAIR_QUESTIONS]
    invalid_questions = [questions[n - 1] for n in bad_numbers if n - 1 < len(questions)]

    llm = ChatOllama(
        model=selected_model,
        temperature=0,
        num_ctx=MCQ_QUALITY_NUM_CTX,
        num_predict=MCQ_REPAIR_NUM_PREDICT,
    )

    prompt_text = f"""You are fixing invalid MCQs.

Use ONLY these evidence chunks:
{context}

Invalid questions JSON:
{json.dumps({"questions": invalid_questions}, ensure_ascii=False)}

Fix ONLY these invalid questions.

Rules:
- Keep the same id and difficulty.
- Use exactly A, B, C, D.
- Do not use All/None/Both/Neither.
- Do not use option text containing: only, both, not mentioned, not provided, not supported, or placeholder wording.
- Use one clear evidence chunk.
- evidence_id must be like "E1".
- Explanation must mention the same evidence ID like [E1].
- Make exactly one correct answer.
- Correct answer must be supported by the evidence.
- Do not use outside/general knowledge.
- Do not write: although not stated, can be inferred, can be considered, generally, in practice.

Return ONLY valid JSON:
{{
  "questions": [
    {{
      "id": 1,
      "difficulty": "Hard",
      "evidence_id": "E1",
      "question": "...",
      "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
      "correct_answer": "A",
      "explanation": "According to [E1], ..."
    }}
  ]
}}"""

    try:
        result = llm.invoke(prompt_text)
        raw = getattr(result, "content", str(result))
        repaired = extract_json_object_from_text(raw)
        repaired = coerce_mcq_json_shape(repaired or {"questions": []})

        repaired_by_id = {}
        for q in repaired.get("questions", []):
            qid = q.get("id")
            if isinstance(qid, int) and qid in bad_numbers:
                repaired_by_id[qid] = q

        for qid, fixed_q in repaired_by_id.items():
            questions[qid - 1] = fixed_q

        return {"questions": questions[:5]}
    except Exception as e:
        logger.warning(f"Structured MCQ JSON repair failed: {e}")
        return data


def generate_fallback_mcq_text(context: str, user_request: str, selected_model: str) -> str:
    """Fallback path when local model fails to return valid JSON.

    This avoids the bad user experience where the app shows no quiz at all.
    It still uses the same evidence chunks and the existing rule-based repair.
    """
    # Use a clearer log message indicating we are using the fast free-text MCQ generation path.
    logger.info("Running fast free-text MCQ generation")

    llm = ChatOllama(
        model=selected_model,
        temperature=0.1,
        num_ctx=2048,
        num_predict=950,
    )

    fallback_prompt = f"""Generate exactly 5 high-quality MCQs from ONLY the evidence chunks below.

Evidence chunks:
{context}

User request:
{user_request}

Rules:
- Q1, Q2, Q3 must be Hard.
- Q4, Q5 must be Medium.
- Each question must have A, B, C, D.
- Correct answer must be one letter only.
- Every question MUST include an Explanation line.
- Every explanation MUST mention an evidence ID like [E1].
- Use only the evidence chunks.
- Do not use outside knowledge.
- Do not use All/None/Both/Neither of the above.
- Avoid duplicate question ideas.
- Avoid broad/vague questions.
        - Do not write: although not stated, can be inferred, can be considered, generally, in practice.
        - Do not ask list questions such as "five levels", "four steps", "three types", etc.
        - Do not use phrases like "this suggests", "suggests that", "this implies", "implies that", or "indicates that".
        - The explanation must directly state why the selected option is correct and must not support any other option.

Format exactly:
Q1 (Hard): ...
A. ...
B. ...
C. ...
D. ...
Correct answer: ...
Explanation: According to [E...], ...

Q2 (Hard): ...
A. ...
B. ...
C. ...
D. ...
Correct answer: ...
Explanation: According to [E...], ...

Q3 (Hard): ...
A. ...
B. ...
C. ...
D. ...
Correct answer: ...
Explanation: According to [E...], ...

Q4 (Medium): ...
A. ...
B. ...
C. ...
D. ...
Correct answer: ...
Explanation: According to [E...], ...

Q5 (Medium): ...
A. ...
B. ...
C. ...
D. ...
Correct answer: ...
Explanation: According to [E...], ..."""

    try:
        result = llm.invoke(fallback_prompt)
        raw = getattr(result, "content", str(result))
        cleaned = clean_quiz_output(raw)

        # Keep the existing lightweight validator/repair for missing explanation,
        # forbidden words, or bad option formats.
        repaired = validate_and_repair_mcq_quiz(
            cleaned,
            context,
            selected_model,
            max_rounds=1,
        )
        return repaired
    except Exception as e:
        logger.warning(f"Free-text MCQ fallback failed: {e}")
        return "The local model could not generate a stable quiz this time. Please click Regenerate Quiz."




def extract_subjective_evidence_cards(context: str) -> List[Dict[str, str]]:
    """Parse formatted RAG context into evidence cards used by Subjective V6."""
    cards = []
    if not context:
        return cards

    pattern = re.compile(
        r"\[(E\d+)\]\s*\[Source:\s*([^\]]+)\]\s*(.*?)(?=\n---\n\[(?:E\d+)\]|\Z)",
        flags=re.S | re.I,
    )

    for match in pattern.finditer(context):
        evidence_id = match.group(1).upper()
        source = " ".join(match.group(2).split())
        evidence_text = " ".join(match.group(3).split())
        if evidence_text:
            cards.append({
                "evidence_id": evidence_id,
                "source": source,
                "text": evidence_text,
            })

    # Fallback parser if the source label shape changes.
    if not cards:
        fallback = re.compile(r"\[(E\d+)\].*?\n(.*?)(?=\n---\n\[(?:E\d+)\]|\Z)", re.S | re.I)
        for match in fallback.finditer(context):
            evidence_id = match.group(1).upper()
            evidence_text = " ".join(match.group(2).split())
            if evidence_text:
                cards.append({"evidence_id": evidence_id, "source": evidence_id, "text": evidence_text})

    return cards


SUBJECTIVE_WEAK_STEM_PATTERNS = [
    r"\bmain\s+(reason|purpose|aim|objective|goal|idea|use|application)\b",
    r"\bprimary\s+(reason|purpose|aim|objective|goal|idea|use|application|challenge)\b",
    r"\bfirst\s+(level|step|stage|type)\b",
    r"\bdefine\b",
    r"\blist\b",
    r"\bwhat\s+is\s+one\b",
    r"\bwhat\s+are\s+some\b",
    r"\bwhat\s+is\s+the\s+(process|term|definition|purpose|aim|goal)\b",
    r"\bwhat\s+is\s+the\s+process\s+called\b",
    r"\bcommon\s+(applications|uses|examples)\b",
    r"\bone\s+important\s+use\b",
]


SUBJECTIVE_ALLOWED_STARTERS = (
    "explain", "compare", "analyze", "apply", "connect", "evaluate",
    "discuss", "how does", "how do", "why does", "why do", "in what way",
)


SUBJECTIVE_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "with", "without", "from", "into",
    "that", "this", "these", "those", "there", "their", "they", "them", "are",
    "is", "was", "were", "be", "been", "being", "to", "of", "in", "on", "for",
    "as", "by", "it", "its", "can", "could", "would", "should", "may", "might",
    "has", "have", "had", "using", "use", "used", "system", "systems", "text",
    "data", "information", "technology", "process", "concept", "question",
    "answer", "evidence", "source", "pdf", "provided", "according",
}


def subjective_content_tokens(text: str) -> set:
    """Content tokens used for lightweight evidence support checks."""
    tokens = set(re.findall(r"[a-zA-Z][a-zA-Z0-9_-]{2,}", (text or "").lower()))
    return {t for t in tokens if t not in SUBJECTIVE_STOPWORDS and len(t) > 2}


def split_evidence_into_windows(text: str) -> List[str]:
    """Split one evidence card into small searchable windows.

    This is generic and PDF-agnostic. It does not block memorized phrases.
    It lets the validator search whether each generated claim is supported by
    a sentence or nearby sentence-window from the same evidence card.
    """
    clean = " ".join((text or "").split())
    if not clean:
        return []

    parts = re.split(r"(?<=[.!?])\s+|\n+|;\s+", clean)
    parts = [p.strip() for p in parts if len(p.strip()) >= 25]

    windows: List[str] = []
    for i, part in enumerate(parts):
        windows.append(part)
        if i + 1 < len(parts):
            windows.append((part + " " + parts[i + 1]).strip())

    return windows if windows else [clean]


def claim_best_evidence_score(claim: str, evidence_text: str) -> Tuple[float, str]:
    """Search evidence and return the best support score for one generated claim.

    The score is based on content-word overlap at sentence/window level:
    - claim coverage checks how much of the generated claim appears in evidence
    - window coverage keeps short evidence windows meaningful
    """
    claim_tokens = subjective_content_tokens(claim)
    if len(claim_tokens) < 4:
        return 0.0, ""

    best_score = 0.0
    best_window = ""

    for window in split_evidence_into_windows(evidence_text):
        window_tokens = subjective_content_tokens(window)
        if not window_tokens:
            continue

        overlap = claim_tokens & window_tokens
        claim_coverage = len(overlap) / max(len(claim_tokens), 1)
        window_coverage = len(overlap) / max(min(len(window_tokens), len(claim_tokens)), 1)
        score = (claim_coverage * 0.75) + (window_coverage * 0.25)

        if score > best_score:
            best_score = score
            best_window = window

    return best_score, best_window


def claim_has_unsupported_entities_or_numbers(claim: str, evidence_text: str) -> bool:
    """Reject claims that introduce new numbers, acronyms, or proper terms.

    This is generic for any PDF and prevents hallucinated details without
    hardcoding domain-specific words.
    """
    evidence_lower = (evidence_text or "").lower()

    claim_numbers = set(re.findall(r"\b\d+(?:\.\d+)?\b", claim or ""))
    evidence_numbers = set(re.findall(r"\b\d+(?:\.\d+)?\b", evidence_text or ""))
    if claim_numbers and not claim_numbers.issubset(evidence_numbers):
        return True

    claim_acronyms = set(re.findall(r"\b[A-Z]{2,}\b", claim or ""))
    evidence_acronyms = set(re.findall(r"\b[A-Z]{2,}\b", evidence_text or ""))
    if claim_acronyms and not claim_acronyms.issubset(evidence_acronyms):
        return True

    # Capitalized multi-word terms/names, such as "Information Extraction".
    claim_terms = set(re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b", claim or ""))
    for term in claim_terms:
        if term.lower() not in evidence_lower:
            return True

    return False


def subjective_claim_supported(
    claim: str,
    evidence_text: str,
    min_score: float = 0.34,
) -> bool:
    """Return True only if one claim is supported by searched evidence.

    This is generic RAG-style grounding:
    - it searches the same evidence card at sentence/window level
    - it checks that enough important claim words are present in evidence
    - it rejects newly introduced numbers/acronyms/proper terms
    It does NOT block memorized phrases or domain-specific words.
    """
    clean_claim = " ".join((claim or "").split())
    if len(clean_claim) < 20:
        return False

    if claim_has_unsupported_entities_or_numbers(clean_claim, evidence_text):
        return False

    claim_tokens = subjective_content_tokens(clean_claim)
    evidence_tokens = subjective_content_tokens(evidence_text)

    if len(claim_tokens) < 4 or not evidence_tokens:
        return False

    global_overlap = claim_tokens & evidence_tokens
    global_overlap_ratio = len(global_overlap) / max(len(claim_tokens), 1)

    # Dynamic support: reject broad extra claims whose important words are mostly
    # absent from the evidence card. This is not memorized; it depends only on the PDF.
    if len(global_overlap) < 2 or global_overlap_ratio < 0.24:
        return False

    score, best_window = claim_best_evidence_score(clean_claim, evidence_text)
    if score < min_score:
        return False

    best_window_tokens = subjective_content_tokens(best_window)
    local_overlap = claim_tokens & best_window_tokens

    # Require the best supporting window to share multiple important terms.
    # This prevents a sentence from passing because of one generic overlap word.
    if len(local_overlap) < 2:
        return False

    return True

def split_claim_sentences(text: str) -> List[str]:
    """Split expected answer into claim-sized sentences for evidence checking."""
    clean = " ".join((text or "").split())
    if not clean:
        return []

    sentences = [
        s.strip()
        for s in re.split(r"(?<=[.!?])\s+", clean)
        if s.strip()
    ]

    return sentences if sentences else [clean]


def is_weak_subjective_question(question_text: str) -> bool:
    """Reject memorization stems and require reasoning-style wording."""
    clean = " ".join((question_text or "").strip().split())
    lower = clean.lower()
    if not clean:
        return True

    if any(re.search(pattern, lower, flags=re.I) for pattern in SUBJECTIVE_WEAK_STEM_PATTERNS):
        return True

    # Keep subjective questions reasoning-oriented. This prevents "What is..." recall items.
    return not lower.startswith(SUBJECTIVE_ALLOWED_STARTERS)


def split_subjective_blocks(text: str) -> List[str]:
    """Split subjective output into Q blocks. Handles Q1 (Hard)** and missing colons."""
    if not text:
        return []

    cleaned = text.strip()
    match = re.search(r"(?is)Q1\s*\((?:Hard|Medium|Easy)\)", cleaned)
    if match:
        cleaned = cleaned[match.start():].strip()

    # Normalize common local-model formatting mistakes before splitting.
    cleaned = re.sub(r"(?m)^(Q\d+\s*\((?:Hard|Medium|Easy)\))\s*\*+\s*", r"\1: ", cleaned)
    cleaned = re.sub(r"(?m)^(Q\d+\s*\((?:Hard|Medium|Easy)\))\s+(?=\S)", r"\1: ", cleaned)

    starts = list(re.finditer(r"(?m)^Q\d+\s*\((?:Hard|Medium|Easy)\)\s*:?", cleaned))
    if not starts:
        return [cleaned] if cleaned else []

    blocks = []
    for i, start_match in enumerate(starts):
        start = start_match.start()
        end = starts[i + 1].start() if i + 1 < len(starts) else len(cleaned)
        block = cleaned[start:end].strip()
        if block:
            blocks.append(block)

    return blocks


def extract_subjective_fields(block: str) -> Dict[str, Any]:
    """Extract question, answer, key points, and source from one subjective block."""
    raw = block or ""
    raw = re.sub(r"(?m)^(Q\d+\s*\((?:Hard|Medium|Easy)\))\s*\*+\s*", r"\1: ", raw)
    raw = re.sub(r"(?m)^(Q\d+\s*\((?:Hard|Medium|Easy)\))\s+(?=\S)", r"\1: ", raw)

    q_match = re.search(
        r"(?is)^Q(\d+)\s*\((Hard|Medium|Easy)\)\s*:?\s*(.*?)(?=\n\s*Expected answer\s*:)",
        raw,
    )
    answer_match = re.search(
        r"(?is)Expected answer\s*:\s*(.*?)(?=\n\s*Key points\s*:)",
        raw,
    )
    key_match = re.search(
        r"(?is)Key points\s*:\s*(.*?)(?=\n\s*Grading points\s*:|\n\s*Source\s*:|\Z)",
        raw,
    )
    source_match = re.search(r"(?is)Source\s*:\s*(\[?E\d+\]?)", raw)

    key_points = []
    if key_match:
        key_text = key_match.group(1).strip()
        for line in key_text.splitlines():
            item = line.strip()
            item = re.sub(r"^[-*•]\s*", "", item).strip()
            if item:
                key_points.append(item)

    return {
        "number": int(q_match.group(1)) if q_match else None,
        "difficulty": q_match.group(2).capitalize() if q_match else "",
        "question": " ".join(q_match.group(3).split()) if q_match else "",
        "answer": " ".join(answer_match.group(1).split()) if answer_match else "",
        "key_points": key_points,
        "source": source_match.group(1).replace("[", "").replace("]", "").upper() if source_match else "",
    }


def normalize_subjective_block(
    block: str,
    qnum: int,
    difficulty: str,
    evidence_id: str,
) -> str:
    """Normalize one valid subjective block and force a correct 10-point rubric."""
    fields = extract_subjective_fields(block)
    question = fields.get("question", "").strip()
    answer = fields.get("answer", "").strip()
    key_points = [kp.strip() for kp in fields.get("key_points", []) if kp.strip()][:3]

    # Keep the model content, but never trust the model to write grading scores.
    lines = [
        f"Q{qnum} ({difficulty}): {question}",
        "",
        f"Expected answer: {answer}",
        "",
        "Key points:",
    ]

    for kp in key_points:
        lines.append(f"- {kp}")

    lines.extend([
        "",
        "Grading points:",
        "- 4 pts: Identifies the central correct idea from the evidence.",
        "- 3 pts: Supports the answer with evidence-based details.",
        "- 3 pts: Explains the comparison, analysis, application, process, limitation, or cause-effect connection clearly.",
        "- 0 pts: Unsupported, unrelated, or outside-knowledge answers.",
        f"Source: [{evidence_id}]",
    ])

    return "\n".join(lines).strip()


def subjective_candidate_error(block: str, card: Dict[str, str], previous_blocks: List[str]) -> str:
    """Return an error string if a subjective candidate should be rejected."""
    fields = extract_subjective_fields(block)
    evidence_id = card.get("evidence_id", "").upper()
    evidence_text = card.get("text", "")

    question = fields.get("question", "")
    answer = fields.get("answer", "")
    key_points = fields.get("key_points", [])
    source = fields.get("source", "")

    if not question or not answer:
        return "missing question or expected answer"

    if source and source.upper() != evidence_id:
        return "wrong evidence source"

    if is_weak_subjective_question(question):
        return "weak memorization stem"

    # Reject if the model still writes a score instead of a rubric.
    if re.search(r"Grading points\s*:\s*\d+(?:\.\d+)?\s*/\s*10", block, flags=re.I):
        return "grading score instead of rubric"

    if len(key_points) != 3:
        return "key points not exactly 3"

    combined = f"{question} {answer} {' '.join(key_points)}"
    lower_combined = combined.lower()

    forbidden_generation_phrases = [
        "outside knowledge", "general knowledge", "not explicitly stated",
        "can be inferred", "generally speaking",
    ]
    for phrase in forbidden_generation_phrases:
        if phrase in lower_combined and phrase not in evidence_text.lower():
            return f"unsupported phrase: {phrase}"

    # Dynamic evidence search, not memorized phrase blocking.
    # Each answer sentence and each key point must be supported by the same evidence card.
    answer_sentences = split_claim_sentences(answer)
    if not answer_sentences:
        return "missing expected answer sentences"

    for sentence in answer_sentences:
        if not subjective_claim_supported(sentence, evidence_text, min_score=SUBJECTIVE_ANSWER_SENTENCE_MIN_SCORE):
            return "expected answer sentence not supported by evidence search"

    for key_point in key_points:
        if not subjective_claim_supported(key_point, evidence_text, min_score=SUBJECTIVE_KEY_POINT_MIN_SCORE):
            return "key point not supported by evidence search"

    # Keep a lenient whole-answer support check as a safety net for very short slide chunks.
    evidence_tokens = subjective_content_tokens(evidence_text)
    candidate_tokens = subjective_content_tokens(answer + " " + " ".join(key_points))
    if len(candidate_tokens) < 4:
        return "answer too thin"

    overlap = candidate_tokens & evidence_tokens
    overlap_ratio = len(overlap) / max(len(candidate_tokens), 1)
    if len(overlap) < 2 or overlap_ratio < SUBJECTIVE_WHOLE_ANSWER_MIN_OVERLAP:
        return "not enough overlap with cited evidence"

    # Avoid near-duplicate question/answer/key-point concepts.
    # This is generic diversity checking; it compares generated concepts, not fixed words.
    current_sig = subjective_content_tokens(question + " " + answer + " " + " ".join(key_points))
    for old in previous_blocks:
        old_fields = extract_subjective_fields(old)
        old_key_points = old_fields.get("key_points", [])
        old_sig = subjective_content_tokens(
            old_fields.get("question", "") + " " +
            old_fields.get("answer", "") + " " +
            " ".join(old_key_points)
        )
        if current_sig and old_sig:
            shared = len(current_sig & old_sig)
            containment = shared / max(min(len(current_sig), len(old_sig)), 1)
            jaccard = shared / max(len(current_sig | old_sig), 1)

            if (
                shared >= 5 and containment >= SUBJECTIVE_DUPLICATE_CONTAINMENT_LIMIT
            ) or (
                shared >= 4 and jaccard >= SUBJECTIVE_DUPLICATE_JACCARD_LIMIT
            ):
                return "repeated concept"

    return ""


def generate_one_subjective_candidate(
    card: Dict[str, str],
    qnum: int,
    difficulty: str,
    selected_model: str,
    retry_note: str = "",
) -> str:
    """Generate one subjective/written question from one evidence card only."""
    llm = ChatOllama(
        model=selected_model,
        temperature=0.0,
        num_ctx=SUBJECTIVE_GENERATE_NUM_CTX,
        num_predict=SUBJECTIVE_GENERATE_NUM_PREDICT,
    )

    evidence_id = card["evidence_id"]
    evidence_text = card["text"]

    retry_section = f"\nAvoid this previous problem: {retry_note}\n" if retry_note else ""

    prompt_text = f"""You are generating ONE strong subjective exam question from ONE evidence card.

Evidence card:
[{evidence_id}]
{evidence_text}

{retry_section}
Create exactly ONE question.

Difficulty label: {difficulty}
Question number: Q{qnum}

Mandatory rules:
- Use ONLY the evidence card above.
- Do NOT use outside knowledge.
- The question must start with one of these words/phrases:
  Explain, Compare, Analyze, Apply, Connect, Evaluate, Discuss how, How does, Why does, In what way.
- Do NOT ask: main reason, main purpose, primary aim, primary purpose, first level, define, list, what is one, common applications.
- Do NOT ask a simple recall question.
- Expected answer must be 2 concise sentences and must be supported by [{evidence_id}].
- Every sentence in the Expected answer must be traceable to one sentence or nearby sentence-window in [{evidence_id}].
- Key points must be exactly 3 bullets and each must be directly searchable inside [{evidence_id}] by its important concept words.
- Do NOT add broad academic conclusions unless the evidence card itself supports them.
- Do NOT add field-level consequences, benefits, or outcomes unless their important concept words appear in [{evidence_id}].
- Avoid using the same concept relation that another accepted question could use; choose the most specific relation in this evidence card.
- Prefer concrete relations, contrasts, processes, limitations, examples, or cause-effect ideas from the evidence card.
- Do NOT write any score like 9/10 or 8/10.
- Source must be exactly Source: [{evidence_id}].

Format exactly:
Q{qnum} ({difficulty}): ...
Expected answer: ...
Key points:
- ...
- ...
- ...
Grading points:
- 4 pts: Identifies the central correct idea from the evidence.
- 3 pts: Supports the answer with evidence-based details.
- 3 pts: Explains the comparison, analysis, application, process, limitation, or cause-effect connection clearly.
- 0 pts: Unsupported, unrelated, or outside-knowledge answers.
Source: [{evidence_id}]"""

    try:
        result = llm.invoke(prompt_text)
        raw = getattr(result, "content", str(result)).strip()
        blocks = split_subjective_blocks(raw)
        return blocks[0] if blocks else raw
    except Exception as exc:
        logger.warning(f"Subjective single-card generation failed for {evidence_id}: {exc}")
        return ""


def generate_subjective_quiz(context: str, user_request: str, selected_model: str) -> str:
    """Subjective V6: evidence-card tournament with validation before display.

    This intentionally does NOT ask the model for all 5 questions at once.
    It generates one candidate per evidence card, validates it against that card,
    fixes the rubric in code, removes weak memorization stems, and only displays
    candidates that passed.
    """
    logger.info("Running Subjective V6 evidence-card tournament")

    cards = extract_subjective_evidence_cards(context)
    if not cards:
        return "I could not build evidence cards from the PDF chunks. Please re-upload the PDF and try again."

    # Prefer evidence cards likely to support reasoning-style written questions.
    reasoning_keywords = [
        "compare", "difference", "limitation", "challenge", "because", "process",
        "application", "example", "method", "approach", "advantage", "disadvantage",
        "purpose", "result", "effect", "relationship", "classification",
    ]

    def card_score(card: Dict[str, str]) -> int:
        clean = card.get("text", "").lower()
        return sum(1 for kw in reasoning_keywords if re.search(rf"\b{re.escape(kw)}\b", clean))

    ordered_cards = sorted(cards, key=card_score, reverse=True)
    ordered_cards = ordered_cards[:SUBJECTIVE_MAX_CARDS_TO_TRY]

    accepted_blocks: List[str] = []
    rejected_notes = []

    # First pass: one candidate per strong evidence card.
    for card in ordered_cards:
        if len(accepted_blocks) >= SUBJECTIVE_FINAL_COUNT:
            break

        qnum = len(accepted_blocks) + 1
        difficulty = "Hard" if qnum <= 3 else "Medium"
        raw_block = generate_one_subjective_candidate(card, qnum, difficulty, selected_model)
        if not raw_block:
            rejected_notes.append(f"{card['evidence_id']}: empty generation")
            continue

        error = subjective_candidate_error(raw_block, card, accepted_blocks)

        # One repair/regeneration attempt from the same evidence card.
        if error:
            logger.info(f"Subjective candidate from {card['evidence_id']} rejected: {error}; retrying once")
            raw_block = generate_one_subjective_candidate(
                card,
                qnum,
                difficulty,
                selected_model,
                retry_note=error,
            )
            error = subjective_candidate_error(raw_block, card, accepted_blocks)

        if error:
            rejected_notes.append(f"{card['evidence_id']}: {error}")
            logger.info(f"Subjective candidate from {card['evidence_id']} rejected after retry: {error}")
            continue

        normalized = normalize_subjective_block(
            raw_block,
            qnum=qnum,
            difficulty=difficulty,
            evidence_id=card["evidence_id"],
        )
        accepted_blocks.append(normalized)

    # Second pass: if a model was too strict/weak, allow more cards in original order.
    if len(accepted_blocks) < SUBJECTIVE_FINAL_COUNT:
        for card in cards:
            if len(accepted_blocks) >= SUBJECTIVE_FINAL_COUNT:
                break
            if any(f"Source: [{card['evidence_id']}]" in old for old in accepted_blocks):
                continue

            qnum = len(accepted_blocks) + 1
            difficulty = "Hard" if qnum <= 3 else "Medium"
            raw_block = generate_one_subjective_candidate(card, qnum, difficulty, selected_model)
            error = subjective_candidate_error(raw_block, card, accepted_blocks)
            if error:
                rejected_notes.append(f"{card['evidence_id']}: {error}")
                continue

            accepted_blocks.append(normalize_subjective_block(raw_block, qnum, difficulty, card["evidence_id"]))

    if len(accepted_blocks) >= SUBJECTIVE_FINAL_COUNT:
        logger.info("Subjective V6 returned 5 validated questions")
        return "\n\n".join(accepted_blocks[:SUBJECTIVE_FINAL_COUNT])

    logger.warning(
        f"Subjective V6 generated only {len(accepted_blocks)}/5 validated questions. "
        f"Rejected: {rejected_notes[:6]}"
    )

    if accepted_blocks:
        return (
            f"Generated {len(accepted_blocks)}/5 validated subjective questions. "
            "The remaining candidates were rejected because they were memorization-only, unsupported, repeated, or badly formatted. "
            "Click Generate 5 Subjective again, or use a clearer PDF with richer evidence.\n\n"
            + "\n\n".join(accepted_blocks)
        )

    return (
        "The local model could not generate safe subjective questions from the retrieved evidence. "
        "Try again with qwen3:1.7b or llama3.2-3b-2k, or upload a clearer PDF."
    )


def summarize_bad_attempt_for_retry(data: Dict[str, Any], bad_numbers: set) -> str:
    """Build a compact retry note from the previous weak structured attempt."""
    try:
        data = coerce_mcq_json_shape(data)
        notes = []
        for q in data.get("questions", []):
            qid = q.get("id")
            if qid in bad_numbers:
                notes.append(f"Q{qid}: {q.get('question', '').strip()[:140]}")
        return "\n".join(notes[:5])
    except Exception:
        return ""



def generate_structured_mcq_quiz(context: str, user_request: str, selected_model: str) -> str:
    """Tournament-9 MCQ pipeline.

    Generate 9 structured candidates, validate them with deterministic NLP checks,
    then display only the best 5. This fixes the old fast path that returned the
    first 5 model blocks even when the structural checker had rejected some of them.
    """
    logger.info("Running Tournament-9 MCQ pipeline (structured candidates + deterministic validator)")

    best_data = {"questions": []}
    best_valid_count = 0
    retry_note = ""
    fallback_quiz = ""

    for attempt in range(1, MCQ_STRUCTURED_RETRIES + 1):
        request_for_attempt = user_request
        if retry_note:
            request_for_attempt += (
                "\n\nPrevious weak candidates to avoid:\n"
                f"{retry_note}\n"
                "Create different questions from other evidence chunks."
            )

        data = generate_mcq_json_once(context, request_for_attempt, selected_model)
        if not data:
            logger.warning(f"Tournament-9 attempt {attempt}: no structured JSON returned")
            if MCQ_ALLOW_FREE_TEXT_FALLBACK and not fallback_quiz:
                fallback_quiz = generate_fallback_mcq_text(context, user_request, selected_model)
            continue

        data, bad_numbers = validate_mcq_json_data(data, context=context)
        selected_data = select_valid_mcq_questions(data, bad_numbers, needed=MCQ_FINAL_COUNT)
        valid_count = len(selected_data.get("questions", []))
        logger.info(
            f"Tournament-9 attempt {attempt}: bad={sorted(bad_numbers)} valid_kept={valid_count}/{MCQ_FINAL_COUNT}"
        )

        if valid_count > best_valid_count:
            best_data = selected_data
            best_valid_count = valid_count

        if valid_count >= MCQ_FINAL_COUNT:
            logger.info("Tournament-9 returned 5 validated MCQs")
            return format_mcq_json_for_display(selected_data)

        retry_note = summarize_bad_attempt_for_retry(data, bad_numbers)

    # If structured JSON could not produce 5 valid questions, use the bounded free-text fallback.
    # This prevents the UI from showing "could not generate" when Ollama schema mode fails.
    if MCQ_ALLOW_FREE_TEXT_FALLBACK and fallback_quiz and len(split_mcq_blocks(fallback_quiz)) >= MCQ_FINAL_COUNT:
        logger.info("Returning free-text MCQ fallback after structured pipeline did not reach 5 valid questions")
        return fallback_quiz

    # Do not silently show known-bad MCQs. If there are 3-4 good questions,
    # show them with a clear message so the user can regenerate safely.
    if best_valid_count > 0:
        safe_quiz = format_mcq_json_for_display(best_data)
        return (
            f"Generated {best_valid_count}/5 safe MCQs. "
            "The remaining candidates were rejected because they were ambiguous, unsupported, or weak. "
            "Click Regenerate Quiz once to fill the missing questions.\n\n"
            f"{safe_quiz}"
        )

    if MCQ_ALLOW_FREE_TEXT_FALLBACK:
        logger.info("Running final MCQ fallback because structured pipeline found no valid candidates")
        return generate_fallback_mcq_text(context, user_request, selected_model)

    return (
        "The local model could not generate 5 safe MCQs from the retrieved evidence. "
        "Try Regenerate Quiz, or upload a clearer PDF with selectable text."
    )

def process_question_multi_pdf(
    question: str,
    pdfs_dict: Dict[str, Dict],
    selected_model: str
) -> Tuple[str, List[Dict]]:
    """Query across multiple PDFs with source attribution and MCQ review."""
    logger.info(f"Processing question across {len(pdfs_dict)} PDFs: {question}")

    # Keep this CPU-friendly for 8GB RAM machines.
    llm = ChatOllama(
        model=selected_model,
        temperature=0.1,
        num_ctx=MCQ_QUALITY_NUM_CTX,
        num_predict=MCQ_REPAIR_NUM_PREDICT,
    )

    q_lower = question.lower()
    is_subjective_request = (
        "subjective" in q_lower
        or "written" in q_lower
        or "short answer" in q_lower
        or "open-ended" in q_lower
        or "open ended" in q_lower
        or "essay" in q_lower
        or "expected answer:" in q_lower
        or "grading points:" in q_lower
        or "key points:" in q_lower
    )

    is_mcq_request = (not is_subjective_request) and (
        "mcq" in q_lower
        or "multiple choice" in q_lower
        or "multiple-choice" in q_lower
        or "mcqs" in q_lower
        or ("quiz" in q_lower and "expected answer" not in q_lower)
    )

    is_exam_generation_request = is_mcq_request or is_subjective_request

    # For generated quizzes, a broad concept query retrieves better source material than the long format prompt.
    retrieval_question = question
    if is_subjective_request:
        retrieval_question = (
            "explain compare analyze application limitation challenge process relationship "
            "difference cause effect method example consequence purpose result important concept"
        )
    elif is_mcq_request:
        retrieval_question = (
            "key concepts definitions examples applications challenges limitations "
            "methods tasks problems advantages disadvantages important ideas"
        )

    QUERY_PROMPT = PromptTemplate(
        input_variables=["question"],
        template="""Generate 2 short search queries to retrieve relevant PDF chunks.
Keep them concise and focused on concepts, definitions, examples, methods, limitations, or challenges.
Return each query on a new line.

Original question: {question}"""
    )

    all_retrieved_docs = []

    for pdf_id, pdf_data in pdfs_dict.items():
        vector_db = pdf_data["vector_db"]

        try:
            if is_exam_generation_request:
                # Combine three generic retrieval sources:
                # 1) semantic relevance, 2) keyword/category coverage, 3) whole-PDF coverage.
                retrieve_k = SUBJECTIVE_RETRIEVE_K if is_subjective_request else MCQ_RETRIEVE_K
                context_chunk_limit = SUBJECTIVE_CONTEXT_CHUNKS if is_subjective_request else MCQ_CONTEXT_CHUNKS

                semantic_docs = vector_db.similarity_search(retrieval_question, k=retrieve_k)
                keyword_docs = select_keyword_pdf_chunks(
                    pdf_data.get("chunks", []),
                    limit=retrieve_k
                )
                balanced_docs = select_balanced_pdf_chunks(
                    pdf_data.get("chunks", []),
                    limit=context_chunk_limit
                )

                docs = select_mixed_context_docs(
                    semantic_docs=semantic_docs,
                    keyword_docs=keyword_docs,
                    balanced_docs=balanced_docs,
                    limit=context_chunk_limit
                )

                # If a PDF summary exists, prepend it to the retrieved docs. This
                # ensures high‑level coverage of the entire document when only a
                # handful of chunks can be included. The summary is treated
                # like a normal chunk but uses page=-1 to indicate it's a
                # synthesized overview rather than a specific page.
                pdf_summary = pdf_data.get("summary")
                if pdf_summary and ADD_SUMMARY_TO_MCQ_CONTEXT:
                    summary_doc = Document(
                        page_content=pdf_summary,
                        metadata={
                            "pdf_name": pdf_data["name"],
                            "pdf_id": pdf_id,
                            "page": -1,
                            "chunk_index": -1,
                        },
                    )
                    # Insert the summary at the beginning only when explicitly enabled.
                    docs = [summary_doc] + docs

                logger.info(
                    f"Exam retrieval for {pdf_data['name']}: "
                    f"{len(semantic_docs)} semantic + {len(keyword_docs)} keyword/category + "
                    f"{len(balanced_docs)} balanced => final {len(docs)} context candidates; "
                    f"pages used: {summarize_doc_pages(docs)}"
                )
            else:
                retriever = MultiQueryRetriever.from_llm(
                    vector_db.as_retriever(search_kwargs={"k": 5}),
                    llm,
                    prompt=QUERY_PROMPT
                )
                docs = retriever.invoke(retrieval_question)

            logger.info(f"Retrieved {len(docs)} documents from {pdf_data['name']}")

            for doc in docs:
                if "pdf_name" not in doc.metadata:
                    doc.metadata["pdf_name"] = pdf_data["name"]
                if "pdf_id" not in doc.metadata:
                    doc.metadata["pdf_id"] = pdf_id

            all_retrieved_docs.extend(docs)

        except Exception as e:
            logger.warning(f"Error retrieving from {pdf_data['name']}: {e}")

    logger.info(f"Total documents retrieved: {len(all_retrieved_docs)}")

    if not all_retrieved_docs:
        return (
            "I could not retrieve relevant PDF chunks. Please delete and re-upload the PDF, then try again.",
            []
        )

    # Remove duplicate chunks using metadata, not the first 250 characters.
    # Many lecture PDFs repeat the same header, so content-prefix dedupe can collapse 10 chunks into 1.
    retrieve_limit = SUBJECTIVE_RETRIEVE_K if is_subjective_request else MCQ_RETRIEVE_K
    context_chunk_limit = SUBJECTIVE_CONTEXT_CHUNKS if is_subjective_request else MCQ_CONTEXT_CHUNKS

    unique_docs = merge_unique_docs(all_retrieved_docs, limit=retrieve_limit + context_chunk_limit)
    if is_exam_generation_request:
        unique_docs = select_diverse_context_docs(unique_docs, limit=context_chunk_limit)
        logger.info(
            f"Exam diverse context filter => {len(unique_docs)} chunks; pages used: {summarize_doc_pages(unique_docs)}"
        )

    # Keep context safe for local models, using diverse chunks for MCQ generation.
    context_parts = []
    used_context_docs = []
    total_chars = 0
    if is_subjective_request:
        max_context_chars = SUBJECTIVE_MAX_CONTEXT_CHARS
        max_context_chunks = SUBJECTIVE_CONTEXT_CHUNKS
        evidence_trim_chars = SUBJECTIVE_CHUNK_CHAR_LIMIT
    elif is_mcq_request:
        max_context_chars = MCQ_MAX_CONTEXT_CHARS
        max_context_chunks = MCQ_CONTEXT_CHUNKS
        evidence_trim_chars = MCQ_CHUNK_CHAR_LIMIT
    else:
        max_context_chars = GENERAL_MAX_CONTEXT_CHARS
        max_context_chunks = 8
        evidence_trim_chars = 900

    for doc in unique_docs:
        if len(context_parts) >= max_context_chunks:
            break

        source = doc.metadata.get("pdf_name", "Unknown")
        page = doc.metadata.get("page", None)
        chunk_index = doc.metadata.get("chunk_index", None)

        page_label = f", page {page + 1}" if isinstance(page, int) else ""
        chunk_label = f", chunk {chunk_index + 1}" if isinstance(chunk_index, int) else ""

        evidence_id = f"E{len(context_parts) + 1}"
        evidence_text = trim_evidence_text(
            doc.page_content.strip(),
            max_chars=evidence_trim_chars
        )
        part = f"[{evidence_id}] [Source: {source}{page_label}{chunk_label}]\n{evidence_text}\n"

        if total_chars + len(part) > max_context_chars and context_parts:
            break

        context_parts.append(part)
        used_context_docs.append(doc)
        total_chars += len(part)

    logger.info(
        f"Context built with {len(used_context_docs)} chunks and {total_chars} characters "
        f"(budget={max_context_chars}); pages used: {summarize_doc_pages(used_context_docs)}"
    )

    formatted_context = "\n---\n".join(context_parts)

    template = """You are a strict PDF-based exam generator and question-answering assistant.

Use ONLY the following evidence chunks.
Each chunk has an evidence ID like [E1] and a source/page/chunk label.

Context:
{context}

User request:
{question}

For MCQs, follow this evidence-first process silently:
1. Choose one clear evidence chunk for each question.
2. Decide the answer_text from that evidence only.
3. Write the question so answer_text is the only correct answer.
4. Create three plausible distractors that are NOT supported by that evidence.
5. Check that the selected letter matches answer_text.

Rules:
- Generate exam-style MCQs only when the user asks for MCQs/quiz.
- Do not use outside knowledge.
- Do not invent facts.
- Every correct answer must be directly supported by an evidence chunk.
- The correct option must match the explanation.
- Every question MUST include an Explanation line.
- Every explanation MUST mention the evidence ID like [E1] or a source/page.
- Never choose an answer that contradicts the explanation.
- Distractors must be plausible but clearly wrong.
- Avoid broad or vague questions.
- Keep explanations short but specific.
- Mention source/page when available.
- Never use All/None/Both/Neither of the above.
- Do not write phrases like "although not stated", "can be inferred", or "general knowledge".
- Do not repeat the same question idea twice.

Answer:"""

    prompt = ChatPromptTemplate.from_template(template)
    chain = (
        {"context": lambda x: formatted_context, "question": lambda x: x}
        | prompt
        | llm
        | StrOutputParser()
    )

    source_details = [
        {
            "pdf_name": doc.metadata.get("pdf_name"),
            "pdf_id": doc.metadata.get("pdf_id"),
            "chunk_index": doc.metadata.get("chunk_index", 0),
            "page": doc.metadata.get("page", None),
        }
        for doc in used_context_docs
    ]

    logger.info(f"MODE FLAGS: subjective={is_subjective_request}, mcq={is_mcq_request}")

    # Hard isolation: Subjective returns immediately, so MCQ Tournament/fallback
    # can never run after Generate 5 Subjective.
    if is_subjective_request:
        logger.info("Running subjective/written quiz pipeline")
        response = generate_subjective_quiz(formatted_context, question, selected_model)
        logger.info("Generated SUBJECTIVE response; returning before MCQ pipeline")
        return response, source_details

    if is_mcq_request:
        logger.info("Running guarded quality structured MCQ pipeline")
        response = generate_structured_mcq_quiz(formatted_context, question, selected_model)
        logger.info("Generated MCQ response")
        return response, source_details

    response = chain.invoke(question)
    logger.info("Generated normal response with source attribution")
    return response, source_details

def process_question(question: str, vector_db: Chroma, selected_model: str) -> str:
    """
    Process a user question using the vector database and selected language model.

    Args:
        question (str): The user's question.
        vector_db (Chroma): The vector database containing document embeddings.
        selected_model (str): The name of the selected language model.

    Returns:
        str: The generated response to the user's question.
    """
    logger.info(f"Processing question: {question} using model: {selected_model}")

    # Initialize LLM
    llm = ChatOllama(model=selected_model)

    # Query prompt template
    QUERY_PROMPT = PromptTemplate(
        input_variables=["question"],
        template="""You are an AI language model assistant. Your task is to generate 2
        different versions of the given user question to retrieve relevant documents from
        a vector database. By generating multiple perspectives on the user question, your
        goal is to help the user overcome some of the limitations of the distance-based
        similarity search. Provide these alternative questions separated by newlines.
        Original question: {question}""",
    )

    # Set up retriever
    retriever = MultiQueryRetriever.from_llm(
        vector_db.as_retriever(),
        llm,
        prompt=QUERY_PROMPT
    )

    # RAG prompt template
    template = """Answer the question based ONLY on the following context:
    {context}
    Question: {question}
    """

    prompt = ChatPromptTemplate.from_template(template)

    # Create chain
    chain = (
        {"context": retriever, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )

    response = chain.invoke(question)
    logger.info("Question processed and response generated")
    return response



