import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login, logout, refreshUser } from '../api/client.js';

const AuthContext = createContext();
const TOKEN_KEY = 'primini:authToken';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() =>
    typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY)
  );
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      refreshUser(token)
        .then(setUser)
        .catch(() => {
          setToken(null);
          setUser(null);
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(TOKEN_KEY);
          }
        });
    }
  }, [token]);

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: Boolean(token),
    async login(credentials) {
      const data = await login(credentials);
      setToken(data.key);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(TOKEN_KEY, data.key);
      }
      const currentUser = await refreshUser(data.key);
      setUser(currentUser);
    },
    async logout() {
      if (token) {
        await logout();
      }
      setToken(null);
      setUser(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(TOKEN_KEY);
      }
    },
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return ctx;
}
