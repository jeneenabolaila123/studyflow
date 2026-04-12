import { useState } from "react";
import axios from "axios";
import axiosClient from "../api/axiosClient";

export default function TestPage() {

  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [question, setQuestion] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // =========================
  // OCR
  // =========================
  const handleUpload = async () => {
    if (!file) {
      alert("Choose a file first ⚠️");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(
        "http://127.0.0.1:8001/ocr-upload",
        formData
      );

      console.log("OCR:", res.data);

      setText(res.data.text);

    } catch (err) {
      console.error(err);
      setError("OCR failed ❌");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // KAGGLE STYLE QUESTION ⚡
  // =========================
  const handleQuestion = async () => {
    if (!text) {
      alert("No text available ⚠️");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await axiosClient.post("/ai/generate-one", {
        note: text,
      });

      const q = res.data?.data?.question || "";
      setQuestion(q);

    } catch (err) {
      console.error(err);
      setError("AI failed ❌");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // UI
  // =========================
  return (
    <div style={{ padding: 20 }}>
      <h1>🔥 Kaggle Style AI</h1>

      {/* Upload */}
      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <br /><br />

      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Processing..." : "Upload PDF"}
      </button>

      <br /><br />

      <p><b>Text:</b></p>
      <div style={{ maxWidth: 600 }}>
        {text || "No text yet..."}
      </div>

      <br />

      <button onClick={handleQuestion} disabled={loading}>
        Generate Question
      </button>

      <br /><br />

      <p><b>Question:</b></p>
      <div style={{ fontSize: "18px", color: "#00ffcc" }}>
        {question || "No question yet..."}
      </div>

      {/* Error */}
      {error && (
        <p style={{ color: "red" }}>{error}</p>
      )}
    </div>
  );
}