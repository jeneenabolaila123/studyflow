import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthCard } from '../components/auth/AuthCard.jsx';
import { InputField, PasswordField, Button, Alert } from '../components/ui/UIComponents.jsx';

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: location.state?.email || '',
    code: '',
    password: '',
    password_confirmation: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCodeChange = (e) => {
    const numeric = e.target.value.replace(/\D/g, '').slice(0, 6);
    setFormData(prev => ({
      ...prev,
      code: numeric,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!formData.email.trim()) {
        setError('Email is required');
        setLoading(false);
        return;
      }
      if (!formData.code || formData.code.length !== 6) {
        setError('Reset code must be 6 digits');
        setLoading(false);
        return;
      }
      if (!formData.password) {
        setError('New password is required');
        setLoading(false);
        return;
      }
      if (formData.password !== formData.password_confirmation) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          code: formData.code,
          password: formData.password,
          password_confirmation: formData.password_confirmation,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to reset password. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>

      <AuthCard>
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-400 rounded-full flex items-center justify-center text-white text-2xl">
              🔒
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Reset Password
          </h1>
          <p className="text-gray-400 text-sm">
            Enter the code from your email and set a new password
          </p>
        </div>

        {error && <Alert variant="error" showIcon>{error}</Alert>}
        {success && <Alert variant="success" showIcon>{success}</Alert>}
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Email Field */}
          <InputField
            icon="📧"
            type="email"
            placeholder="your@email.com"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            disabled={loading}
            autoComplete="email"
          />

          {/* Reset Code */}
          <div>
            <InputField
              icon="🔐"
              type="text"
              placeholder="Enter 6-digit code"
              name="code"
              value={formData.code}
              onChange={handleCodeChange}
              maxLength="6"
              disabled={loading}
              autoComplete="off"
            />
            <p className="text-xs text-gray-400 mt-2 text-center">
              {formData.code.length > 0 && `${formData.code.length}/6 characters`}
            </p>
          </div>

          {/* New Password */}
          <PasswordField
            placeholder="New password (min 8 characters)"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            disabled={loading}
            autoComplete="new-password"
          />

          {/* Confirm Password */}
          <PasswordField
            placeholder="Confirm new password"
            name="password_confirmation"
            value={formData.password_confirmation}
            onChange={handleInputChange}
            disabled={loading}
            autoComplete="new-password"
          />

          {/* Reset Button */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={loading || formData.code.length !== 6}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>

        {/* Login Link */}
        <div className="text-center mt-6 pt-6 border-t border-white/10">
          <p className="text-gray-400 text-sm">
            Remembered your password?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </AuthCard>
    </div>
  );
}
