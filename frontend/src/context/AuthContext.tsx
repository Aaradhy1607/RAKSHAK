import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User, LoginPayload, RegisterCitizenPayload, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<User>;
  registerCitizen: (payload: RegisterCitizenPayload) => Promise<User>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<User | null>;
  isAuthority: boolean;
  isAdmin: boolean;
  isCitizen: boolean;
  userRole: UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'rakshak_auth_token';
const USER_KEY = 'rakshak_user_data';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const saveAuthSession = useCallback((newToken: string, newUser: User, remember: boolean = true) => {
    setToken(newToken);
    setUser(newUser);
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, newToken);
    storage.setItem(USER_KEY, JSON.stringify(newUser));

    // Clear the opposite storage to prevent desync
    if (remember) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  const clearAuthSession = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }, []);

  // Validate session on mount
  useEffect(() => {
    const verifySession = async () => {
      const activeToken = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
      if (!activeToken) {
        setIsLoading(false);
        return;
      }

      try {
        const verifiedUser = await api.getCurrentUser();
        setUser(verifiedUser);
        const remember = !!localStorage.getItem(TOKEN_KEY);
        saveAuthSession(activeToken, verifiedUser, remember);
      } catch (err) {
        console.warn('Session verification failed, logging out', err);
        clearAuthSession();
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, [saveAuthSession, clearAuthSession]);

  const login = async (payload: LoginPayload): Promise<User> => {
    setError(null);
    setIsLoading(true);
    try {
      const resp = await api.login(payload);
      saveAuthSession(resp.token, resp.user, true);
      return resp.user;
    } catch (err: any) {
      const msg = err.message || 'Authentication failed. Please check credentials.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const registerCitizen = async (payload: RegisterCitizenPayload): Promise<User> => {
    setError(null);
    setIsLoading(true);
    try {
      const resp = await api.registerCitizen(payload);
      saveAuthSession(resp.token, resp.user, true);
      return resp.user;
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Please try again.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await api.logout();
    } catch (e) {
      console.warn('Logout network error', e);
    } finally {
      clearAuthSession();
      setIsLoading(false);
    }
  };

  const refreshUser = async (): Promise<User | null> => {
    try {
      const updatedUser = await api.getCurrentUser();
      setUser(updatedUser);
      if (token) {
        const remember = !!localStorage.getItem(TOKEN_KEY);
        saveAuthSession(token, updatedUser, remember);
      }
      return updatedUser;
    } catch {
      return null;
    }
  };

  const isAuthority = user?.role === 'AUTHORITY' || user?.role === 'ADMIN';
  const isAdmin = user?.role === 'ADMIN';
  const isCitizen = user?.role === 'CITIZEN';
  const userRole = user?.role || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        error,
        login,
        registerCitizen,
        logout,
        clearError,
        refreshUser,
        isAuthority,
        isAdmin,
        isCitizen,
        userRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
