'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/apiClient';

type AuthTokens = {
  key?: string;
  access?: string;
  refresh?: string;
};

type User = {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
};

type AuthContextValue = {
  user: User | null;
  tokens: AuthTokens | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, unknown>) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'primini_auth';

function getAuthHeader(tokens: AuthTokens | null) {
  if (!tokens) return undefined;
  if (tokens.access) {
    return { Authorization: `Bearer ${tokens.access}` };
  }
  if (tokens.key) {
    return { Authorization: `Token ${tokens.key}` };
  }
  return undefined;
}

function usePersistedAuth(): [AuthTokens | null, (value: AuthTokens | null) => void] {
  const [value, setValue] = useState<AuthTokens | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as AuthTokens;
    } catch (error) {
      console.warn('Failed to parse auth tokens', error);
      return null;
    }
  });

  const update = useCallback((next: AuthTokens | null) => {
    setValue(next);
    if (typeof window === 'undefined') return;
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return [value, update];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = usePersistedAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchUser() {
      setLoading(true);
      if (!tokens?.access && !tokens?.key) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const response = await api.get<User>('/auth/user/', {
          headers: getAuthHeader(tokens)
        });
        setUser(response.data);
      } catch (error) {
        console.warn('Failed to fetch user profile', error);
        setTokens(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    void fetchUser();
  }, [setTokens, tokens?.access, tokens?.key]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.post<AuthTokens>('/auth/login/', {
        email,
        password
      });
      setTokens(response.data);
    },
    [setTokens]
  );

  const register = useCallback(
    async (data: Record<string, unknown>) => {
      await api.post('/auth/registration/', data);
    },
    []
  );

  const logout = useCallback(() => {
    setTokens(null);
    setUser(null);
  }, [setTokens]);

  const value = useMemo(
    () => ({ user, tokens, loading, login, register, logout }),
    [loading, login, logout, register, tokens, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
