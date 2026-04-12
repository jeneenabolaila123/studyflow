import re
import fitz
import pdfplumber
import nltk
import pytesseract
import requests
from pdf2image import convert_from_path
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np

nltk.download("punkt", quiet=True)
nltk.download("punkt_tab", quiet=True)

# Windows Tesseract path
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


class PDFSummaryGenerator:
    def __init__(self, max_sentences=8, use_ocr=True):
        self.max_sentences = max_sentences
        self.use_ocr = use_ocr

    def extract_text_pymupdf(self, pdf_path):
        text_parts = []
        doc = fitz.open(pdf_path)
        try:
            for page in doc:
                text = page.get_text("text")
                if text and text.strip():
                    text_parts.append(text)
        finally:
            doc.close()
        return "\n".join(text_parts).strip()

    def extract_text_pdfplumber(self, pdf_path):
        text_parts = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text and text.strip():
                    text_parts.append(text)
        return "\n".join(text_parts).strip()

    def extract_text_ocr(self, pdf_path):
        images = convert_from_path(pdf_path, dpi=200)
        text_parts = []

        for image in images:
            text = pytesseract.image_to_string(image)
            if text and text.strip():
                text_parts.append(text)

        return "\n".join(text_parts).strip()

    def extract_text(self, pdf_path):
        text = self.extract_text_pymupdf(pdf_path)
        if len(text) > 300:
            return text

        text = self.extract_text_pdfplumber(pdf_path)
        if len(text) > 300:
            return text

        if self.use_ocr:
            text = self.extract_text_ocr(pdf_path)
            return text

        return ""

    def clean_text(self, text):
        lines = [line.strip() for line in text.splitlines()]
        lines = [line for line in lines if line]

        line_counts = Counter(lines)
        lines = [line for line in lines if line_counts[line] < 4]

        text = "\n".join(lines)

        text = re.sub(r'\bPage\s+\d+\b', ' ', text, flags=re.IGNORECASE)
        text = re.sub(r'\b\d+\s*/\s*\d+\b', ' ', text)
        text = re.sub(r'\n\s*\d+\s*\n', '\n', text)

        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{2,}', '\n', text)

        return text.strip()

    def split_sentences(self, text):
        sentences = nltk.sent_tokenize(text)
        cleaned_sentences = []

        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) < 30:
                continue
            if len(sentence.split()) < 6:
                continue
            cleaned_sentences.append(sentence)

        return cleaned_sentences

    def rank_sentences_tfidf(self, sentences):
        if not sentences:
            return np.array([])

        vectorizer = TfidfVectorizer(stop_words="english")
        tfidf_matrix = vectorizer.fit_transform(sentences)
        scores = np.asarray(tfidf_matrix.sum(axis=1)).ravel()

        for i, sentence in enumerate(sentences):
            if i < 3:
                scores[i] += 0.15
            if re.search(r'\b(important|significant|in conclusion|overall|therefore|summary)\b', sentence, re.IGNORECASE):
                scores[i] += 0.30

        return scores

    def remove_similar_sentences(self, sentences, scores, similarity_threshold=0.75):
        if len(sentences) <= 1:
            return sentences, scores

        ranked_items = sorted(
            zip(sentences, scores, range(len(sentences))),
            key=lambda x: x[1],
            reverse=True
        )

        selected = []

        def jaccard_similarity(a, b):
            a_words = set(re.findall(r'\w+', a.lower()))
            b_words = set(re.findall(r'\w+', b.lower()))
            if not a_words or not b_words:
                return 0.0
            return len(a_words & b_words) / len(a_words | b_words)

        for sentence, score, original_index in ranked_items:
            is_duplicate = False

            for selected_sentence, _, _ in selected:
                if jaccard_similarity(sentence, selected_sentence) >= similarity_threshold:
                    is_duplicate = True
                    break

            if not is_duplicate:
                selected.append((sentence, score, original_index))

        selected.sort(key=lambda x: x[2])

        final_sentences = [item[0] for item in selected]
        final_scores = np.array([item[1] for item in selected])

        return final_sentences, final_scores

    def summarize_text(self, text):
        text = self.clean_text(text)
        sentences = self.split_sentences(text)

        if not sentences:
            return "No useful text found for summarization."

        scores = self.rank_sentences_tfidf(sentences)
        if scores.size == 0:
            return "No useful text found for summarization."

        filtered_sentences, filtered_scores = self.remove_similar_sentences(sentences, scores)

        if len(filtered_sentences) <= self.max_sentences:
            return " ".join(filtered_sentences)

        top_indices = np.argsort(filtered_scores)[::-1][:self.max_sentences]
        top_indices = sorted(top_indices)

        summary_sentences = [filtered_sentences[i] for i in top_indices]
        return " ".join(summary_sentences).strip()

    def generate_summary(self, pdf_path):
        raw_text = self.extract_text(pdf_path)

        if not raw_text or len(raw_text.strip()) < 50:
            return {
                "success": False,
                "summary": "",
                "message": "Could not extract enough text from the PDF."
            }

        cleaned_text = self.clean_text(raw_text)
        summary = self.summarize_text(cleaned_text)

        return {
            "success": True,
            "summary": summary,
            "message": "Summary generated successfully.",
            "raw_text_length": len(raw_text),
            "cleaned_text_length": len(cleaned_text)
        }


def rewrite_summary(summary_text):
    prompt = f"""
Rewrite the following summary in a clean, structured, academic way.

Rules:
- no repetition
- clear sentences
- keep only important ideas
- make it easy to read

Summary:
{summary_text}
"""

    response = requests.post(
        "http://127.0.0.1:11434/api/generate",
        json={
            "model": "qwen3:1.7b",
            "prompt": prompt,
            "stream": False
        },
        timeout=120
    )

    response.raise_for_status()
    return response.json()["response"].strip()


if __name__ == "__main__":
    pdf_path = r"C:\Users\obaid\Desktop\Flowers.pdf"    
    generator = PDFSummaryGenerator(max_sentences=5, use_ocr=False)
    print("=" * 70)
    print(result["message"])
    print("=" * 70)

    if result["success"]:
        print("SUMMARY:\n")         
        print(result["summary"])
        print("\n" + "=" * 70)
        print(f"Raw text length: {result['raw_text_length']}")
        print(f"Cleaned text length: {result['cleaned_text_length']}")
    else:
        print("No summary generated.")