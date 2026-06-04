"""
FastAPI wrapper for Rana's ORIGINAL Streamlit subjective RAG engine.

Important:
- The original Streamlit file is NOT edited.
- This API imports the original engine and reuses its subjective pipeline.
- StudyFlow should call this API through Laravel/React, not open Streamlit pages.
"""

from __future__ import annotations

import hashlib
import io
import importlib.util
import logging
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

import pdfplumber
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logger = logging.getLogger("studyflow-subjective-api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

APP_DIR = Path(__file__).resolve().parent
SERVICE_DIR = APP_DIR.parent
ENGINE_PATH = SERVICE_DIR / "original_streamlit_rag_subjective_grounded_v2.py"
DATA_DIR = SERVICE_DIR / "data"
PERSIST_DIRECTORY = DATA_DIR / "vectors"
TEMP_UPLOAD_DIR = DATA_DIR / "tmp_uploads"

DEFAULT_MODEL = os.getenv("SUBJECTIVE_MODEL", "llama3.2:3b")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")

# Same subjective prompt used in the Streamlit UI.
SUBJECTIVE_PROMPT = """Generate exactly 5 high-quality subjective/written questions from the uploaded PDF.

Difficulty:
- Q1, Q2, Q3 must be Hard.
- Q4, Q5 must be Medium.

Quality target:
- The quiz should feel like an exam made by a strong professor.
- Use reasoning questions only: explain, compare, analyze, apply, connect, evaluate, process, limitation, or cause-effect.
- Do not generate memorization-only questions.

Forbidden weak stems:
- Do not ask: main reason, main purpose, primary aim, primary purpose, first level, define, list, what is one, common applications, one important use.
- Do not write grading scores like 9/10 or 8/10.

Evidence-first rules:
- Use only the provided PDF evidence chunks.
- Every expected answer and key point must be directly supported by the cited evidence.
- Do not use outside knowledge.
- Do not copy long sentences from the PDF.
- Use different evidence chunks when possible.

Format:
Q1 (Hard): ...
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
Source: [E...]

Repeat until Q5."""


def load_original_engine():
    """Import Rana's original Streamlit file without changing it."""
    if not ENGINE_PATH.exists():
        raise FileNotFoundError(f"Original engine file not found: {ENGINE_PATH}")

    spec = importlib.util.spec_from_file_location("original_subjective_engine", ENGINE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load original Streamlit engine module")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module


engine = load_original_engine()


def safe_rmtree(path: Path) -> None:
    try:
        if path.exists():
            if path.is_dir():
                shutil.rmtree(path, ignore_errors=True)
            else:
                path.unlink(missing_ok=True)
    except Exception as exc:
        logger.warning("Cleanup skipped for %s: %s", path, exc)


def ensure_runtime_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    TEMP_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    PERSIST_DIRECTORY.mkdir(parents=True, exist_ok=True)


def reset_runtime_storage() -> None:
    """Keep local dev storage small, like the Streamlit version."""
    safe_rmtree(TEMP_UPLOAD_DIR)
    safe_rmtree(PERSIST_DIRECTORY)
    ensure_runtime_dirs()


class UploadLike:
    """Small object that behaves like Streamlit UploadedFile for original helpers."""

    def __init__(self, name: str, data: bytes):
        self.name = name
        self._data = data

    def getvalue(self) -> bytes:
        return self._data


PDF_STORE: Dict[str, Dict[str, Any]] = {}


class GenerateSubjectiveRequest(BaseModel):
    pdf_id: Optional[str] = None
    model: str = DEFAULT_MODEL
    prompt: str = SUBJECTIVE_PROMPT


def generate_pdf_id(filename: str, data: bytes) -> str:
    digest = hashlib.md5(data).hexdigest()[:16]
    safe_name = "".join(ch if ch.isalnum() else "_" for ch in filename.lower())[:40]
    return f"pdf_{safe_name}_{digest}"


def write_upload_to_temp_pdf(filename: str, data: bytes, pdf_id: str) -> Path:
    ensure_runtime_dirs()
    safe_name = "".join(ch if ch.isalnum() or ch in ("-", "_", ".") else "_" for ch in filename)
    if not safe_name.lower().endswith(".pdf"):
        safe_name += ".pdf"

    temp_path = (TEMP_UPLOAD_DIR / f"{pdf_id}_{safe_name}").resolve()
    temp_path.write_bytes(data)

    if not temp_path.exists() or temp_path.stat().st_size == 0:
        raise FileNotFoundError(f"Temporary PDF was not written correctly: {temp_path}")

    return temp_path


def delete_pdf_from_memory(pdf_id: str) -> None:
    pdf_data = PDF_STORE.pop(pdf_id, None)
    if not pdf_data:
        return

    vector_db = pdf_data.get("vector_db")
    if vector_db is not None:
        try:
            vector_db.delete_collection()
        except Exception as exc:
            logger.warning("Could not delete Chroma collection for %s: %s", pdf_id, exc)


def process_pdf_bytes(filename: str, data: bytes) -> Dict[str, Any]:
    """Build the same pdf_data shape expected by process_question_multi_pdf()."""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Please upload a PDF file.")

    pdf_id = generate_pdf_id(filename, data)

    # Avoid duplicated Chroma chunks when the same PDF is uploaded again.
    delete_pdf_from_memory(pdf_id)

    temp_path = write_upload_to_temp_pdf(filename, data, pdf_id)

    try:
        loader = engine.PyPDFLoader(str(temp_path))
        documents = loader.load()

        has_text = any(getattr(doc, "page_content", "").strip() for doc in documents)
        if not has_text:
            logger.info("No selectable text found. Trying OCR fallback for %s", filename)
            try:
                import pytesseract

                with pdfplumber.open(str(temp_path)) as pdf:
                    for i, page in enumerate(pdf.pages):
                        img = page.to_image(resolution=200).original
                        text = pytesseract.image_to_string(img)
                        if text.strip():
                            if i < len(documents):
                                documents[i].page_content = text
                            else:
                                documents.append(
                                    engine.Document(
                                        page_content=text,
                                        metadata={"source": str(temp_path), "page": i},
                                    )
                                )
            except Exception as exc:
                logger.warning("OCR fallback failed for %s: %s", filename, exc)

        splitter = engine.RecursiveCharacterTextSplitter(chunk_size=700, chunk_overlap=100)
        chunks = splitter.split_documents(documents)
        valid_chunks = [chunk for chunk in chunks if getattr(chunk, "page_content", "").strip()]

        if not valid_chunks:
            raise HTTPException(
                status_code=422,
                detail="Could not extract readable text from this PDF. Try a selectable-text PDF or install OCR.",
            )

        pdf_summary = None
        try:
            pdf_summary = engine.generate_pdf_summary(valid_chunks, model=engine.SUMMARY_MODEL, max_chars=2000)
        except Exception as exc:
            logger.warning("Fast extractive summary skipped for %s: %s", filename, exc)

        for i, chunk in enumerate(valid_chunks):
            chunk.metadata.update(
                {
                    "pdf_id": pdf_id,
                    "pdf_name": filename,
                    "chunk_index": i,
                    "source_file": filename,
                }
            )

        embeddings = engine.OllamaEmbeddings(model="nomic-embed-text:latest", base_url=OLLAMA_BASE_URL)
        vector_db = engine.Chroma.from_documents(
            documents=valid_chunks,
            embedding=embeddings,
            persist_directory=str(PERSIST_DIRECTORY),
            collection_name=pdf_id,
        )

        page_count = None
        try:
            with pdfplumber.open(io.BytesIO(data)) as pdf:
                page_count = len(pdf.pages)
        except Exception:
            page_count = None

        pdf_data = {
            "name": filename,
            "vector_db": vector_db,
            "pages": [],
            "collection_name": pdf_id,
            "upload_timestamp": datetime.now(),
            "doc_count": len(valid_chunks),
            "chunks": valid_chunks,
            "is_sample": False,
            "summary": pdf_summary,
            "page_count": page_count,
        }

        PDF_STORE[pdf_id] = pdf_data
        logger.info("PDF %s stored as %s with %s chunks", filename, pdf_id, len(valid_chunks))

        return {
            "pdf_id": pdf_id,
            "name": filename,
            "chunks": len(valid_chunks),
            "pages": page_count,
        }

    finally:
        safe_rmtree(temp_path)


def latest_pdf_id() -> Optional[str]:
    if not PDF_STORE:
        return None
    return max(PDF_STORE.items(), key=lambda item: item[1].get("upload_timestamp"))[0]


def generate_subjective_for_pdf(pdf_id: Optional[str], model: str, prompt: str) -> Dict[str, Any]:
    selected_pdf_id = pdf_id or latest_pdf_id()
    if not selected_pdf_id or selected_pdf_id not in PDF_STORE:
        raise HTTPException(status_code=404, detail="No uploaded PDF found. Upload a PDF first.")

    pdfs_dict = {selected_pdf_id: PDF_STORE[selected_pdf_id]}

    # The original Streamlit engine detects subjective mode from this prompt and
    # runs generate_subjective_quiz(), then returns immediately before MCQ logic.
    quiz_text, sources = engine.process_question_multi_pdf(prompt, pdfs_dict, model)

    return {
        "ok": True,
        "pdf_id": selected_pdf_id,
        "model": model,
        "type": "subjective",
        "quiz": quiz_text,
        "sources": sources,
    }


app = FastAPI(title="StudyFlow Subjective RAG API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:8000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    # Same idea as the Streamlit cleanup: keep the test machine from filling up.
    reset_runtime_storage()


@app.get("/")
def root() -> Dict[str, Any]:
    return {"ok": True, "service": "studyflow-subjective-api", "model": DEFAULT_MODEL}


@app.get("/api/v1/health")
def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "service": "studyflow-subjective-api",
        "model": DEFAULT_MODEL,
        "uploaded_pdfs": len(PDF_STORE),
        "engine_file": str(ENGINE_PATH.name),
    }


@app.post("/api/v1/pdfs/upload")
async def upload_pdf(file: UploadFile = File(...)) -> Dict[str, Any]:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")
    return {"ok": True, **process_pdf_bytes(file.filename or "uploaded.pdf", data)}


@app.post("/api/v1/subjective/generate")
def generate_subjective(request: GenerateSubjectiveRequest) -> Dict[str, Any]:
    return generate_subjective_for_pdf(request.pdf_id, request.model, request.prompt)


@app.post("/api/v1/subjective/file")
async def upload_and_generate_subjective(
    file: UploadFile = File(...),
    model: str = Form(DEFAULT_MODEL),
    prompt: str = Form(SUBJECTIVE_PROMPT),
) -> Dict[str, Any]:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")

    upload_info = process_pdf_bytes(file.filename or "uploaded.pdf", data)
    result = generate_subjective_for_pdf(upload_info["pdf_id"], model, prompt)
    result["upload"] = upload_info
    return result


@app.delete("/api/v1/pdfs/{pdf_id}")
def delete_pdf(pdf_id: str) -> Dict[str, Any]:
    if pdf_id not in PDF_STORE:
        raise HTTPException(status_code=404, detail="PDF not found.")
    delete_pdf_from_memory(pdf_id)
    return {"ok": True, "deleted": pdf_id}


@app.delete("/api/v1/pdfs")
def delete_all_pdfs() -> Dict[str, Any]:
    for existing_pdf_id in list(PDF_STORE.keys()):
        delete_pdf_from_memory(existing_pdf_id)
    reset_runtime_storage()
    return {"ok": True, "deleted_all": True}
