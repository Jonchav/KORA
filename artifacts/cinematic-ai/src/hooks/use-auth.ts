import { useState, useCallback } from "react";

const TOKEN_KEY = "kora_access_token";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Incorrect password");
        return false;
      }
      const { token: t } = await res.json();
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
      return true;
    } catch {
      setError("Connection error — try again");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  return { token, isAuthenticated: !!token, login, logout, error, loading };
}
