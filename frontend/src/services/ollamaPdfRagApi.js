const API_BASE = "http://127.0.0.1:8000/api";

export async function uploadPdfToRag(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/ollama-rag/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("PDF upload failed");
  }

  return response.json();
}
const API_BASE = "http://127.0.0.1:8000/api";

export async function uploadPdfToRag(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/ollama-rag/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("PDF upload failed");
  }

  return response.json();
}

export async function generateRagMcq(pdfId) {
  const response = await fetch(`${API_BASE}/ollama-rag/quiz/mcq`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pdf_id: pdfId,
      model: "llama3.2:3b",
    }),
  });

  if (!response.ok) {
    throw new Error("Quiz generation failed");
  }

  return response.json();
}
export async function generateRagMcq(pdfId) {
  const response = await fetch(`${API_BASE}/ollama-rag/quiz/mcq`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pdf_id: pdfId,
      model: "llama3.2:3b",
    }),
  });

  if (!response.ok) {
    throw new Error("Quiz generation failed");
  }

  return response.json();
}