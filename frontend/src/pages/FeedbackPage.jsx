import { useCallback, useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";

function renderStars(rating) {
    const r = Number(rating);
    if (!r || Number.isNaN(r)) return null;
    const full = "★".repeat(Math.max(0, Math.min(5, r)));
    const empty = "☆".repeat(Math.max(0, 5 - Math.max(0, Math.min(5, r))));
    return `${full}${empty}`;
}

export default function FeedbackPage() {
    const [message, setMessage] = useState("");
const [rating, setRating] = useState(0);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [recent, setRecent] = useState([]);

    const loadRecent = useCallback(async () => {
        try {
            const res = await axiosClient.get("/feedback/recent?limit=6");
            setRecent(res.data?.data || []);
        } catch {
            // keep silent; feedback form should still work
        }
    }, []);

    useEffect(() => {
        loadRecent();
    }, [loadRecent]);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const trimmed = message.trim();
        if (!trimmed) {
            setError("Message is required.");
            return;
        }

        setSending(true);
        try {
            await axiosClient.post("/feedback", {
                message: trimmed,
                rating: rating ? Number(rating) : null,
            });

            setMessage("");
            setRating("");
            setSuccess("Thanks! Your feedback was submitted successfully.");
            loadRecent();

            setTimeout(() => setSuccess(""), 3500);
        } catch (err) {
            const validation = err?.response?.data?.errors;
            if (validation) {
                const firstError = Object.values(validation)[0]?.[0];
                setError(firstError || "Validation failed.");
            } else {
                setError(err?.response?.data?.message || "Failed to submit feedback.");
            }
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="page-enter">
            <div className="page-header">
                <h1 className="page-title">Feedback</h1>
                <p className="page-desc">Help improve StudyFlow with your thoughts</p>
            </div>

            {error ? <div className="alert alert-error">{error}</div> : null}
            {success ? <div className="alert alert-success">{success}</div> : null}

            <div className="card" style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Send Feedback</div>

                <form onSubmit={submit}>
                    <div className="field">
                        <label className="field-label">Message</label>
                        <textarea
                            className="textarea text-lg p-4"
                            rows={5}
                            placeholder="Write your feedback..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={sending}
                        />
                    </div>

                  <div style={{ display: "flex", gap: 8, fontSize: 28, cursor: "pointer" }}>
    {[1, 2, 3, 4, 5].map((star) => (
        <span
            key={star}
            onClick={() => setRating(star)}
            style={{
                color: star <= rating ? "#facc15" : "#d1d5db",
                transition: "0.2s",
            }}
        >
            ★
        </span>
    ))}
</div>

                    <div className="actions" style={{ marginTop: 14 }}>
                        <button className="btn btn-primary" type="submit" disabled={sending}>
                            {sending ? "Sending…" : "Submit"}
                        </button>
                    </div>
                </form>
            </div>

            <div className="section-card">
                <div className="section-card-header">
                    <div className="section-card-title">Recent Feedback</div>
                </div>

                {recent.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-title">No feedback yet</div>
                        <div className="empty-state-desc">Be the first to share your experience.</div>
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                        {recent.map((f) => (
                            <div key={f.id} className="recent-note" style={{ alignItems: "flex-start" }}>
                                <div className="recent-note-left" style={{ marginTop: 2 }}>
                                    <span style={{ fontSize: 16, lineHeight: "16px" }}>💬</span>
                                </div>

                                <div className="recent-note-content">
                                    <div className="recent-note-title" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        <span>{f.name}</span>
                                        {f.rating ? (
                                            <span className="badge badge-accent">{renderStars(f.rating)}</span>
                                        ) : null}
                                    </div>
                                    <div className="recent-note-meta" style={{ marginTop: 6 }}>
                                        <span className="badge badge-default">{f.message}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
