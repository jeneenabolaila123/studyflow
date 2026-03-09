import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import ChatMessage, { TypingIndicator } from "../components/ChatMessage.jsx";
import { PageSpinner } from "../components/Spinner.jsx";

function AiThinking({ label = "AI is thinking" }) {
    return (
        <span className="ai-thinking">
            <span className="ai-thinking-icon">✦</span>
            {label}
            <span className="ai-thinking-dots">
                <span />
                <span />
                <span />
            </span>
        </span>
    );
}

export default function NoteDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [note, setNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const [summary, setSummary] = useState("");
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [quizLoading, setQuizLoading] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [aiError, setAiError] = useState("");

    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);
            setError("");

            try {
                const res = await axiosClient.get(`/notes/${id}`);
                if (!mounted) return;
                setNote(res.data?.data || null);
            } catch (err) {
                const status = err?.response?.status;

                if (status === 403) setError("Forbidden.");
                else if (status === 404) setError("Not found.");
                else if (status !== 401)
                    setError(
                        err?.response?.data?.message || "Failed to load note."
                    );
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();

        return () => {
            mounted = false;
        };
    }, [id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    const download = async () => {
        setError("");
        setBusy(true);

        try {
            const res = await axiosClient.get(`/notes/${id}/download`, {
                responseType: "blob",
            });

            const contentType =
                res.headers?.["content-type"] || "application/pdf";

            const blob = new Blob([res.data], { type: contentType });

            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");

            a.href = url;
            a.download = note?.original_filename || `note-${id}.pdf`;

            document.body.appendChild(a);
            a.click();
            a.remove();

            window.URL.revokeObjectURL(url);
        } catch (err) {
            const status = err?.response?.status;

            if (status === 403) setError("Forbidden.");
            else if (status === 404) setError("Not found.");
            else if (status !== 401)
                setError(err?.response?.data?.message || "Download failed.");
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!confirm("Delete this note?")) return;

        setError("");
        setBusy(true);

        try {
            await axiosClient.delete(`/notes/${id}`);
            navigate("/notes", { replace: true });
        } catch (err) {
            const status = err?.response?.status;

            if (status === 403) setError("Forbidden.");
            else if (status === 404) setError("Not found.");
            else if (status !== 401)
                setError(err?.response?.data?.message || "Delete failed.");
        } finally {
            setBusy(false);
        }
    };

    const generateSummary = async () => {
        setAiError("");
        setSummaryLoading(true);

        try {
            const res = await axiosClient.post("/ai/summarize", {
                note_id: Number(id),
            });

            setSummary(res.data?.data?.summary || "");
        } catch (err) {
            const status = err?.response?.status;

            if (status === 429)
                setAiError("Too many requests. Please wait and try again.");
            else if (status === 403) setAiError("Forbidden.");
            else if (status === 404) setAiError("Not found.");
            else
                setAiError(
                    err?.response?.data?.message ||
                        "Failed to generate summary."
                );
        } finally {
            setSummaryLoading(false);
        }
    };

    const generateQuiz = async () => {
        setAiError("");
        setQuizLoading(true);

        try {
            const res = await axiosClient.post("/ai/quiz", {
                note_id: parseInt(id),
                count: 5,
            });

            setQuizQuestions(res.data?.data?.questions || []);
        } catch (err) {
            console.log("QUIZ ERROR:", err.response?.data);

            const status = err?.response?.status;

            if (status === 429)
                setAiError("Too many requests. Please wait and try again.");
            else if (status === 403) setAiError("Forbidden.");
            else if (status === 404) setAiError("Not found.");
            else
                setAiError(
                    err?.response?.data?.message || "Failed to generate quiz."
                );
        } finally {
            setQuizLoading(false);
        }
    };
    const sendChat = async () => {
        const message = chatInput.trim();
        if (!message || chatLoading) return;

        setAiError("");
        setChatLoading(true);
        setChatInput("");

        setChatMessages((prev) => [
            ...prev,
            { role: "user", content: message },
        ]);

        try {
            const res = await axiosClient.post("/ai/chat", {
                note_id: Number(id),
                message,
            });

            const reply = res.data?.data?.reply || "";

            setChatMessages((prev) => [
                ...prev,
                { role: "ai", content: reply },
            ]);
        } catch (err) {
            const status = err?.response?.status;

            if (status === 429)
                setAiError("Too many requests. Please wait and try again.");
            else if (status === 403) setAiError("Forbidden.");
            else if (status === 404) setAiError("Not found.");
            else
                setAiError(
                    err?.response?.data?.message || "Failed to send message."
                );
        } finally {
            setChatLoading(false);
        }
    };

    if (loading) {
        return <PageSpinner />;
    }

    if (!note) {
        return (
            <div className="dashboard-page">
                <div
                    className="section-card"
                    style={{ textAlign: "center", padding: "48px 24px" }}
                >
                    <p
                        style={{
                            color: "var(--color-muted)",
                            marginBottom: 16,
                        }}
                    >
                        {error || "Note not found."}
                    </p>
                    <Link className="btn btn-primary" to="/notes">
                        Back to Notes
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            {/* Back link */}
            <Link
                to="/notes"
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--color-muted)",
                    fontSize: 14,
                    textDecoration: "none",
                    marginBottom: 20,
                }}
            >
                ← Back to Notes
            </Link>
            {/* Hero card */}
            <div
                className="section-card"
                style={{
                    background:
                        "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4c1d95 100%)",
                    color: "#fff",
                    marginBottom: 20,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                        flexWrap: "wrap",
                    }}
                >
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h1
                            style={{
                                margin: "0 0 10px",
                                fontSize: 26,
                                fontWeight: 700,
                                lineHeight: 1.3,
                            }}
                        >
                            {note.title}
                        </h1>
                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                            }}
                        >
                            <span className="badge badge-info">
                                {note.status}
                            </span>
                            {note.source_type && (
                                <span className="badge badge-info">
                                    {note.source_type}
                                </span>
                            )}
                            {note.mime_type && (
                                <span className="badge badge-info">
                                    {note.mime_type}
                                </span>
                            )}
                            {note.file_size && (
                                <span className="badge badge-info">
                                    {Math.round(note.file_size / 1024)} KB
                                </span>
                            )}
                        </div>
                        {note.description && (
                            <p
                                style={{
                                    marginTop: 12,
                                    opacity: 0.85,
                                    fontSize: 15,
                                    lineHeight: 1.6,
                                }}
                            >
                                {note.description}
                            </p>
                        )}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                        <button
                            className="btn btn-secondary"
                            onClick={download}
                            disabled={busy || !note.has_file}
                            style={{
                                background: "rgba(255,255,255,0.15)",
                                borderColor: "rgba(255,255,255,0.3)",
                                color: "#fff",
                            }}
                        >
                            Download
                        </button>
                        <button
                            className="btn btn-danger"
                            onClick={remove}
                            disabled={busy}
                        >
                            Delete
                        </button>
                    </div>
                </div>

                {error && (
                    <div
                        className="alert alert-error"
                        style={{ marginTop: 14 }}
                    >
                        {error}
                    </div>
                )}
            </div>
            {/* AI Tools */}
            <div className="section-card" style={{ marginBottom: 20 }}>
                <h2
                    style={{
                        margin: "0 0 16px",
                        fontSize: 17,
                        fontWeight: 600,
                    }}
                >
                    AI Tools
                </h2>

                <div className="ai-action-btns">
                    <button
                        className="ai-action-btn ai-action-btn--summary"
                        onClick={generateSummary}
                        disabled={summaryLoading || quizLoading}
                    >
                        {summaryLoading ? (
                            <AiThinking label="Summarizing" />
                        ) : (
                            <>
                                <span className="ai-action-btn-icon">📄</span>{" "}
                                Generate Summary
                            </>
                        )}
                    </button>
                    <button
                        className="ai-action-btn ai-action-btn--quiz"
                        onClick={generateQuiz}
                        disabled={quizLoading || summaryLoading}
                    >
                        {quizLoading ? (
                            <AiThinking label="Generating quiz" />
                        ) : (
                            <>
                                <span className="ai-action-btn-icon">🧠</span>{" "}
                                Generate Quiz
                            </>
                        )}
                    </button>
                </div>

                {aiError && (
                    <div
                        className="alert alert-error"
                        style={{ marginBottom: 12 }}
                    >
                        {aiError}
                    </div>
                )}

                {summary && (
                    <div style={{ marginTop: 8 }}>
                        <div
                            className="field-label"
                            style={{ marginBottom: 8 }}
                        >
                            Summary
                        </div>
                        <div
                            style={{
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                                borderRadius: 10,
                                padding: "14px 16px",
                                whiteSpace: "pre-wrap",
                                fontSize: 14,
                                lineHeight: 1.7,
                                color: "var(--color-text)",
                            }}
                        >
                            {summary}
                        </div>
                    </div>
                )}

                {quizQuestions?.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                        <div
                            className="field-label"
                            style={{ marginBottom: 12 }}
                        >
                            Quiz
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                            }}
                        >
                            {quizQuestions.map((q) => (
                                <div
                                    key={q.number}
                                    style={{
                                        background: "var(--color-surface)",
                                        border: "1px solid var(--color-border)",
                                        borderRadius: 10,
                                        padding: "12px 16px",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            color: "var(--color-accent)",
                                            marginBottom: 4,
                                            fontSize: 13,
                                        }}
                                    >
                                        Question {q.number}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 14,
                                            lineHeight: 1.6,
                                        }}
                                    >
                                        {q.question}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {/* Chat */}
            <div className="section-card">
                <h2
                    style={{
                        margin: "0 0 16px",
                        fontSize: 17,
                        fontWeight: 600,
                    }}
                >
                    Ask about this note
                </h2>

                <div className="chat-container">
                    <div className="chat-messages">
                        {chatMessages.length === 0 ? (
                            <div
                                style={{
                                    textAlign: "center",
                                    color: "var(--color-muted)",
                                    fontSize: 14,
                                    padding: "32px 0",
                                }}
                            >
                                Ask anything about this note — summaries,
                                explanations, follow-ups.
                            </div>
                        ) : (
                            chatMessages.map((m, i) => (
                                <ChatMessage
                                    key={i}
                                    role={m.role}
                                    content={m.content}
                                />
                            ))
                        )}
                        {chatLoading && <TypingIndicator />}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="chat-input-area">
                        <input
                            className="input"
                            style={{ flex: 1 }}
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Ask a question about this note…"
                            disabled={chatLoading}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    sendChat();
                                }
                            }}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={sendChat}
                            disabled={chatLoading || !chatInput.trim()}
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
