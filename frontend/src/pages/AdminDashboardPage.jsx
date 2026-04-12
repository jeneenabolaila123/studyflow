import { useEffect, useMemo, useState } from "react";
import axiosClient from "../api/axiosClient";
import { PageSpinner } from "../components/Spinner.jsx";

function formatDate(value) {
    if (!value) return "";
    try {
        return new Date(value).toLocaleDateString();
    } catch {
        return String(value);
    }
}

function useCountUp(target, duration = 900) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        let raf = 0;
        const start = performance.now();

        const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * (Number(target) || 0)));
            if (progress < 1) raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, duration]);

    return value;
}

function StatCard({ icon, iconClass, value, label }) {
    const animated = useCountUp(value);

    return (
        <div className="stat-card">
            <div className={`stat-icon ${iconClass}`}>{icon}</div>
            <div className="stat-value">{animated}</div>
            <div className="stat-label">{label}</div>
        </div>
    );
}

function SparklesIcon() {
    return (
        <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
        </svg>
    );
}

function UsersIcon() {
    return (
        <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a4 4 0 00-4-4h-1m-4 6H2v-2a4 4 0 014-4h7m4-4a4 4 0 11-8 0 4 4 0 018 0zm6 4a3 3 0 10-6 0 3 3 0 006 0z"
            />
        </svg>
    );
}

function NotesIcon() {
    return (
        <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
        </svg>
    );
}

function MessageIcon() {
    return (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 10h8m-8 4h5m7 6l-4-4H6a4 4 0 01-4-4V7a4 4 0 014-4h12a4 4 0 014 4v9a4 4 0 01-4 4h-2z"
            />
        </svg>
    );
}

function ShieldIcon() {
    return (
        <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V7l8-4z"
            />
        </svg>
    );
}

function StarIcon() {
    return (
        <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.173c.969 0 1.371 1.24.588 1.81l-3.376 2.453a1 1 0 00-.364 1.118l1.286 3.967c.3.921-.755 1.688-1.538 1.118l-3.376-2.453a1 1 0 00-1.176 0l-3.376 2.453c-.783.57-1.838-.197-1.538-1.118l1.286-3.967a1 1 0 00-.364-1.118L2.98 9.394c-.783-.57-.38-1.81.588-1.81h4.173a1 1 0 00.95-.69l1.286-3.967z"
            />
        </svg>
    );
}

function BoltIcon() {
    return (
        <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
            />
        </svg>
    );
}

function clamp01(n) {
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(1, n));
}

function MiniLineChart({ labels, values }) {
    const w = 520;
    const h = 140;
    const pad = 12;

    const safeValues = Array.isArray(values) ? values.map((v) => Number(v) || 0) : [];
    const max = Math.max(1, ...safeValues);

    const points = safeValues.map((v, i) => {
        const x = pad + (i * (w - pad * 2)) / Math.max(1, safeValues.length - 1);
        const y = pad + (1 - clamp01(v / max)) * (h - pad * 2);
        return { x, y };
    });

    const d = points
        .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
        .join(" ");

    const areaD = `${d} L${pad + (w - pad * 2)} ${h - pad} L${pad} ${h - pad} Z`;

    return (
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="140" role="img">
            <defs>
                <linearGradient id="sfLine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.02" />
                </linearGradient>
            </defs>
            <path d={areaD} fill="url(#sfLine)" />
            <path d={d} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" />
            {points.map((p, idx) => (
                <circle key={idx} cx={p.x} cy={p.y} r="2.5" fill="var(--color-accent)" />
            ))}
        </svg>
    );
}

function MiniBarChart({ labels, values }) {
    const w = 520;
    const h = 140;
    const pad = 12;

    const safeValues = Array.isArray(values) ? values.map((v) => Number(v) || 0) : [];
    const max = Math.max(1, ...safeValues);

    const barCount = Math.max(1, safeValues.length);
    const gap = 6;
    const barW = (w - pad * 2 - gap * (barCount - 1)) / barCount;

    return (
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="140" role="img">
            {safeValues.map((v, i) => {
                const bh = clamp01(v / max) * (h - pad * 2);
                const x = pad + i * (barW + gap);
                const y = h - pad - bh;

                return (
                    <rect
                        key={i}
                        x={x}
                        y={y}
                        width={Math.max(2, barW)}
                        height={bh}
                        rx="6"
                        fill="var(--color-accent)"
                        opacity="0.85"
                    />
                );
            })}
        </svg>
    );
}

function ChartCard({ title, subtitle, children }) {
    return (
        <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
                    {subtitle ? (
                        <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>
                            {subtitle}
                        </div>
                    ) : null}
                </div>
            </div>
            <div style={{ marginTop: 10 }}>{children}</div>
        </div>
    );
}

