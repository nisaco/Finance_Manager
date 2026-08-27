import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (pin: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  requireAuthModal: boolean;
  setRequireAuthModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [requireAuthModal, setRequireAuthModal] = useState<boolean>(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await api.checkAuthStatus();
        setIsAuthenticated(res.authenticated);
        if (!res.authenticated) {
          setRequireAuthModal(true);
        }
      } catch (err) {
        setIsAuthenticated(false);
        setRequireAuthModal(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setRequireAuthModal(true);
    };

    window.addEventListener('ledger:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('ledger:unauthorized', handleUnauthorized);
  }, []);

  const login = async (pin: string) => {
    try {
      const res = await api.login(pin);
      if (res.success) {
        setIsAuthenticated(true);
        setRequireAuthModal(false);
        return { success: true };
      }
      return { success: false, message: 'Invalid PIN' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setIsAuthenticated(false);
      setRequireAuthModal(true);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        logout,
        requireAuthModal,
        setRequireAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
