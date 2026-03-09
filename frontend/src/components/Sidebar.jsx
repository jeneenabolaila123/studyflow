import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

// ---- Icons -------------------------------------------------------
function DashboardIcon() {
    return (
        <svg
            className="sidebar-icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
        </svg>
    );
}
function NotesIcon() {
    return (
        <svg
            className="sidebar-icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
        </svg>
    );
}
function SparklesIcon() {
    return (
        <svg
            className="sidebar-icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
        </svg>
    );
}
function LogoutIcon() {
    return (
        <svg
            className="sidebar-icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
        </svg>
    );
}
function BookOpenIcon() {
    return (
        <svg
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="white"
            strokeWidth="2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
        </svg>
    );
}
// ------------------------------------------------------------------

export default function Sidebar({ open, onClose }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate("/login", { replace: true });
    };

    const initials = user?.name
        ? user.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
        : "U";

    return (
        <>
            {/* Mobile overlay */}
            <div
                className={`sidebar-overlay ${open ? "open" : ""}`}
                onClick={onClose}
            />

            <aside className={`sidebar ${open ? "open" : ""}`}>
                {/* Logo */}
                <NavLink
                    to="/dashboard"
                    className="sidebar-logo"
                    onClick={onClose}
                >
                    <div className="sidebar-logo-icon">
                        <BookOpenIcon />
                    </div>
                    <span className="sidebar-logo-text">Studyflow</span>
                </NavLink>

                {/* Nav */}
                <nav className="sidebar-nav">
                    <div className="sidebar-section-label">Navigation</div>

                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? "active" : ""}`
                        }
                        onClick={onClose}
                    >
                        <DashboardIcon />
                        Dashboard
                    </NavLink>

                    <NavLink
                        to="/notes"
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? "active" : ""}`
                        }
                        onClick={onClose}
                    >
                        <NotesIcon />
                        My Notes
                    </NavLink>

                    <div
                        className="sidebar-section-label"
                        style={{ marginTop: 8 }}
                    >
                        AI Tools
                    </div>

                    <NavLink
                        to="/ai-tools"
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? "active" : ""}`
                        }
                        onClick={onClose}
                    >
                        <SparklesIcon />
                        AI Tools
                    </NavLink>
                </nav>

                {/* Footer */}
                <div className="sidebar-footer">
                    {user && (
                        <div className="sidebar-user">
                            <div className="sidebar-avatar">{initials}</div>
                            <div className="sidebar-user-info">
                                <div className="sidebar-user-name">
                                    {user.name}
                                </div>
                                <div className="sidebar-user-email">
                                    {user.email}
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        className="sidebar-link"
                        onClick={handleLogout}
                        type="button"
                    >
                        <LogoutIcon />
                        Sign out
                    </button>
                </div>
            </aside>
        </>
    );
}
