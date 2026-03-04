import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import NoteDetailsPage from './pages/NoteDetailsPage.jsx';
import { useAuth } from './auth/AuthContext.jsx';
import axiosClient from './api/axiosClient.js';

function App() {
  const { user, token, logout } = useAuth();
  const [apiConnected, setApiConnected] = useState(null);

  // ✅ Test backend connectivity from frontend (runs on every app load)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await axiosClient.get('/ping');
        console.log('PING:', res.data);
        if (!cancelled) setApiConnected(true);
      } catch (err) {
        console.error('PING ERROR:', err);
        if (!cancelled) setApiConnected(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="container topbarInner">
          <Link className="brand" to={token ? '/dashboard' : '/login'}>
            Studyflow
          </Link>

          <nav className="nav">
            <span className="muted">
              API:{' '}
              {apiConnected === null
                ? 'Checking…'
                : apiConnected
                ? 'Connected ✅'
                : 'Disconnected ❌'}
            </span>

            {token ? (
              <>
                <span className="muted">{user?.email}</span>
                <button className="button" onClick={logout} type="button">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className="link" to="/login">
                  Login
                </Link>
                <Link className="link" to="/register">
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="container main">
        <Routes>
          <Route
            path="/"
            element={<Navigate to={token ? '/dashboard' : '/login'} replace />}
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/notes/:id" element={<NoteDetailsPage />} />
          </Route>

          <Route path="*" element={<div>Not found.</div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;