import React, { createContext, useContext, useState } from 'react';

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
  const [isAuthenticated] = useState<boolean>(true);
  const [isLoading] = useState<boolean>(false);
  const [requireAuthModal, setRequireAuthModal] = useState<boolean>(false);

  const login = async (_pin: string) => {
    return { success: true };
  };

  const logout = async () => {};

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

