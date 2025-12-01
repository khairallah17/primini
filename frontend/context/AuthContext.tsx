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
  username?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: 'admin' | 'client' | 'user' | 'visitor';
};

type AuthContextValue = {
  user: User | null;
  tokens: AuthTokens | null;
  loading: boolean;
  isAdmin: boolean;
  isClient: boolean;
  isUser: boolean;
  isVisitor: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, unknown>) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'primini_auth';

function getAuthHeader(tokens: AuthTokens | null): Record<string, string> | undefined {
  if (!tokens) {
    console.warn('getAuthHeader called with null tokens');
    return undefined;
  }
  if (tokens.access) {
    const header = { Authorization: `Bearer ${tokens.access}` };
    console.log('Using Bearer token for auth');
    return header;
  }
  if (tokens.key) {
    const header = { Authorization: `Token ${tokens.key}` };
    console.log('Using Token for auth, token length:', tokens.key.length);
    return header;
  }
  console.warn('No valid token found in tokens object:', tokens);
  return undefined;
}

function usePersistedAuth(): [AuthTokens | null, (value: AuthTokens | null) => void] {
  const [value, setValue] = useState<AuthTokens | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log('No stored auth tokens found');
      return null;
    }
    try {
      const parsed = JSON.parse(stored) as AuthTokens;
      console.log('Loaded tokens from localStorage:', { 
        hasKey: !!parsed.key, 
        hasAccess: !!parsed.access,
        keyLength: parsed.key?.length || 0
      });
      return parsed;
    } catch (error) {
      console.warn('Failed to parse auth tokens', error);
      return null;
    }
  });

  const update = useCallback((next: AuthTokens | null) => {
    setValue(next);
    if (typeof window === 'undefined') return;
    if (next) {
      console.log('Storing tokens to localStorage:', { 
        hasKey: !!next.key, 
        hasAccess: !!next.access,
        keyLength: next.key?.length || 0
      });
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      console.log('Clearing tokens from localStorage');
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
        const authHeaders = getAuthHeader(tokens);
        console.log('Fetching user on mount/update with headers:', authHeaders);
        
        const response = await api.get<User>('/auth/user/', {
          headers: authHeaders
        });
        
        console.log('User fetched successfully:', JSON.stringify(response.data, null, 2));
        console.log('User role from API:', response.data.role);
        
        // Ensure role is set from API response
        const userData = {
          ...response.data,
          role: response.data.role || 'visitor' // Default to visitor if role not provided
        };
        console.log('Setting user data:', JSON.stringify(userData, null, 2));
        console.log('isAdmin will be:', userData.role === 'admin');
        setUser(userData);
      } catch (error: any) {
        console.error('Failed to fetch user profile:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        // Only clear tokens if it's an authentication error (401)
        if (error.response?.status === 401) {
          setTokens(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    }
    void fetchUser();
  }, [setTokens, tokens]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.post<AuthTokens>('/auth/login/', {
        email,
        password
      });
      
      // Log the response to debug token storage
      console.log('Login response:', response.data);
      console.log('Login response keys:', Object.keys(response.data || {}));
      
      // Ensure we have a token (key for Token auth, or access for JWT)
      // dj-rest-auth typically returns { key: "..." } for Token authentication
      const responseData = response.data as any;
      const tokens: AuthTokens = {
        key: responseData.key || responseData.token || responseData.token_key, // Support multiple field names
        access: responseData.access,
        refresh: responseData.refresh,
      };
      
      // Verify token exists
      if (!tokens.key && !tokens.access) {
        console.error('No token received in login response:', response.data);
        console.error('Response structure:', JSON.stringify(response.data, null, 2));
        throw new Error('Aucun token reçu lors de la connexion. Réponse: ' + JSON.stringify(response.data));
      }
      
      console.log('Token extracted successfully:', { 
        hasKey: !!tokens.key, 
        hasAccess: !!tokens.access,
        keyPreview: tokens.key ? tokens.key.substring(0, 10) + '...' : 'none'
      });
      
      // Store tokens
      setTokens(tokens);
      
      // Immediately fetch user data including role after login
      try {
        const authHeaders = getAuthHeader(tokens);
        console.log('Fetching user with headers:', authHeaders);
        
        const userResponse = await api.get<User>('/auth/user/', {
          headers: authHeaders
        });
        
        console.log('User response:', JSON.stringify(userResponse.data, null, 2));
        console.log('User role from API:', userResponse.data.role);
        
        // Ensure role is set from API response
        const userData = {
          ...userResponse.data,
          role: userResponse.data.role || 'visitor'
        };
        console.log('Setting user data:', JSON.stringify(userData, null, 2));
        setUser(userData);
      } catch (error: any) {
        console.error('Failed to fetch user profile after login:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        // Don't clear tokens, let the useEffect handle it
        throw error; // Re-throw to let LoginScreen handle it
      }
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

  const isAdmin = useMemo(() => user?.role === 'admin' || false, [user]);
  const isClient = useMemo(() => user?.role === 'client' || false, [user]);
  const isUser = useMemo(() => user?.role === 'user' || false, [user]);
  const isVisitor = useMemo(() => user?.role === 'visitor' || false, [user]);

  const value = useMemo(
    () => ({ user, tokens, loading, isAdmin, isClient, isUser, isVisitor, login, register, logout }),
    [loading, login, logout, register, tokens, user, isAdmin, isClient, isUser, isVisitor]
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
