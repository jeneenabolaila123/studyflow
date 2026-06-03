from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from typing import Dict, Any
import hashlib
import logging
import shutil
import sys
import types
import importlib.machinery


ROOT_DIR = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT_DIR / "src"

if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))


# ---------------------------------------------------------------------
# IMPORTANT:
# api/main.py must be FastAPI.
# src/app/main.py stays the ORIGINAL Streamlit file.
#
# This tiny Streamlit stub lets FastAPI import the original src/app/main.py
# without needing Streamlit to run as a UI.
# ---------------------------------------------------------------------
class _SessionState(dict):
    def __getattr__(self, key):
        try:
            return self[key]
        except KeyError:
            raise AttributeError(key)

    def __setattr__(self, key, value):
        self[key] = value


class _NoOp:
    def __call__(self, *args, **kwargs):
        return None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def __iter__(self):
        return iter(())

    def __bool__(self):
        return False

    def __getattr__(self, name):
        return self


class _FakeStreamlit(types.ModuleType):
    def __init__(self):
        super().__init__("streamlit")

        # Important for libraries that inspect sys.modules.
        # Without a real string __file__, torch/inspect can crash.
        self.__file__ = str(ROOT_DIR / "_streamlit_stub.py")
        self.__package__ = "streamlit"
        self.__spec__ = importlib.machinery.ModuleSpec("streamlit", loader=None)

        self.session_state = _SessionState()
        self.sidebar = _NoOp()

    def set_page_config(self, *args, **kwargs):
        return None

    def cache_data(self, *args, **kwargs):
        def decorator(func):
            return func

        if args and callable(args[0]) and len(args) == 1 and not kwargs:
            return args[0]

        return decorator

    def cache_resource(self, *args, **kwargs):
        return self.cache_data(*args, **kwargs)

    def columns(self, spec, *args, **kwargs):
        try:
            count = len(spec)
        except TypeError:
            count = int(spec)
        return [_NoOp() for _ in range(count)]

    def tabs(self, labels, *args, **kwargs):
        return [_NoOp() for _ in labels]

    def expander(self, *args, **kwargs):
        return _NoOp()

    def spinner(self, *args, **kwargs):
        return _NoOp()

    def form(self, *args, **kwargs):
        return _NoOp()

    def container(self, *args, **kwargs):
        return _NoOp()

    def empty(self, *args, **kwargs):
        return _NoOp()

    def file_uploader(self, *args, **kwargs):
        return None

    def button(self, *args, **kwargs):
        return False

    def checkbox(self, *args, **kwargs):
        return False

    def toggle(self, *args, **kwargs):
        return False

    def selectbox(self, label, options=None, *args, **kwargs):
        if options:
            return list(options)[0]
        return None

    def radio(self, label, options=None, *args, **kwargs):
        if options:
            return list(options)[0]
        return None

    def text_input(self, *args, **kwargs):
        return ""

    def text_area(self, *args, **kwargs):
        return ""

    def slider(self, *args, **kwargs):
        return kwargs.get("value", 0)

    def number_input(self, *args, **kwargs):
        return kwargs.get("value", 0)

    def __getattr__(self, name):
        return _NoOp()


# Force app.main to import the fake streamlit module.
sys.modules["streamlit"] = _FakeStreamlit()


from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document

# Import the ORIGINAL Subjective V6 logic from src/app/main.py.
from app.main import (
    process_question_multi_pdf,
    generate_pdf_summary,
    SUMMARY_MODEL,
)


logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


