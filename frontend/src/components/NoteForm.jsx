import { useState } from "react";
import axiosClient from "../api/axiosClient";

export default function NoteForm({ onCreated }) {

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [textContent, setTextContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {

    e.preventDefault();

    setError("");

    if (!file && !textContent.trim()) {
      setError("Please upload a file or write some text");
      return;
    }

    setSubmitting(true);

    try {

      const formData = new FormData();

      formData.append("title", title);
      formData.append("description", description);

      if (file) {
        formData.append("file", file);
      }

      if (textContent.trim()) {
        formData.append("text_content", textContent.trim());
      }

      await axiosClient.post("/notes", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setTitle("");
      setDescription("");
      setFile(null);
      setTextContent("");

      onCreated?.();

    } catch (err) {

      console.error(err);
      setError("Upload failed");

    } finally {

      setSubmitting(false);

    }

  };

  return (

    <form className="card" onSubmit={submit}>

      <div className="field">
        <div className="label">Title</div>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Chapter 1 notes"
        />
      </div>

      <div className="field">
        <div className="label">Description (optional)</div>
        <textarea
          className="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description..."
        />
      </div>

      <div className="field">
        <div className="label">File</div>
        <input
          className="input"
          type="file"
          accept=".pdf,.txt,.ppt,.pptx"
          onChange={(e) => setFile(e.target.files[0])}
        />
      </div>

      <div className="field">
        <div className="label">Text (optional)</div>
        <textarea
          className="textarea"
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="Write your note text..."
        />
      </div>

      {error && <div className="errorBox">{error}</div>}

      <button className="button" type="submit" disabled={submitting}>
        {submitting ? "Uploading..." : "Upload"}
      </button>

    </form>

  );
}