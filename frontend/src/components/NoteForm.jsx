import { useState } from "react";
import axiosClient from "../api/axiosClient";
<<<<<<< HEAD
import Spinner from "./Spinner.jsx";

export default function NoteForm({ onCreated }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [pdf, setPdf] = useState(null);

    const [textContent, setTextContent] = useState("");
    const [txtFile, setTxtFile] = useState(null);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
=======

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
>>>>>>> 065b279834815d71e3aec024460b739dd59d9809

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setFieldErrors({});

<<<<<<< HEAD
        const hasText = Boolean(textContent && textContent.trim().length);
        if (!pdf && !txtFile && !hasText) {
            setError("Please upload a PDF or add text (paste or .txt).");
            return;
        }

        setSubmitting(true);

        try {
            const formData = new FormData();
            formData.append("title", title);
            if (description) formData.append("description", description);
            if (pdf) formData.append("pdf", pdf);
            if (hasText) formData.append("text_content", textContent.trim());
            if (txtFile) formData.append("txt_file", txtFile);

            await axiosClient.post("/notes", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setTitle("");
            setDescription("");
            setPdf(null);
            setTextContent("");
            setTxtFile(null);
            onCreated?.();
        } catch (err) {
            const status = err?.response?.status;
            if (status === 422) {
                setFieldErrors(err.response?.data?.errors || {});
            } else if (status === 403) {
                setError("Forbidden.");
            } else if (status === 401) {
                setError("Unauthenticated.");
            } else {
                setError(err?.response?.data?.message || "Upload failed.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className="section-card" onSubmit={submit}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600 }}>Create New Note</h3>

            <div className="field">
                <div className="field-label">Title</div>
                <input
                    className="input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Chapter 1 notes"
                />
                {fieldErrors.title?.length ? (
                    <div className="field-error">{fieldErrors.title[0]}</div>
                ) : null}
            </div>

            <div className="field">
                <div className="field-label">Description <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>(optional)</span></div>
                <textarea
                    className="textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short description..."
                />
                {fieldErrors.description?.length ? (
                    <div className="field-error">{fieldErrors.description[0]}</div>
                ) : null}
            </div>

            <div className="field">
                <div className="field-label">PDF</div>
                <input
                    className="input"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setPdf(e.target.files?.[0] || null)}
                />
                {fieldErrors.pdf?.length ? (
                    <div className="field-error">{fieldErrors.pdf[0]}</div>
                ) : null}
            </div>

            <div className="field">
                <div className="field-label">
                    Text <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>(optional)</span>
                </div>
                <div style={{ color: "var(--color-muted)", fontSize: 13, marginBottom: 6 }}>
                    Paste or write text and/or upload a .txt file.
                </div>
                <textarea
                    className="textarea"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Write or paste your note text here..."
                />
                {fieldErrors.text_content?.length ? (
                    <div className="field-error">{fieldErrors.text_content[0]}</div>
                ) : null}
            </div>

            <div className="field">
                <div className="field-label">TXT file <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>(optional)</span></div>
                <input
                    className="input"
                    type="file"
                    accept=".txt,text/plain"
                    onChange={(e) => setTxtFile(e.target.files?.[0] || null)}
                />
                {fieldErrors.txt_file?.length ? (
                    <div className="field-error">{fieldErrors.txt_file[0]}</div>
                ) : null}
            </div>

            {error ? <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div> : null}

            <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? <><Spinner size="sm" /> Uploading…</> : "Create Note"}
            </button>
        </form>
    );
}
=======
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
>>>>>>> 065b279834815d71e3aec024460b739dd59d9809
