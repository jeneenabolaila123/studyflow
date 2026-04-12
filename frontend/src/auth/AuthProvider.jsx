import { useState, useEffect } from "react";
import axiosClient from "../api/axiosClient";
import AuthContext from "./AuthContext";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    if (token) {
      axiosClient.get("/auth/me")
        .then(({ data }) => {
          setUser(data.user || data);
        })
        .catch(() => {
          setUser(null);
        });
    }
  }, [token]);

  const login = (token) => {
    localStorage.setItem("token", token);
    setToken(token);
  };

  const logout = async () => {
    try {
      await axiosClient.post("/auth/logout");
    } catch {}

    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};