function TableCard({ title, columns, rows, emptyText }) {
    return (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div
                style={{
                    padding: "16px 18px",
                    borderBottom: "1px solid var(--color-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                }}
            >
                <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
            </div>

            <div style={{ overflowX: "auto" }}>
                <table
                    style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 13,
                    }}
                >
                    <thead>
                        <tr style={{ background: "var(--color-bg)" }}>
                            {columns.map((c) => (
                                <th
                                    key={c}
                                    style={{
                                        textAlign: "left",
                                        padding: "12px 14px",
                                        fontSize: 11.5,
                                        letterSpacing: "0.02em",
                                        color: "var(--color-muted)",
                                        fontWeight: 700,
                                        whiteSpace: "nowrap",
                                        borderBottom: "1px solid var(--color-border)",
                                    }}
                                >
                                    {c}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    style={{ padding: 18, color: "var(--color-muted)" }}
                                >
                                    {emptyText}
                                </td>
                            </tr>
                        ) : (
                            rows.map((r, idx) => (
                                <tr
                                    key={idx}
                                    style={{
                                        borderBottom:
                                            idx === rows.length - 1
                                                ? "none"
                                                : "1px solid var(--color-border)",
                                    }}
                                >
                                    {r.map((cell, j) => (
                                        <td
                                            key={j}
                                            style={{
                                                padding: "12px 14px",
                                                verticalAlign: "top",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function AdminDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [payload, setPayload] = useState(null);

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axiosClient.get("/admin/dashboard");
            setPayload(res.data?.data || null);
        } catch (e) {
            setError(e?.response?.data?.message || "Failed to load admin dashboard.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stats = payload?.stats || {};
    const charts = payload?.charts || {};
    const recentUsers = Array.isArray(payload?.recent_users) ? payload.recent_users : [];
    const recentNotes = Array.isArray(payload?.recent_notes) ? payload.recent_notes : [];
    const recentFeedback = Array.isArray(payload?.recent_feedback) ? payload.recent_feedback : [];
    const topWeakTopics = Array.isArray(payload?.top_weak_topics) ? payload.top_weak_topics : [];

    const statCards = useMemo(
        () => [
            {
                icon: <UsersIcon />,
                iconClass: "stat-icon-blue",
                value: stats.total_users || 0,
                label: "Total Users",
            },
            {
                icon: <NotesIcon />,
                iconClass: "stat-icon-purple",
                value: stats.total_notes || 0,
                label: "Total Notes",
            },
            {
                icon: <MessageIcon />,
                iconClass: "stat-icon-green",
                value: stats.total_feedback || 0,
                label: "Feedback",
            },
            {
                icon: <ShieldIcon />,
                iconClass: "stat-icon-orange",
                value: stats.total_admins || 0,
                label: "Total Admins",
            },
            {
                icon: <StarIcon />,
                iconClass: "stat-icon-green",
                value: stats.featured_notes || 0,
                label: "Featured Notes",
            },
            {
                icon: <SparklesIcon />,
                iconClass: "stat-icon-purple",
                value: stats.ai_summaries || 0,
                label: "AI Summaries",
            },
            {
                icon: <BoltIcon />,
                iconClass: "stat-icon-green",
                value: stats.active_users || 0,
                label: "Active Users",
            },
        ],
        [stats]
    );

    if (loading) return <PageSpinner />;

    return (
        <div className="page-enter">
            <div className="page-header" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                    <h1 className="page-title">Admin Dashboard</h1>
                    <p className="page-desc">Overview of your Studyflow system</p>
                </div>

                <button className="btn btn-secondary" onClick={load} type="button">
                    Refresh
                </button>
            </div>

            {error ? <div className="alert alert-error">{error}</div> : null}

            <div className="stats-grid">
                {statCards.map((c) => (
                    <StatCard
                        key={c.label}
                        icon={c.icon}
                        iconClass={c.iconClass}
                        value={c.value}
                        label={c.label}
                    />
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, marginBottom: 18 }}>
                <ChartCard title="Users growth" subtitle="New users created per day">
                    <MiniLineChart
                        labels={charts.users_growth?.labels || []}
                        values={charts.users_growth?.values || []}
                    />
                </ChartCard>

                <ChartCard title="Notes uploads" subtitle="Notes created per day">
                    <MiniBarChart
                        labels={charts.notes_uploads?.labels || []}
                        values={charts.notes_uploads?.values || []}
                    />
                </ChartCard>

                <ChartCard title="AI usage" subtitle="AI summaries generated per day">
                    <MiniLineChart
                        labels={charts.ai_usage?.labels || []}
                        values={charts.ai_usage?.values || []}
                    />
                </ChartCard>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
                <TableCard
                    title="Recent Users"
                    columns={["Name", "Email", "Role", "Status", "Created"]}
                    rows={recentUsers.map((u) => [
                        u.name,
                        u.email,
                        u.is_admin ? (
                            <span className="badge badge-accent">admin</span>
                        ) : (
                            <span className="badge badge-default">user</span>
                        ),
                        u.status === "active" ? (
                            <span className="badge badge-success">active</span>
                        ) : (
                            <span className="badge badge-warning">inactive</span>
                        ),
                        formatDate(u.created_at),
                    ])}
                    emptyText="No users yet."
                />

                <TableCard
                    title="Recent Notes"
                    columns={["Title", "User", "Source", "Featured", "Created"]}
                    rows={recentNotes.map((n) => [
                        n.title,
                        n.user?.name || "—",
                        n.source_type || "—",
                        n.is_featured ? (
                            <span className="badge badge-accent">featured</span>
                        ) : (
                            <span className="badge badge-default">—</span>
                        ),
                        formatDate(n.created_at),
                    ])}
                    emptyText="No notes yet."
                />

                <TableCard
                    title="Recent Feedback"
                    columns={["Name", "Rating", "Message", "Created"]}
                    rows={recentFeedback.map((f) => [
                        f.name,
                        f.rating ? <span className="badge badge-accent">{f.rating}/5</span> : <span className="badge badge-default">—</span>,
                        f.message,
                        formatDate(f.created_at),
                    ])}
                    emptyText="No feedback yet."
                />

                <TableCard
                    title="Top Weak Topics"
                    columns={["Topic", "Weakness", "Wrong/Total"]}
                    rows={topWeakTopics.map((t) => [
                        t.topic,
                        <span className="badge badge-accent">{Math.round(Number(t.weakness_percent) || 0)}%</span>,
                        `${t.wrong_count}/${t.total_count}`,
                    ])}
                    emptyText="No weak topics yet."
                />
            </div>
        </div>
    );
}
