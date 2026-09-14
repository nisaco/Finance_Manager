import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';

interface RegisterData {
  username: string;
  email: string;
  password: string;
  agreedToTerms: boolean;
}

interface LoginData {
  usernameOrEmail: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginData) => Promise<{ success: boolean; error?: string }>;
  adminLogin: (secretKey: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: (reason?: string) => Promise<void>;
  setUserRole: (role: 'admin' | 'user') => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  loginWithGoogle: (data: {
    credential?: string;
    email?: string;
    name?: string;
    requestedUsername?: string;
  }) => Promise<{ success: boolean; isNewUser?: boolean; user?: User; error?: string }>;
  updateUsername: (newUsername: string) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (identifier: string) => Promise<{
    success: boolean;
    message?: string;
    email?: string;
    maskedEmail?: string;
    username?: string;
    emailSent?: boolean;
    isMockOrFallback?: boolean;
    error?: string;
  }>;
  resetPassword: (data: { email?: string; identifier?: string; code: string; newPassword: string }) => Promise<{ success: boolean; message?: string; error?: string }>;
  requireAuthModal: boolean;
  setRequireAuthModal: (show: boolean) => void;
  openAuthModal: (mode?: 'login' | 'register') => void;
  authModalMode: 'login' | 'register';
  setAuthModalMode: (mode: 'login' | 'register') => void;
  sessionExpiredMessage: string | null;
  clearSessionExpiredMessage: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [requireAuthModal, setRequireAuthModal] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(() => {
    return localStorage.getItem('ledger_session_expired') || null;
  });

  const clearSessionExpiredMessage = useCallback(() => {
    localStorage.removeItem('ledger_session_expired');
    setSessionExpiredMessage(null);
  }, []);

  const openAuthModal = useCallback((mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setRequireAuthModal(true);
  }, []);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('ledger_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/auth/me', {
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          setIsAuthenticated(true);
          localStorage.setItem('ledger_last_activity', Date.now().toString());
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Session Inactivity Timeout Tracker
  useEffect(() => {
    if (!isAuthenticated) return;

    const updateActivity = () => {
      localStorage.setItem('ledger_last_activity', Date.now().toString());
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    let lastThrottledTime = 0;
    const throttledHandler = () => {
      const now = Date.now();
      if (now - lastThrottledTime > 15000) { // Throttle every 15s
        lastThrottledTime = now;
        updateActivity();
      }
    };

    events.forEach(evt => window.addEventListener(evt, throttledHandler, { passive: true }));

    // Periodic check for inactivity
    const interval = setInterval(() => {
      const lastActiveStr = localStorage.getItem('ledger_last_activity');
      if (lastActiveStr) {
        const lastActive = parseInt(lastActiveStr, 10);
        if (Date.now() - lastActive > INACTIVITY_TIMEOUT_MS) {
          const reason = 'Your session expired due to 15 minutes of inactivity. Please sign in again.';
          localStorage.setItem('ledger_session_expired', reason);
          setSessionExpiredMessage(reason);
          logout();
        }
      }
    }, 20000);

    return () => {
      events.forEach(evt => window.removeEventListener(evt, throttledHandler));
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const login = async ({ usernameOrEmail, password }: LoginData) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ usernameOrEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to sign in' };
      }

      if (data.token) {
        localStorage.setItem('ledger_token', data.token);
      }
      localStorage.setItem('ledger_last_activity', Date.now().toString());
      clearSessionExpiredMessage();

      if (data.user?.role === 'admin' || data.user?.email?.toLowerCase() === 'jnkpappoe@gmail.com') {
        localStorage.setItem('ledger_open_admin_modal', 'true');
      }

      setUser(data.user);
      setIsAuthenticated(true);
      setRequireAuthModal(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  };

  const adminLogin = async (secretKey: string) => {
    try {
      const res = await fetch('/api/auth/stealth-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ secretKey: secretKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid Admin Secret Key. Access denied.' };
      }

      if (data.token) {
        localStorage.setItem('ledger_token', data.token);
      }
      localStorage.setItem('ledger_last_activity', Date.now().toString());
      localStorage.setItem('ledger_open_admin_modal', 'true');
      clearSessionExpiredMessage();

      setUser(data.user);
      setIsAuthenticated(true);
      setRequireAuthModal(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error authenticating admin' };
    }
  };

  const register = async ({ username, email, password, agreedToTerms }: RegisterData) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, email, password, agreedToTerms }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to register account' };
      }

      if (data.token) {
        localStorage.setItem('ledger_token', data.token);
      }
      localStorage.setItem('ledger_last_activity', Date.now().toString());
      clearSessionExpiredMessage();
      setUser(data.user);
      setIsAuthenticated(true);
      setRequireAuthModal(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during registration' };
    }
  };

  const loginWithGoogle = async ({
    credential,
    email,
    name,
    requestedUsername,
  }: {
    credential?: string;
    email?: string;
    name?: string;
    requestedUsername?: string;
  }) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential, email, name, requestedUsername }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to authenticate with Google' };
      }

      if (data.token) {
        localStorage.setItem('ledger_token', data.token);
      }
      localStorage.setItem('ledger_last_activity', Date.now().toString());
      clearSessionExpiredMessage();

      if (data.user?.role === 'admin' || data.user?.email?.toLowerCase() === 'jnkpappoe@gmail.com') {
        localStorage.setItem('ledger_open_admin_modal', 'true');
      }

      setUser(data.user);
      setIsAuthenticated(true);
      setRequireAuthModal(false);
      return { success: true, isNewUser: data.isNewUser, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during Google sign-in' };
    }
  };

  const updateUsername = async (newUsername: string) => {
    try {
      const token = localStorage.getItem('ledger_token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/auth/username', {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ username: newUsername }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update username' };
      }

      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error updating username' };
    }
  };

  const forgotPassword = async (identifier: string) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to request password reset' };
      }
      return {
        success: true,
        message: data.message,
        email: data.email,
        maskedEmail: data.maskedEmail,
        username: data.username,
        emailSent: data.emailSent,
        isMockOrFallback: data.isMockOrFallback,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error requesting password reset' };
    }
  };

  const resetPassword = async (data: { email?: string; identifier?: string; code: string; newPassword: string }) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Failed to reset password' };
      }
      if (resData.token) {
        localStorage.setItem('ledger_token', resData.token);
      }
      if (resData.user) {
        setUser(resData.user);
        setIsAuthenticated(true);
        setRequireAuthModal(false);
      }
      return { success: true, message: resData.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error resetting password' };
    }
  };

  const logout = async (reason?: string) => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}
    localStorage.removeItem('ledger_token');
    localStorage.removeItem('ledger_last_activity');
    if (reason) {
      localStorage.setItem('ledger_session_expired', reason);
      setSessionExpiredMessage(reason);
    }
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshUser = useCallback(async () => {
    await checkAuth();
  }, [checkAuth]);

  const setUserRole = async (role: 'admin' | 'user') => {
    try {
      const token = localStorage.getItem('ledger_token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/user/role', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ role }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update user role' };
      }

      if (data.user) {
        setUser(data.user);
      } else {
        setUser((prev) => (prev ? { ...prev, role } : null));
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error updating role' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        adminLogin,
        register,
        logout,
        setUserRole,
        refreshUser,
        loginWithGoogle,
        updateUsername,
        forgotPassword,
        resetPassword,
        requireAuthModal,
        setRequireAuthModal,
        openAuthModal,
        authModalMode,
        setAuthModalMode,
        sessionExpiredMessage,
        clearSessionExpiredMessage,
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