app = FastAPI(title="StudyFlow Subjective PDF RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DATA_DIR = ROOT_DIR / "data"
PERSIST_DIRECTORY = DATA_DIR / "vectors"
TEMP_UPLOAD_DIR = DATA_DIR / "tmp_uploads"

DATA_DIR.mkdir(parents=True, exist_ok=True)
PERSIST_DIRECTORY.mkdir(parents=True, exist_ok=True)
TEMP_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

PDF_STORE: Dict[str, Dict[str, Any]] = {}


SUBJECTIVE_PROMPT = """Generate exactly 5 high-quality subjective/written questions from the uploaded PDF.

This is a subjective written quiz.

Requirements:
- Q1, Q2, Q3 must be Hard.
- Q4, Q5 must be Medium.
- Use only PDF content.
- Do not use outside knowledge.
- Do not ask memorization-only questions.
- Prefer explain, compare, analyze, apply, connect, evaluate, process, limitation, or cause-effect questions.
- Avoid define/list/what is/main purpose/primary aim/how many questions.
- Each question must include expected answer, key points, grading points, and source evidence.
- Use evidence-based answers only.

Generate exactly 5 subjective questions."""


class QuizRequest(BaseModel):
    pdf_id: str | None = None
    model: str = "llama3.2:3b"


class AskRequest(BaseModel):
    question: str
    pdf_id: str | None = None
    model: str = "llama3.2:3b"


def generate_pdf_id(file_bytes: bytes, filename: str) -> str:
    digest = hashlib.md5(file_bytes).hexdigest()[:16]
    safe_name = "".join(ch if ch.isalnum() else "_" for ch in filename.lower())[:40]
    return f"pdf_{safe_name}_{digest}"


def safe_filename(filename: str) -> str:
    cleaned = "".join(
        ch if ch.isalnum() or ch in ("-", "_", ".") else "_"
        for ch in filename
    )
    return cleaned or "uploaded.pdf"


def get_selected_pdfs(pdf_id: str | None):
    logger.info("Requested pdf_id=%s available=%s", pdf_id, list(PDF_STORE.keys()))

    if not PDF_STORE:
        raise HTTPException(
            status_code=400,
            detail="No PDFs uploaded yet. Please upload a PDF before generating a subjective quiz.",
        )

    if pdf_id and pdf_id in PDF_STORE:
        return {pdf_id: PDF_STORE[pdf_id]}

    if len(PDF_STORE) == 1:
        only_pdf_id = next(iter(PDF_STORE))
        logger.info("Using only available PDF fallback: %s", only_pdf_id)
        return {only_pdf_id: PDF_STORE[only_pdf_id]}

    raise HTTPException(
        status_code=404,
        detail={
            "message": "PDF not found. Please upload the PDF again.",
            "sent_pdf_id": pdf_id,
            "available_pdf_ids": list(PDF_STORE.keys()),
        },
    )


def load_pdf_with_optional_ocr(temp_path: Path):
    loader = PyPDFLoader(str(temp_path))
    pages = loader.load()

    has_text = any((page.page_content or "").strip() for page in pages)
    if has_text:
        return pages

    logger.info("No text extracted by PyPDFLoader. Trying OCR fallback.")

    try:
        import pdfplumber
        import pytesseract

        ocr_pages = []
        with pdfplumber.open(str(temp_path)) as pdf:
            for i, page in enumerate(pdf.pages):
                image = page.to_image(resolution=200).original
                text = pytesseract.image_to_string(image)

                if text.strip():
                    ocr_pages.append(
                        Document(
                            page_content=text,
                            metadata={"source": str(temp_path), "page": i},
                        )
                    )

        if ocr_pages:
            return ocr_pages

    except Exception as exc:
        logger.warning("OCR fallback failed: %s", exc)

    return pages


def delete_pdf_from_store(pdf_id: str) -> bool:
    pdf_data = PDF_STORE.get(pdf_id)

    if not pdf_data:
        return False

    try:
        vector_db = pdf_data.get("vector_db")
        if vector_db is not None:
            vector_db.delete_collection()
    except Exception as exc:
        logger.warning("Could not delete Chroma collection: %s", exc)

    PDF_STORE.pop(pdf_id, None)
    return True


@app.get("/")
def root():
    return {
        "ok": True,
        "service": "StudyFlow Subjective PDF RAG API",
    }


@app.get("/api/v1/health")
def health():
    return {
        "ok": True,
        "service": "studyflow_subjective_original_logic",
        "total_pdfs": len(PDF_STORE),
        "available_pdf_ids": list(PDF_STORE.keys()),
    }


@app.get("/api/v1/pdfs")
def list_pdfs():
    return {
        "ok": True,
        "pdfs": [
            {
                "pdf_id": pdf_id,
                "filename": data.get("name"),
                "chunks": data.get("doc_count", 0),
            }
            for pdf_id, data in PDF_STORE.items()
        ],
    }


@app.post("/api/v1/pdfs/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty PDF file.")

    pdf_id = generate_pdf_id(file_bytes, file.filename)
    temp_path = TEMP_UPLOAD_DIR / f"{pdf_id}_{safe_filename(file.filename)}"

    logger.info("Uploading PDF: filename=%s pdf_id=%s", file.filename, pdf_id)

    try:
        with open(temp_path, "wb") as f:
            f.write(file_bytes)
            f.flush()

        pages = load_pdf_with_optional_ocr(temp_path)

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=700,
            chunk_overlap=100,
        )

        chunks = text_splitter.split_documents(pages)
        chunks = [chunk for chunk in chunks if chunk.page_content and chunk.page_content.strip()]

        if not chunks:
            raise HTTPException(
                status_code=400,
                detail="Could not extract readable text from this PDF.",
            )

        for i, chunk in enumerate(chunks):
            chunk.metadata.update(
                {
                    "pdf_id": pdf_id,
                    "pdf_name": file.filename,
                    "chunk_index": i,
                    "source_file": file.filename,
                }
            )

        if pdf_id in PDF_STORE:
            delete_pdf_from_store(pdf_id)

        embeddings = OllamaEmbeddings(
            model="nomic-embed-text:latest",
            base_url="http://127.0.0.1:11434",
        )

        collection_name = f"api_{pdf_id}"

        vector_db = Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
            persist_directory=str(PERSIST_DIRECTORY),
            collection_name=collection_name,
        )

        pdf_summary = None
        try:
            pdf_summary = generate_pdf_summary(
                chunks,
                model=SUMMARY_MODEL,
                max_chars=2000,
            )
        except Exception as exc:
            logger.warning("PDF summary skipped: %s", exc)

        PDF_STORE[pdf_id] = {
            "name": file.filename,
            "vector_db": vector_db,
            "collection_name": collection_name,
            "doc_count": len(chunks),
            "chunks": chunks,
            "summary": pdf_summary,
        }

        logger.info("PDF uploaded successfully: pdf_id=%s chunks=%s", pdf_id, len(chunks))

        return {
            "ok": True,
            "pdf_id": pdf_id,
            "filename": file.filename,
            "chunks": len(chunks),
        }

    finally:
        try:
            temp_path.unlink(missing_ok=True)
        except Exception:
            pass


