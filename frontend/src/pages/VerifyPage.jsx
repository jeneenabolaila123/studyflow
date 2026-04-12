import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.jsx';

export default function VerifyPage() {
  const { pendingVerifyEmail, sendVerificationCode, verifyCode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(
    location.state?.email || pendingVerifyEmail || ''
  );

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputsRef = useRef([]);

  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [timeLeft, setTimeLeft] = useState(30);

  // =========================
  // TIMER
  // =========================
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // =========================
  // HANDLE OTP INPUT
  // =========================
  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // move forward
    if (value && index < 5) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleBackspace = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  // =========================
  // VERIFY
  // =========================
  const onVerify = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const code = otp.join('');

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await verifyCode({ email, code });

      setSuccess('Email verified 🎉');
      navigate('/login');

    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid code');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================
  // RESEND
  // =========================
  const onResend = async () => {
    if (resending || timeLeft > 0) return;

    setResending(true);
    setError('');

    try {
      await sendVerificationCode(email);
      setSuccess('New code sent 📧');
      setTimeLeft(30);
    } catch {
      setError('Failed to resend');
    } finally {
      setResending(false);
    }
  };

  // =========================
  // UI
  // =========================
  return (
    <div className="authLayout">
      <div className="card authCard" style={{ textAlign: 'center' }}>
        
        <h2>Verify your email</h2>
        <p className="muted">{email}</p>

        {error && <div className="errorBox">{error}</div>}
        {success && <div className="pill">{success}</div>}

        {/* OTP INPUTS */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '20px 0' }}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputsRef.current[index] = el)}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleBackspace(e, index)}
              maxLength={1}
              style={{
                width: '45px',
                height: '55px',
                textAlign: 'center',
                fontSize: '22px',
                borderRadius: '10px',
                border: '1px solid #ddd',
              }}
            />
          ))}
        </div>

        {/* VERIFY BUTTON */}
        <button
          className="button buttonAccent"
          onClick={onVerify}
          disabled={submitting}
        >
          {submitting ? 'Verifying...' : 'Verify'}
        </button>

        {/* RESEND */}
        <div style={{ marginTop: '15px' }}>
          <button
            className="button buttonSecondary"
            onClick={onResend}
            disabled={timeLeft > 0}
          >
            {timeLeft > 0 ? `Wait ${timeLeft}s` : 'Resend Code'}
          </button>

          {timeLeft > 0 && (
            <p className="muted">Resend in {timeLeft}s</p>
          )}
        </div>

        <p className="muted" style={{ marginTop: '15px' }}>
          Back to <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}