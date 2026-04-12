import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import Spinner from "../components/Spinner.jsx";

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

function ShieldIcon() {
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
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
        </svg>
    );
}

export default function VerifyEmailPage() {
    const { pendingVerifyEmail, verifyCode, sendVerificationCode } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [email, setEmail] = useState(
        location.state?.email || pendingVerifyEmail || ""
    );
    const [code, setCode] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [cooldown, setCooldown] = useState(0);
    const [focusedField, setFocusedField] = useState(null);

    useEffect(() => {
        if (cooldown <= 0) return;

        const timer = setTimeout(() => {
            setCooldown((prev) => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [cooldown]);

    const canVerify = useMemo(() => {
        return email.trim() !== "" && code.trim().length === 6;
    }, [email, code]);

    const onVerify = async (e) => {
        e.preventDefault();
        if (submitting) return;

        const trimmedEmail = email.trim();
        const trimmedCode = code.trim();

        setError("");
        setSuccess("");

        if (!trimmedEmail) {
            setError("Email is required.");
            return;
        }

        if (trimmedCode.length !== 6) {
            setError("Verification code must be 6 digits.");
            return;
        }

        setSubmitting(true);

        try {
            const res = await verifyCode({
                email: trimmedEmail,
                code: trimmedCode,
            });

            setSuccess(res?.data?.message || "Email verified successfully.");

            setTimeout(() => {
                navigate("/login", {
                    replace: true,
                    state: { email: trimmedEmail },
                });
            }, 800);
        } catch (err) {
            const message =
                err?.response?.data?.message ||
                err?.response?.data?.errors?.code?.[0] ||
                err?.response?.data?.errors?.email?.[0] ||
                "Verification failed. Please check the code and try again.";

            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const onResend = async () => {
        if (resending || cooldown > 0) return;

        const trimmedEmail = email.trim();

        setError("");
        setSuccess("");

        if (!trimmedEmail) {
            setError("Email is required.");
            return;
        }

        setResending(true);

        try {
            const res = await sendVerificationCode(trimmedEmail);
            setSuccess(res?.data?.message || "Verification code sent.");
            setCooldown(60);
        } catch (err) {
            const message =
                err?.response?.data?.message ||
                "Failed to resend verification code.";
            setError(message);
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-orb auth-orb-1" />
            <div className="auth-orb auth-orb-2" />
            <div className="auth-orb auth-orb-3" />
            <div className="auth-grid-overlay" />

            <div className="auth-card">
                <div className="auth-card-glow" />

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
                    <h1 className="auth-title">Verify your email</h1>
                    <p className="auth-subtitle">
                        Enter the 6-digit code sent to your email.
                    </p>
                </div>

                {error ? (
                    <div className="alert alert-error auth-alert-shake">
                        {error}
                    </div>
                ) : null}

                {success ? (
                    <div className="alert alert-success">{success}</div>
                ) : null}

                <form onSubmit={onVerify} className="auth-form">
                    <div
                        className={`auth-field${
                            focusedField === "email" ? " focused" : ""
                        }`}
                    >
                        <label className="auth-field-label">Email</label>
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
                                disabled={submitting || resending}
                                required
                            />
                        </div>
                    </div>

                    <div
                        className={`auth-field${
                            focusedField === "code" ? " focused" : ""
                        }`}
                    >
                        <label className="auth-field-label">
                            Verification code
                        </label>
                        <div className="auth-input-wrap no-right">
                            <span className="auth-input-icon">
                                <ShieldIcon />
                            </span>
                            <input
                                className="auth-input"
                                type="text"
                                inputMode="numeric"
                                value={code}
                                onChange={(e) =>
                                    setCode(
                                        e.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 6)
                                    )
                                }
                                onFocus={() => setFocusedField("code")}
                                onBlur={() => setFocusedField(null)}
                                placeholder="6-digit code"
                                autoComplete="one-time-code"
                                disabled={submitting}
                                required
                            />
                        </div>
                    </div>

                    <button
                        className={`auth-submit-btn${
                            submitting ? " loading" : ""
                        }`}
                        type="submit"
                        disabled={!canVerify || submitting}
                    >
                        <span className="auth-submit-shimmer" />
                        {submitting ? (
                            <span className="auth-submit-inner">
                                <Spinner size="sm" color="white" />
                                Verifying...
                            </span>
                        ) : (
                            <span className="auth-submit-inner">Verify</span>
                        )}
                    </button>
                </form>

                <div className="auth-divider">or</div>

                <button
                    type="button"
                    className="button buttonSecondary"
                    style={{ width: "100%" }}
                    onClick={onResend}
                    disabled={resending || cooldown > 0 || !email.trim()}
                >
                    {cooldown > 0
                        ? `Resend code in ${cooldown}s`
                        : resending
                        ? "Sending..."
                        : "Resend code"}
                </button>

                <p className="auth-footer">
                    Back to{" "}
                    <Link className="auth-link" to="/login">
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
}