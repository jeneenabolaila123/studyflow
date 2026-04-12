import { useCallback, useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { PageSpinner } from "../components/Spinner.jsx";

function formatPercent(n) {
    const num = Number(n);
    if (Number.isNaN(num)) return "0%";
    return `${Math.round(num)}%`;
}

function truncate(text, max = 90) {
    const t = String(text || "").trim();
    if (!t) return "";
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1)}…`;
}

export default function RecommendationsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [items, setItems] = useState([]);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const res = await axiosClient.get("/recommendations");
            setItems(res.data?.data || []);
        } catch (e) {
            setError(e?.response?.data?.message || "Failed to load recommendations.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) return <PageSpinner />;

    return (
        <div className="page-enter">
            <div
                className="page-header"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
            >
                <div>
                    <h1 className="page-title">Recommendations</h1>
                    <p className="page-desc">StudyFlow highlights topics that need more practice</p>
                </div>

                <button className="btn btn-secondary" onClick={load} type="button">
                    Refresh
                </button>
            </div>

            {error ? <div className="alert alert-error">{error}</div> : null}

            <div className="section-card">
                <div className="section-card-header">
                    <div className="section-card-title">Weak Topics</div>
                </div>

                <p className="page-desc" style={{ marginTop: 6 }}>
                    The system found that you need more practice in the following topics.
                </p>

                {items.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-title">No recommendations yet</div>
                        <div className="empty-state-desc">
                            Take a quiz in StudyFlow and your weak topics will appear here.
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 12 }}>
                        {items.map((t) => (
                            <div
                                key={t.id}
                                className="recent-note"
                                style={{ alignItems: "flex-start", gap: 12 }}
                            >
                                <div className="recent-note-left" style={{ marginTop: 2 }}>
                                    <span style={{ fontSize: 16, lineHeight: "16px" }}>🎯</span>
                                </div>

                                <div className="recent-note-content">
                                    <div className="recent-note-title" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        <span>{t.topic}</span>
                                        <span className="badge badge-accent">{formatPercent(t.weakness_percent)}</span>
                                        <span className="badge badge-default">
                                            {t.wrong_count}/{t.total_count}
                                        </span>
                                    </div>

                                    <div className="recent-note-meta" style={{ marginTop: 6 }}>
                                        <span className="badge badge-default">
                                            {truncate(t.recommendation || "You need more revision in this topic.")}
                                        </span>
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
