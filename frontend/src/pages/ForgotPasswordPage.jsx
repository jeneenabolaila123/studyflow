import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { AuthCard } from '../components/auth/AuthCard.jsx';
import { InputField, Button, Alert } from '../components/ui/UIComponents.jsx';

export default function ForgotPasswordPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!email.trim()) {
        setError('Email is required');
        setLoading(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to send reset code. Please try again.');
        setLoading(false);
        return;
      }

      // Success
      setSuccess('Reset code sent! Check your email for further instructions.');
      setEmail('');
      
      // Redirect after brief delay
      setTimeout(() => {
        navigate('/reset-password', {
          replace: true,
          state: { email: email.trim() },
        });
      }, 2500);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('An error occurred. Please try again.');
      setLoading(false);
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
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-400 rounded-full flex items-center justify-center text-white text-2xl">
              🔑
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Reset Password
          </h1>
          <p className="text-gray-400 text-sm">
            Enter your email and we'll send you a reset code
          </p>
        </div>

        {error && <Alert variant="error" showIcon>{error}</Alert>}
        {success && <Alert variant="success" showIcon>{success}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <InputField
            icon="📧"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
          />

          {/* Submit Button */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={loading || !email.trim()}
          >
            {loading ? 'Sending...' : 'Send Reset Code'}
          </Button>
        </form>

        {/* Links */}
        <div className="text-center mt-6 pt-6 border-t border-white/10 space-y-3">
          <div>
            <p className="text-gray-400 text-sm">
              Remember your password?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                Sign In
              </Link>
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">
              Need an account?{' '}
              <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                Create One
              </Link>
            </p>
          </div>
        </div>
      </AuthCard>
    </div>
  );
}
