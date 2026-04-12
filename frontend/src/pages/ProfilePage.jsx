import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { PageSpinner } from "../components/Spinner.jsx";

export default function ProfilePage() {
    const { user, token, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && !token) {
            navigate("/login", { replace: true });
        }
    }, [loading, token, navigate]);

    if (loading) return <PageSpinner />;

    if (!user) {
        return (
            <div className="dashboard-page page-enter">
                <div className="section-card">
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Profile unavailable</div>
                    <div style={{ color: "var(--color-muted)", fontSize: 13 }}>
                        We couldn't load your account details.
                    </div>
                </div>
            </div>
        );
    }

    const isAdmin = Boolean(user.is_admin);
    const isVerified = Boolean(user.email_verified_at);
    const status = user.status || "active";

    const initials = user?.name
        ? String(user.name)
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
        : "U";

    return (
        <div className="dashboard-page page-enter">
            <div className="page-header">
                <h1 className="page-title">Profile</h1>
                <p className="page-desc">Account details for your session</p>
            </div>

            <div className="section-card" style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: 16,
                        background: "var(--color-accent)",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                    }}
                >
                    {initials}
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{user.name || "User"}</div>
                    <div style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 2 }}>{user.email}</div>

                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span className={`badge ${isAdmin ? "badge-accent" : "badge-default"}`}>
                            {isAdmin ? "Admin" : "User"}
                        </span>
                        <span className={`badge ${isVerified ? "badge-success" : "badge-warning"}`}>
                            {isVerified ? "Verified" : "Unverified"}
                        </span>
                        <span className="badge badge-default">{status}</span>
                    </div>
                </div>

                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate(isAdmin ? "/admin" : "/dashboard")}
                >
                    Back
                </button>
            </div>

            <div className="section-card" style={{ display: "grid", gap: 12 }}>
                <div style={{ fontWeight: 800 }}>Details</div>
                <div style={{ fontSize: 13, color: "var(--color-muted)" }}>
                    Email verified at: {user.email_verified_at ? new Date(user.email_verified_at).toLocaleString() : "—"}
                </div>
                <div style={{ fontSize: 13, color: "var(--color-muted)" }}>
                    Last login: {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "—"}
                </div>
            </div>
        </div>
    );
}
