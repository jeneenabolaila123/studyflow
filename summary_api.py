from fastapi import FastAPI, UploadFile, File
import shutil
from pdf_summary import PDFSummaryGenerator

app = FastAPI()

generator = PDFSummaryGenerator(max_sentences=5, use_ocr=False)

@app.post("/summarize")
async def summarize_pdf(file: UploadFile = File(...)):
    file_path = f"temp_{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = generator.generate_summary(file_path)

    return {
        "success": result["success"],
        "summary": result["summary"]
    }