@app.post("/api/v1/quiz/subjective")
def generate_subjective_quiz(req: QuizRequest):
    selected_pdfs = get_selected_pdfs(req.pdf_id)

    logger.info("Generating subjective quiz with original logic.")

    response, sources = process_question_multi_pdf(
        SUBJECTIVE_PROMPT,
        selected_pdfs,
        req.model,
    )

    return {
        "ok": True,
        "quiz_type": "subjective",
        "quiz": response,
        "sources": sources,
    }


@app.post("/api/v1/query")
def ask_pdf(req: AskRequest):
    selected_pdfs = get_selected_pdfs(req.pdf_id)

    response, sources = process_question_multi_pdf(
        req.question,
        selected_pdfs,
        req.model,
    )

    return {
        "ok": True,
        "answer": response,
        "sources": sources,
    }


@app.delete("/api/v1/pdfs/{pdf_id}")
def delete_pdf(pdf_id: str):
    deleted = delete_pdf_from_store(pdf_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="PDF not found.")

    return {
        "ok": True,
        "deleted_pdf_id": pdf_id,
    }


@app.delete("/api/v1/pdfs")
def delete_all_pdfs():
    for pdf_id in list(PDF_STORE.keys()):
        delete_pdf_from_store(pdf_id)

    try:
        shutil.rmtree(PERSIST_DIRECTORY, ignore_errors=True)
        PERSIST_DIRECTORY.mkdir(parents=True, exist_ok=True)
    except Exception as exc:
        logger.warning("Could not reset vector folder: %s", exc)

    return {
        "ok": True,
        "message": "Deleted all PDFs and cleaned vector storage.",
    }
