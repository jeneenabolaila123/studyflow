import { useState } from "react";

const SUBJECTIVE_API_URL = "http://127.0.0.1:8000/api/local-ai/subjective/file";
const SUBJECTIVE_TIMEOUT_MS = 15 * 60 * 1000;

export default function SubjectiveQuizBox({ selectedFile }) {
  const [localFile, setLocalFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready to generate subjective questions.");

  const fileToUse = selectedFile || localFile;

  const generateSubjectiveQuiz = async () => {
    if (loading) return;

    if (!fileToUse) {
      setError("Please choose or upload a PDF first.");
      return;
    }

    setLoading(true);
    setError("");
    setQuiz("");
    setStatus("Generating 5 subjective questions. This may take several minutes...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, SUBJECTIVE_TIMEOUT_MS);

    try {
      const formData = new FormData();
      formData.append("file", fileToUse);
      formData.append("model", "llama3.2:3b");

      const response = await fetch(SUBJECTIVE_API_URL, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { ok: false, message: responseText };
      }

      if (!response.ok || data?.ok === false) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Subjective generation failed with status ${response.status}.`
        );
      }

      const generatedQuiz =
        data.quiz ||
        data.answer ||
        data.text ||
        data.output ||
        data.generated_quiz ||
        "";

      if (!generatedQuiz.trim()) {
        throw new Error("Subjective API returned an empty quiz.");
      }

      setQuiz(generatedQuiz);
      setStatus("Subjective quiz generated successfully.");
    } catch (err) {
      if (err?.name === "AbortError") {
        setError("Subjective generation timed out. Try a smaller PDF or wait less requests at once.");
        setStatus("Subjective generation timed out.");
      } else {
        setError(err?.message || "Failed to generate subjective quiz.");
        setStatus("Failed to generate subjective quiz.");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="subjective-box">
      <h2 className="subjective-title">Generate Subjective Quiz</h2>

      <p className="subjective-subtitle">
        {fileToUse
          ? `Selected PDF: ${fileToUse.name}`
          : "Upload a PDF above or choose one here."}
      </p>

      {!selectedFile && (
        <input
          className="subjective-file-input"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => {
            setLocalFile(e.target.files?.[0] || null);
            setQuiz("");
            setError("");
          }}
        />
      )}

      <button
        className="subjective-generate-btn"
        type="button"
        onClick={generateSubjectiveQuiz}
        disabled={loading || !fileToUse}
      >
        {loading ? "Generating Subjective Questions..." : "Generate 5 Subjective Questions"}
      </button>

      <div className="subjective-status">{status}</div>

      {error && <div className="subjective-error">{error}</div>}

      {quiz && (
        <div className="subjective-result">
          <pre>{quiz}</pre>
        </div>
      )}

      <style>{`
        .subjective-box {
          border: 1px solid #e5e7eb;
          background: #ffffff;
          border-radius: 14px;
          padding: 18px;
          margin-bottom: 18px;
        }

        .subjective-title {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 800;
          color: #111827;
        }

        .subjective-subtitle {
          margin: 0 0 14px;
          color: #475569;
          font-size: 14px;
          line-height: 1.5;
        }

        .subjective-file-input {
          width: 100%;
          margin-bottom: 14px;
        }

        .subjective-generate-btn {
          border: none;
          background: #111827;
          color: #ffffff;
          border-radius: 10px;
          padding: 12px 16px;
          font-weight: 800;
          cursor: pointer;
        }

        .subjective-generate-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .subjective-status {
          margin-top: 12px;
          color: #64748b;
          font-size: 14px;
        }

        .subjective-error {
          margin-top: 12px;
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
          padding: 12px;
          border-radius: 10px;
          font-size: 14px;
        }

        .subjective-result {
          margin-top: 16px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 14px;
          max-height: 420px;
          overflow: auto;
        }

        .subjective-result pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.65;
          color: #111827;
        }
      `}</style>
    </div>
  );
}