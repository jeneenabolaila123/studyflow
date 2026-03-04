import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function RegisterPage() {
  const { token, register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
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
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 422) {
        setFieldErrors(err.response?.data?.errors || {});
      } else {
        setError(err?.response?.data?.message || 'Registration failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0 }}>Register</h2>
      <p className="muted">Creates an API user and returns a token.</p>

      {error ? <div className="errorBox">{error}</div> : null}

      <form onSubmit={submit}>
        <div className="field">
          <div className="label">Name</div>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
          {fieldErrors.name?.length ? (
            <div className="muted" style={{ color: '#991b1b' }}>
              {fieldErrors.name[0]}
            </div>
          ) : null}
        </div>

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
            autoComplete="new-password"
          />
          {fieldErrors.password?.length ? (
            <div className="muted" style={{ color: '#991b1b' }}>
              {fieldErrors.password[0]}
            </div>
          ) : null}
        </div>

        <div className="field">
          <div className="label">Confirm password</div>
          <input
            className="input"
            type="password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            autoComplete="new-password"
          />
          {fieldErrors.password_confirmation?.length ? (
            <div className="muted" style={{ color: '#991b1b' }}>
              {fieldErrors.password_confirmation[0]}
            </div>
          ) : null}
        </div>

        <button className="button" type="submit" disabled={submitting}>
          {submitting ? 'Creating...' : 'Register'}
        </button>
      </form>

      <p className="muted" style={{ marginBottom: 0, marginTop: 12 }}>
        Already have an account? <Link className="link" to="/login">Login</Link>
      </p>
    </div>
  );
}
