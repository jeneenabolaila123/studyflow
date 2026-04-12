import { useState } from "react";
import axiosClient from "../api/axiosClient";
import Spinner from "./Spinner.jsx";

export default function NoteForm({ onCreated }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [file, setFile] = useState(null);
    const [textContent, setTextContent] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    const submit = async (e) => {
        e.preventDefault();

        setError("");
        setFieldErrors({});

        const trimmedTitle = title.trim();
        const trimmedDescription = description.trim();
        const trimmedText = textContent.trim();
        const hasText = Boolean(trimmedText);

        if (!file && !hasText) {
            setError("Please upload a file or paste some text.");
            return;
        }

        setSubmitting(true);

        try {
            const formData = new FormData();

            formData.append("title", trimmedTitle || file?.name || "Untitled Note");

            if (trimmedDescription) {
                formData.append("description", trimmedDescription);
            }

            if (file) {
                formData.append("pdf", file);
            } else if (hasText) {
                // ابعتي text_content فقط إذا ما في ملف
                formData.append("text_content", trimmedText);
            }

            console.log("FORM DATA:");
            for (const pair of formData.entries()) {
                console.log(pair[0], pair[1]);
            }

            await axiosClient.post("/notes", formData);

            setTitle("");
            setDescription("");
            setFile(null);
            setTextContent("");

            onCreated?.();
        } catch (err) {
            console.log("UPLOAD STATUS:", err.response?.status);
            console.log("UPLOAD DATA:", err.response?.data);
            console.log("UPLOAD ERRORS:", err.response?.data?.errors);

            const status = err?.response?.status;

            if (status === 422) {
                setFieldErrors(err.response?.data?.errors || {});
                setError(err.response?.data?.message || "Validation failed.");
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
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600 }}>
                Create New Note
            </h3>

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
                <div className="field-label">
                    Description{" "}
                    <span
                        style={{ color: "var(--color-muted)", fontWeight: 400 }}
                    >
                        (optional)
                    </span>
                </div>

                <textarea
                    className="textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short description..."
                />

                {fieldErrors.description?.length ? (
                    <div className="field-error">
                        {fieldErrors.description[0]}
                    </div>
                ) : null}
            </div>

            <div className="field">
                <div className="field-label">File</div>

                <div
                    style={{
                        color: "var(--color-muted)",
                        fontSize: 13,
                        marginBottom: 6,
                    }}
                >
                    Supported: PDF, PPT, PPTX, TXT
                </div>

                <input
                    className="input"
                    type="file"
                    accept=".pdf,.ppt,.pptx,.txt"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                />

                {fieldErrors.pdf?.length ? (
                    <div className="field-error">{fieldErrors.pdf[0]}</div>
                ) : null}
            </div>

            <div className="field">
                <div className="field-label">
                    Text{" "}
                    <span
                        style={{ color: "var(--color-muted)", fontWeight: 400 }}
                    >
                        (optional)
                    </span>
                </div>

                <div
                    style={{
                        color: "var(--color-muted)",
                        fontSize: 13,
                        marginBottom: 6,
                    }}
                >
                    Paste or write text instead of uploading a file.
                </div>

                <textarea
                    className="textarea"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Write or paste your note text here..."
                />

                {fieldErrors.text_content?.length ? (
                    <div className="field-error">
                        {fieldErrors.text_content[0]}
                    </div>
                ) : null}
            </div>

            {error ? (
                <div className="alert alert-error" style={{ marginBottom: 12 }}>
                    {error}
                </div>
            ) : null}

            <button
                className="btn btn-primary"
                type="submit"
                disabled={submitting}
            >
                {submitting ? (
                    <>
                        <Spinner size="sm" /> Uploading…
                    </>
                ) : (
                    "Upload"
                )}
            </button>
        </form>
    );
}