import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import Spinner from "../components/Spinner.jsx";

function BookIcon() {
    return (
        <svg
            width="18"
            height="18"
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

export default function RegisterPage() {
    const { token, register } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        if (token) {
            navigate("/dashboard", { replace: true });
        }
    }, [token, navigate]);

    const submit = async (e) => {
        e.preventDefault();

        setError("");
        setFieldErrors({});
        setSubmitting(true);

        try {
            await register({
                name,
                email,
                password,
                password_confirmation: passwordConfirmation,
            });

            navigate("/dashboard", { replace: true });
        } catch (err) {
            const status = err?.response?.status;

            if (status === 422) {
                setFieldErrors(err.response?.data?.errors || {});
            } else {
                setError(
                    err?.response?.data?.message || "Registration failed."
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                {/* Logo */}
                <div className="auth-logo">
                    <div className="auth-logo-icon">
                        <BookIcon />
                    </div>
                    <span className="auth-logo-text">Studyflow</span>
                </div>

                <h1 className="auth-title">Create your account</h1>
                <p className="auth-subtitle">
                    Start learning smarter with AI-powered notes.
                </p>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={submit}>
                    <div className="field">
                        <label className="field-label">Full name</label>
                        <input
                            className="input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            autoComplete="name"
                            required
                        />
                        {fieldErrors.name?.length && (
                            <span className="field-error">
                                {fieldErrors.name[0]}
                            </span>
                        )}
                    </div>

                    <div className="field">
                        <label className="field-label">Email address</label>
                        <input
                            className="input"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            autoComplete="email"
                            required
                        />
                        {fieldErrors.email?.length && (
                            <span className="field-error">
                                {fieldErrors.email[0]}
                            </span>
                        )}
                    </div>

                    <div className="field">
                        <label className="field-label">Password</label>
                        <input
                            className="input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            autoComplete="new-password"
                            required
                        />
                        {fieldErrors.password?.length && (
                            <span className="field-error">
                                {fieldErrors.password[0]}
                            </span>
                        )}
                    </div>

                    <div className="field">
                        <label className="field-label">Confirm password</label>
                        <input
                            className="input"
                            type="password"
                            value={passwordConfirmation}
                            onChange={(e) =>
                                setPasswordConfirmation(e.target.value)
                            }
                            placeholder="Repeat your password"
                            autoComplete="new-password"
                            required
                        />
                        {fieldErrors.password_confirmation?.length && (
                            <span className="field-error">
                                {fieldErrors.password_confirmation[0]}
                            </span>
                        )}
                    </div>

                    <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={submitting}
                        style={{ width: "100%", padding: "10px", marginTop: 6 }}
                    >
                        {submitting ? (
                            <>
                                <Spinner size="sm" color="white" /> Creating
                                account...
                            </>
                        ) : (
                            "Create account"
                        )}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account?{" "}
                    <Link className="auth-link" to="/login">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
