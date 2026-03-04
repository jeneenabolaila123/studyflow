import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function LoginPage() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true });
  }, [token, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setSubmitting(true);

    try {
      await login({ email, password });
      const redirectTo = location.state?.from || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 422) {
        setFieldErrors(err.response?.data?.errors || {});
      } else if (status === 401) {
        setError('Invalid credentials.');
      } else {
        setError(err?.response?.data?.message || 'Login failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0 }}>Login</h2>
      <p className="muted">Use your API account credentials.</p>

      {error ? <div className="errorBox">{error}</div> : null}

      <form onSubmit={submit}>
        <div className="field">
          <div className="label">Email</div>
          <input
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
          {fieldErrors.email?.length ? (
            <div className="muted" style={{ color: '#991b1b' }}>
              {fieldErrors.email[0]}
            </div>
          ) : null}
        </div>

        <div className="field">
          <div className="label">Password</div>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {fieldErrors.password?.length ? (
            <div className="muted" style={{ color: '#991b1b' }}>
              {fieldErrors.password[0]}
            </div>
          ) : null}
        </div>

        <button className="button" type="submit" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="muted" style={{ marginBottom: 0, marginTop: 12 }}>
        No account? <Link className="link" to="/register">Register</Link>
      </p>
    </div>
  );
}
