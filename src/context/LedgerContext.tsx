import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Profile, Transaction, Budget, Goal, Debt, SummaryReport } from '../types';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

interface LedgerContextType {
  profiles: Profile[];
  activeProfile: Profile | null;
  setActiveProfileId: (id: string) => void;
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  debts: Debt[];
  summary: SummaryReport | null;
  isLoading: boolean;
  refreshData: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  clearNotification: () => void;
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const clearNotification = () => setNotification(null);

  // Load profiles first
  const fetchProfiles = useCallback(async () => {
    try {
      const data = await api.getProfiles();
      setProfiles(data);
      if (data.length > 0 && !activeProfileId) {
        // Retrieve last chosen profile from localStorage or default to first
        const saved = localStorage.getItem('ledger_active_profile');
        const match = data.find((p) => p.id === saved);
        setActiveProfileId(match ? match.id : data[0].id);
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
    }
  }, [activeProfileId]);

  // Load all profile-specific resources
  const refreshData = useCallback(async () => {
    if (!isAuthenticated || !activeProfileId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [txs, bgts, gls, dbts, sum] = await Promise.all([
        api.getTransactions(activeProfileId),
        api.getBudgets(activeProfileId),
        api.getGoals(activeProfileId),
        api.getDebts(activeProfileId),
        api.getSummaryReport(activeProfileId),
      ]);
      setTransactions(txs);
      setBudgets(bgts);
      setGoals(gls);
      setDebts(dbts);
      setSummary(sum);
    } catch (err: any) {
      console.error('Error refreshing profile data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, activeProfileId]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfiles();
    }
  }, [isAuthenticated, fetchProfiles]);

  useEffect(() => {
    if (activeProfileId) {
      localStorage.setItem('ledger_active_profile', activeProfileId);
      refreshData();
    }
  }, [activeProfileId, refreshData]);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0] || null;

  const handleSetActiveProfileId = (id: string) => {
    setActiveProfileId(id);
  };

  return (
    <LedgerContext.Provider
      value={{
        profiles,
        activeProfile,
        setActiveProfileId: handleSetActiveProfileId,
        transactions,
        budgets,
        goals,
        debts,
        summary,
        isLoading,
        refreshData,
        notify,
        notification,
        clearNotification,
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
};

export const useLedger = () => {
  const context = useContext(LedgerContext);
  if (!context) throw new Error('useLedger must be used within LedgerProvider');
  return context;
};
