import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import Spinner from "../components/Spinner.jsx";

/* ── Floating sticker data ── */
const STICKERS = [
    { emoji: "📚", cls: "sticker-1" },
    { emoji: "✨", cls: "sticker-2" },
    { emoji: "🎓", cls: "sticker-3" },
    { emoji: "💡", cls: "sticker-4" },
    { emoji: "📝", cls: "sticker-5" },
    { emoji: "🌟", cls: "sticker-6" },
    { emoji: "🚀", cls: "sticker-7" },
    { emoji: "🔬", cls: "sticker-8" },
];

function EyeIcon({ open }) {
    return open ? (
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
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
        </svg>
    ) : (
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
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
            />
        </svg>
    );
}

function MailIcon() {
    return (
        <svg
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
        </svg>
    );
}

function LockIcon() {
    return (
        <svg
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
        </svg>
    );
}

export default function LoginPage() {
    const { token, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [focusedField, setFocusedField] = useState(null);

    useEffect(() => {
        if (token) navigate("/dashboard", { replace: true });
    }, [token, navigate]);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setFieldErrors({});
        setSubmitting(true);

        try {
            await login({ email, password });
            const redirectTo = location.state?.from || "/dashboard";
            navigate(redirectTo, { replace: true });
        } catch (err) {
            const status = err?.response?.status;
            if (status === 422) {
                setFieldErrors(err.response?.data?.errors || {});
            } else if (status === 401) {
                setError("Invalid email or password.");
            } else {
                setError(
                    err?.response?.data?.message ||
                        "Login failed. Please try again."
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-page">
            {/* Animated background orbs */}
            <div className="auth-orb auth-orb-1" />
            <div className="auth-orb auth-orb-2" />
            <div className="auth-orb auth-orb-3" />

            {/* Floating emoji stickers */}
            {STICKERS.map((s) => (
                <div key={s.cls} className={`auth-sticker ${s.cls}`}>
                    {s.emoji}
                </div>
            ))}

            {/* Grid overlay */}
            <div className="auth-grid-overlay" />

            <div className="auth-card">
                {/* Glow ring behind card */}
                <div className="auth-card-glow" />

                {/* Logo */}
                <div className="auth-logo">
                    <div className="auth-logo-icon">
                        <svg
                            width="20"
                            height="20"
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
                    </div>
                    <span className="auth-logo-text">Studyflow</span>
                </div>

                <div className="auth-headline">
                    <h1 className="auth-title">Welcome back 👋</h1>
                    <p className="auth-subtitle">
                        Sign in and pick up where you left off.
                    </p>
                </div>

                {error && (
                    <div className="alert alert-error auth-alert-shake">
                        {error}
                    </div>
                )}

                <form onSubmit={submit} className="auth-form">
                    {/* Email */}
                    <div
                        className={`auth-field${
                            focusedField === "email" ? " focused" : ""
                        }${fieldErrors.email?.length ? " has-error" : ""}`}
                    >
                        <label className="auth-field-label">
                            Email address
                        </label>
                        <div className="auth-input-wrap no-right">
                            <span className="auth-input-icon">
                                <MailIcon />
                            </span>
                            <input
                                className="auth-input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setFocusedField("email")}
                                onBlur={() => setFocusedField(null)}
                                placeholder="you@example.com"
                                autoComplete="email"
                                required
                            />
                        </div>
                        {fieldErrors.email?.length && (
                            <span className="field-error">
                                {fieldErrors.email[0]}
                            </span>
                        )}
                    </div>

                    {/* Password */}
                    <div
                        className={`auth-field${
                            focusedField === "password" ? " focused" : ""
                        }${fieldErrors.password?.length ? " has-error" : ""}`}
                    >
                        <label className="auth-field-label">Password</label>
                        <div className="auth-input-wrap">
                            <span className="auth-input-icon">
                                <LockIcon />
                            </span>
                            <input
                                className="auth-input"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setFocusedField("password")}
                                onBlur={() => setFocusedField(null)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                className="auth-eye-btn"
                                onClick={() => setShowPassword((v) => !v)}
                                tabIndex={-1}
                            >
                                <EyeIcon open={showPassword} />
                            </button>
                        </div>
                        {fieldErrors.password?.length && (
                            <span className="field-error">
                                {fieldErrors.password[0]}
                            </span>
                        )}
                    </div>

                    <button
                        className={`auth-submit-btn${
                            submitting ? " loading" : ""
                        }`}
                        type="submit"
                        disabled={submitting}
                    >
                        <span className="auth-submit-shimmer" />
                        {submitting ? (
                            <span className="auth-submit-inner">
                                <Spinner size="sm" color="white" /> Signing in…
                            </span>
                        ) : (
                            <span className="auth-submit-inner">Sign in →</span>
                        )}
                    </button>
                </form>

                <p className="auth-footer">
                    Don&rsquo;t have an account?{" "}
                    <Link className="auth-link" to="/register">
                        Create one free ✨
                    </Link>
                </p>
            </div>
        </div>
    );
}
