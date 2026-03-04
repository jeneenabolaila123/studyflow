import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const setAuthToken = (newToken) => {
    if (newToken) {
      localStorage.setItem('token', newToken);
      setToken(newToken);
    } else {
      localStorage.removeItem('token');
      setToken(null);
    }
  };

  const fetchMe = async () => {
    if (!localStorage.getItem('token')) {
      setUser(null);
      return;
    }

    const res = await axiosClient.get('/auth/me');
    setUser(res.data?.data || null);
  };

  const login = async ({ email, password }) => {
    const res = await axiosClient.post('/auth/login', { email, password });
    const newToken = res.data?.data?.token;

    setAuthToken(newToken);
    await fetchMe();
    return res;
  };

  const register = async ({ name, email, password, password_confirmation }) => {
    const res = await axiosClient.post('/auth/register', {
      name,
      email,
      password,
      password_confirmation,
    });
    const newToken = res.data?.data?.token;

    setAuthToken(newToken);
    await fetchMe();
    return res;
  };

  const logout = async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      setAuthToken(null);
      setUser(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (localStorage.getItem('token')) {
          await fetchMe();
          if (!mounted) return;
          setToken(localStorage.getItem('token'));
        }
      } catch {
        if (!mounted) return;
        setAuthToken(null);
        setUser(null);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    init();

    const onForcedLogout = () => {
      setAuthToken(null);
      setUser(null);
    };

    window.addEventListener('auth:logout', onForcedLogout);

    return () => {
      mounted = false;
      window.removeEventListener('auth:logout', onForcedLogout);
    };
  }, []);

  const value = useMemo(
    () => ({ token, user, loading, login, register, logout, fetchMe }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
