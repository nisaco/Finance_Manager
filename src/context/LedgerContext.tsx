import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Profile, Transaction, Budget, Goal, Debt, SummaryReport } from '../types';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

interface LedgerContextType {
  profiles: Profile[];
  activeProfile: Profile | null;
  setActiveProfileId: (id: string) => void;
  selectProfile: (targetId: string) => void;
  unlockedProfileIds: string[];
  pendingLockedProfile: Profile | null;
  setPendingLockedProfile: (profile: Profile | null) => void;
  unlockProfile: (profileId: string, pin: string) => Promise<boolean>;
  lockProfile: (profileId: string) => void;
  isProfileLockedForUser: (profile: Profile) => boolean;

  // Profile Modal
  profileModalOpen: boolean;
  setProfileModalOpen: (open: boolean) => void;
  editingProfile: Profile | null;
  openCreateProfileModal: () => void;
  openEditProfileModal: (profile: Profile) => void;
  closeProfileModal: () => void;
  fetchProfiles: () => Promise<void>;

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
  const { isAuthenticated, user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Profile Lock & Modals State
  const [unlockedProfileIds, setUnlockedProfileIds] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem('ledger_unlocked_profiles');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [pendingLockedProfile, setPendingLockedProfile] = useState<Profile | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const clearNotification = () => setNotification(null);

  const isProfileLockedForUser = useCallback(
    (profile: Profile) => {
      if (!profile || !profile.isLocked) return false;
      return !unlockedProfileIds.includes(profile.id);
    },
    [unlockedProfileIds]
  );

  // Load profiles first
  const fetchProfiles = useCallback(async () => {
    try {
      let data = await api.getProfiles();
      // Ensure at least one profile is active even if database was just wiped
      if (!data || data.length === 0) {
        try {
          const created = await api.createProfile({
            name: 'Personal',
            color: '#1A1A1A',
            displayCurrency: 'GHS',
            type: 'personal',
          });
          data = [created];
        } catch {
          data = [];
        }
      }

      setProfiles(data);

      if (data.length > 0) {
        const saved = localStorage.getItem('ledger_active_profile');
        const match = data.find((p) => p.id === saved);
        const nextId = match ? match.id : data[0].id;
        setActiveProfileId(nextId);
        localStorage.setItem('ledger_active_profile', nextId);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
      setIsLoading(false);
    }
  }, []);

  const selectProfile = useCallback(
    (targetId: string) => {
      const target = profiles.find((p) => p.id === targetId);
      if (!target) return;
      if (isProfileLockedForUser(target)) {
        setPendingLockedProfile(target);
      } else {
        setActiveProfileId(targetId);
      }
    },
    [profiles, isProfileLockedForUser]
  );

  const unlockProfile = async (profileId: string, pin: string): Promise<boolean> => {
    try {
      const res = await api.verifyProfilePin(profileId, pin);
      if (res && res.success) {
        const updated = Array.from(new Set([...unlockedProfileIds, profileId]));
        setUnlockedProfileIds(updated);
        try {
          sessionStorage.setItem('ledger_unlocked_profiles', JSON.stringify(updated));
        } catch {}
        setActiveProfileId(profileId);
        setPendingLockedProfile(null);
        const prof = profiles.find((p) => p.id === profileId);
        notify(`Profile "${prof?.name || 'Selected'}" unlocked`);
        return true;
      }
      return false;
    } catch (err: any) {
      return false;
    }
  };

  const lockProfile = (profileId: string) => {
    const updated = unlockedProfileIds.filter((id) => id !== profileId);
    setUnlockedProfileIds(updated);
    try {
      sessionStorage.setItem('ledger_unlocked_profiles', JSON.stringify(updated));
    } catch {}
    const prof = profiles.find((p) => p.id === profileId);
    notify(`Profile "${prof?.name || 'Selected'}" locked`);

    if (activeProfileId === profileId) {
      // If current profile was locked, switch to another unlocked profile or prompt
      const otherUnlocked = profiles.find((p) => p.id !== profileId && !p.isLocked);
      if (otherUnlocked) {
        setActiveProfileId(otherUnlocked.id);
      } else if (prof) {
        setPendingLockedProfile(prof);
      }
    }
  };

  const openCreateProfileModal = () => {
    setEditingProfile(null);
    setProfileModalOpen(true);
  };

  const openEditProfileModal = (profile: Profile) => {
    setEditingProfile(profile);
    setProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setProfileModalOpen(false);
    setEditingProfile(null);
  };

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
    } else {
      setProfiles([]);
      setActiveProfileId('');
      setTransactions([]);
      setBudgets([]);
      setGoals([]);
      setDebts([]);
      setSummary(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, fetchProfiles]);

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
        selectProfile,
        unlockedProfileIds,
        pendingLockedProfile,
        setPendingLockedProfile,
        unlockProfile,
        lockProfile,
        isProfileLockedForUser,
        profileModalOpen,
        setProfileModalOpen,
        editingProfile,
        openCreateProfileModal,
        openEditProfileModal,
        closeProfileModal,
        fetchProfiles,
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
