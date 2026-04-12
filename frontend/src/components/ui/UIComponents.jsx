import React from 'react';

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  className = '',
  ...props 
}) => {
  const baseStyles = 'font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg shadow-blue-500/30',
    secondary: 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50',
    outline: 'bg-transparent text-blue-600 border-2 border-blue-600 hover:bg-blue-50',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-lg shadow-red-500/30',
    success: 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-lg shadow-green-500/30',
    ghost: 'bg-transparent text-blue-600 hover:bg-blue-50',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export const InputField = ({ 
  label, 
  error = null, 
  icon = null,
  className = '',
  ...props 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-3.5 text-gray-400">
            {icon}
          </div>
        )}
        <input
          className={`w-full ${icon ? 'pl-12' : 'px-4'} py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
    </div>
  );
};

export const PasswordField = ({ 
  label, 
  error = null,
  showStrength = false,
  className = '',
  ...props 
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [strength, setStrength] = React.useState(0);

  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    let score = 0;
    if (pwd.length > 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    setStrength(score);

    if (props.onChange) props.onChange(e);
  };

  const strengthColors = ['bg-gray-300', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          className={`w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
          onChange={handlePasswordChange}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-3 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>

      {showStrength && (
        <div className="mt-2">
          <div className="flex gap-1 h-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all ${
                  i < strength ? strengthColors[strength] : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          {strength > 0 && (
            <p className="text-xs mt-1 text-gray-600">
              Password strength: <span className="font-semibold">{strengthLabels[strength]}</span>
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
    </div>
  );
};

export const Checkbox = ({ 
  label, 
  error = null,
  className = '',
  ...props 
}) => {
  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        className={`w-5 h-5 rounded border-2 border-gray-300 focus:border-blue-500 cursor-pointer accent-blue-600 ${className}`}
        {...props}
      />
      {label && (
        <label className="ml-2 text-sm text-gray-700 cursor-pointer">
          {label}
        </label>
      )}
      {error && (
        <p className="text-red-500 text-sm ml-auto">
          {error}
        </p>
      )}
    </div>
  );
};

export const Card = ({ 
  children, 
  className = '',
  glassmorphism = false,
  ...props 
}) => {
  const styles = glassmorphism
    ? 'backdrop-blur-md bg-white/10 border border-white/20'
    : 'bg-white border border-gray-100';

  return (
    <div
      className={`${styles} rounded-3xl shadow-xl p-6 md:p-8 transition-all duration-300 hover:shadow-2xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const Badge = ({ 
  children, 
  variant = 'primary',
  className = '',
  ...props 
}) => {
  const variants = {
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    gray: 'bg-gray-100 text-gray-800',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export const Loader = ({ fullscreen = false }) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
      </div>
      <p className="text-gray-600 font-semibold">Loading...</p>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};

export const Alert = ({ 
  type = 'info', 
  variant,
  showIcon = false,
  title = '', 
  message = '', 
  onClose = null,
  className = '',
  ...props 
}) => {
  const types = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
  };

  const config = types[variant || type] || types.info;

  return (
    <div
      className={`${config.bg} border-l-4 ${config.border} p-4 rounded-lg ${config.text} ${className}`}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div>
          {title && <h3 className="font-semibold">{title}</h3>}
          {message && <p className="text-sm">{message}</p>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-sm font-medium opacity-70 hover:opacity-100 transition-opacity"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};
