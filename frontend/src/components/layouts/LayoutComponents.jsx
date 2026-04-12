import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/endpoints';

export const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2 font-bold text-2xl text-blue-600 hover:scale-105 transition-transform">
            <span>📚</span>
            <span>StudyFlow</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <p className="text-gray-600">
              Welcome, <span className="font-semibold text-gray-800">{user?.name}</span>
            </p>
            <div className="relative group">
              <button className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold flex items-center justify-center hover:shadow-lg transition-all">
                {user?.name.charAt(0).toUpperCase()}
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 py-2 z-50">
                <Link to="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                  👤 Profile
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                    ⚙️ Admin Panel
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="md:hidden text-2xl"
          >
            {showMenu ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Menu */}
        {showMenu && (
          <div className="md:hidden pb-4 space-y-2 animate-slide-down">
            <p className="text-gray-600 px-2">Welcome, {user?.name}</p>
            <Link to="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              👤 Profile
            </Link>
            {isAdmin && (
              <Link to="/admin" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                ⚙️ Admin Panel
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              🚪 Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export const Sidebar = ({ isOpen, onClose }) => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const menuItems = isAdmin
    ? [
        { label: 'Dashboard', icon: '📊', path: '/admin' },
        { label: 'Users', icon: '👥', path: '/admin/users' },
        { label: 'Settings', icon: '⚙️', path: '/admin/settings' },
      ]
    : [
        { label: 'Dashboard', icon: '🏠', path: '/dashboard' },
        { label: 'Notes', icon: '📝', path: '/notes' },
        { label: 'Quizzes', icon: '🎯', path: '/quizzes' },
      ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 shadow-lg z-40 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-8">Menu</h2>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  onClose();
                }}
                className="w-full text-left px-4 py-3 rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 font-medium flex items-center gap-3"
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

export const DashboardLayout = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {title && (
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">{title}</h1>
                <p className="text-gray-600">Manage your content and settings</p>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
