import React from 'react';
import { Link } from 'react-router-dom';

export const AuthCard = ({ 
  title, 
  subtitle,
  children, 
  footerText,
  footerLink,
  className = '',
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 flex items-center justify-center p-4">
      {/* Background animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Card */}
      <div className={`relative w-full max-w-md animate-fade-in ${className}`}>
        {/* Glassmorphism effect */}
        <div className="backdrop-blur-md bg-white/20 rounded-3xl border border-white/30 shadow-2xl p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <span>📚</span>
              <span>StudyFlow</span>
            </h1>
            <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
            {subtitle && (
              <p className="text-white/80">{subtitle}</p>
            )}
          </div>

          {/* Form */}
          <div className="space-y-4">
            {children}
          </div>

          {/* Footer */}
          {footerText && footerLink && (
            <div className="mt-8 text-center">
              <p className="text-white/80 text-sm">
                {footerText}{' '}
                <Link
                  to={footerLink.path}
                  className="text-white font-semibold hover:underline transition-all"
                >
                  {footerLink.text}
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Decoration */}
        <div className="mt-8 text-center text-white/60 text-sm">
          <p>Your trusted study companion</p>
        </div>
      </div>
    </div>
  );
};

export const AuthCardAlt = ({ 
  title, 
  children,
  className = '',
}) => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className={`w-full max-w-md animate-fade-in ${className}`}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">StudyFlow</h1>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-3xl p-8 md:p-10 shadow-lg">
          {children}
        </div>
      </div>
    </div>
  );
};
