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
        setBusy(true);

        try {
            const res = await axiosClient.get(`/notes/${id}/download`, {
                responseType: "blob",
            });

            const blob = new Blob([res.data]);
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = note?.original_filename || `note-${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();

            window.URL.revokeObjectURL(url);
        } catch {
            setError("Download failed.");
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!confirm("Delete this note?")) return;

        setBusy(true);

        try {
            await axiosClient.delete(`/notes/${id}`);
            navigate("/notes", { replace: true });
        } catch {
            setError("Delete failed.");
        } finally {
            setBusy(false);
        }
    };

    const generateSummary = async () => {
        setSummaryLoading(true);
        setAiError("");

        try {
            const res = await axiosClient.post("/ai/summarize", {
                note_id: Number(id),
            });

            setSummary(res.data?.data?.summary || "");
        } catch {
            setAiError("Failed to generate summary.");
        } finally {
            setSummaryLoading(false);
        }
    };

    const handleOpenQuizPage = () => navigate(`/quiz/${id}`);

    const sendChat = async () => {
        const message = chatInput.trim();
        if (!message || chatLoading) return;

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
        } catch {
            setAiError("Failed to send message.");
        } finally {
            setChatLoading(false);
        }
    };

    if (loading) return <PageSpinner />;

    if (!note) {
        return (
            <div className="dashboard-page">
                <div className="section-card">
                    <p>{error || "Note not found."}</p>
                    <Link className="btn btn-primary" to="/notes">
                        Back to Notes
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            <Link to="/notes" className="back-link">
                ← Back to Notes
            </Link>

            <div className="section-card">
                <h1>{note.title}</h1>

                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        className="btn btn-secondary"
                        onClick={download}
                        disabled={busy || !note.has_file}
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

            <div className="section-card">
                <h2>AI Tools</h2>

                <div className="ai-action-btns">
                    <button
                        className="btn btn-primary"
                        onClick={generateSummary}
                        disabled={summaryLoading}
                    >
                        {summaryLoading ? (
                            <AiThinking label="Summarizing" />
                        ) : (
                            "Generate Summary"
                        )}
                    </button>

                    <button
                        className="btn btn-primary"
                        onClick={handleOpenQuizPage}
                    >
                        Generate Quiz
                    </button>
                </div>

                {summary && (
                    <div style={{ marginTop: 16 }}>
                        <h3>Summary</h3>
                        <p style={{ whiteSpace: "pre-wrap" }}>{summary}</p>
                    </div>
                )}
            </div>

            <div className="section-card">
                <h2>Ask about this note</h2>

                <div className="chat-container">
                    <div className="chat-messages">
                        {chatMessages.map((m, i) => (
                            <ChatMessage
                                key={i}
                                role={m.role}
                                content={m.content}
                            />
                        ))}

                        {chatLoading && <TypingIndicator />}

                        <div ref={chatEndRef} />
                    </div>

                    <div className="chat-input-area">
                        <input
                            className="input"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Ask about this note..."
                        />

                        <button className="btn btn-primary" onClick={sendChat}>
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
