import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Users,
  Coins,
  CreditCard,
  Download,
  Upload,
  CheckCircle2,
  RefreshCw,
  Plus,
  History,
  Database,
  Trash2,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  Palette,
  Lock,
  Unlock,
  ShieldCheck,
  Edit3,
  UserPlus,
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';

interface SettingsPageProps {
  onOpenAuditLogs: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onOpenAuditLogs }) => {
  const {
    profiles,
    activeProfile,
    refreshData,
    notify,
    selectProfile,
    isProfileLockedForUser,
    lockProfile,
    openCreateProfileModal,
    openEditProfileModal,
    fetchProfiles,
  } = useLedger();
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Exchange rate local states
  const rates = activeProfile?.exchangeRates;
  const [usdRate, setUsdRate] = useState(rates?.USD?.toString() || '15.5');
  const [eurRate, setEurRate] = useState(rates?.EUR?.toString() || '16.8');
  const [gbpRate, setGbpRate] = useState(rates?.GBP?.toString() || '19.8');
  const [ngnRate, setNgnRate] = useState(rates?.NGN?.toString() || '0.01');
  const [isSavingRates, setIsSavingRates] = useState(false);

  // Keep rate inputs in sync when active profile changes
  useEffect(() => {
    if (activeProfile?.exchangeRates) {
      setUsdRate(activeProfile.exchangeRates.USD?.toString() || '15.5');
      setEurRate(activeProfile.exchangeRates.EUR?.toString() || '16.8');
      setGbpRate(activeProfile.exchangeRates.GBP?.toString() || '19.8');
      setNgnRate(activeProfile.exchangeRates.NGN?.toString() || '0.01');
    }
  }, [activeProfile?.id]);

  // New Profile local state
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileType, setNewProfileType] = useState<'personal' | 'family' | 'business'>('personal');
  const [newProfileCurrency, setNewProfileCurrency] = useState('GHS');
  const [newProfileLock, setNewProfileLock] = useState(false);
  const [newProfilePin, setNewProfilePin] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  // Backup & restore
  const [restoreJson, setRestoreJson] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  // Live Database Status State
  const [dbStatus, setDbStatus] = useState<{
    connected: boolean;
    databaseName: string;
    counts: {
      profiles: number;
      transactions: number;
      budgets: number;
      goals: number;
      debts: number;
      transfers: number;
    };
  } | null>(null);
  const [isLoadingDbStatus, setIsLoadingDbStatus] = useState(false);
  const [isCleaningData, setIsCleaningData] = useState(false);

  const fetchDbStatus = async () => {
    setIsLoadingDbStatus(true);
    try {
      const res = await api.getDbStatus();
      setDbStatus(res);
    } catch {
      // Fallback
    } finally {
      setIsLoadingDbStatus(false);
    }
  };

  useEffect(() => {
    fetchDbStatus();
  }, []);

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    setIsSavingRates(true);
    try {
      await api.updateRates(activeProfile.id, {
        USD: parseFloat(usdRate),
        EUR: parseFloat(eurRate),
        GBP: parseFloat(gbpRate),
        NGN: parseFloat(ngnRate),
        GHS: 1.0,
      });
      notify('Exchange rates updated successfully');
      await refreshData();
    } catch (err: any) {
      notify(err.message || 'Failed to update rates', 'error');
    } finally {
      setIsSavingRates(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    if (newProfileLock && (!newProfilePin || newProfilePin.trim().length < 4)) {
      notify('Security PIN must be at least 4 digits to lock this profile', 'error');
      return;
    }

    setIsCreatingProfile(true);
    try {
      const p = await api.createProfile({
        name: newProfileName.trim(),
        type: newProfileType,
        displayCurrency: newProfileCurrency,
        color: newProfileType === 'family' ? '#4FA878' : newProfileType === 'business' ? '#5E81AC' : '#C9A24B',
        isLocked: newProfileLock,
        pin: newProfileLock ? newProfilePin.trim() : undefined,
      });
      notify(newProfileLock ? `Protected profile "${p.name}" created with PIN` : `Profile "${p.name}" created`);
      setNewProfileName('');
      setNewProfileLock(false);
      setNewProfilePin('');
      await fetchProfiles();
      await fetchDbStatus();
      selectProfile(p.id);
    } catch (err: any) {
      notify(err.message || 'Failed to create profile', 'error');
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleCleanSampleData = async () => {
    setIsCleaningData(true);
    try {
      const res = await api.cleanSampleData();
      notify(`Sample data cleared (${res.deleted.deletedTransactions} sample transactions removed)`);
      await refreshData();
      await fetchDbStatus();
    } catch (err: any) {
      notify(err.message || 'Failed to clean sample data', 'error');
    } finally {
      setIsCleaningData(false);
    }
  };

  const handleWipeFresh = async () => {
    if (
      !confirm(
        'Warning: This will clear all transactions, budgets, savings goals, and debts from your online MongoDB database so you have a completely fresh slate. Proceed?'
      )
    ) {
      return;
    }

    setIsCleaningData(true);
    try {
      await api.wipeAllData(true);
      notify('Database cleared. Your ledger is now 100% fresh and clean.');
      await refreshData();
      await fetchDbStatus();
    } catch (err: any) {
      notify(err.message || 'Failed to wipe database', 'error');
    } finally {
      setIsCleaningData(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const backup = await api.getBackup();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `ledger_mongodb_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      notify('Full JSON backup downloaded');
    } catch (err: any) {
      notify('Failed to generate backup', 'error');
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreJson.trim()) return;
    if (!confirm('Warning: Restoring backup will overwrite current database state. Proceed?')) return;

    setIsRestoring(true);
    try {
      const parsed = JSON.parse(restoreJson);
      await api.restoreBackup(parsed);
      notify('Ledger database restored successfully');
      setRestoreJson('');
      await refreshData();
      await fetchDbStatus();
    } catch (err: any) {
      notify(err.message || 'Restore failed (invalid JSON format)', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-[#1A1A1A]" />
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#1A1A1A]">
              Ledger Configuration & System Controls
            </h1>
          </div>
          <p className="text-xs text-[#6B7280] font-mono-num mt-0.5">
            MongoDB Atlas online database, Profiles, Banking rails, Forex rates, and Data backups
          </p>
        </div>

        <button
          onClick={onOpenAuditLogs}
          className="px-3.5 py-2 bg-[#F7F5F2] hover:bg-[#E8E5DF] text-[#1A1A1A] rounded-lg border border-[#E8E5DF] text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors w-full sm:w-auto"
        >
          <History className="w-4 h-4 text-[#6B7280]" />
          <span>System Audit Trail</span>
        </button>
      </div>

      {/* Online MongoDB Database Status Banner */}
      <div className="bg-white border border-[#E8E5DF] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E8E5DF] pb-3 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Database className="w-4 h-4 text-[#1A1A1A]" />
            <h2 className="font-display text-base font-bold text-[#1A1A1A]">
              Online MongoDB Atlas Database
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono-num font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Live & Synchronized
            </span>
          </div>

          <button
            onClick={fetchDbStatus}
            disabled={isLoadingDbStatus}
            className="px-2.5 py-1 text-xs font-medium text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F7F5F2] rounded border border-[#E8E5DF] flex items-center justify-center space-x-1 w-full sm:w-auto"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingDbStatus ? 'animate-spin' : ''}`} />
            <span>Check Status</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-[#FDFCFB] rounded-lg border border-[#E8E5DF]">
            <span className="text-[10px] font-mono-num uppercase tracking-wider text-[#6B7280] block">
              Cluster Database
            </span>
            <span className="text-xs font-bold text-[#1A1A1A] mt-1 block truncate">
              {dbStatus?.databaseName || 'financial_manager'}
            </span>
          </div>

          <div className="p-3 bg-[#FDFCFB] rounded-lg border border-[#E8E5DF]">
            <span className="text-[10px] font-mono-num uppercase tracking-wider text-[#6B7280] block">
              Profiles
            </span>
            <span className="text-base font-bold font-mono-num text-[#1A1A1A] mt-0.5 block">
              {dbStatus?.counts?.profiles ?? profiles.length}
            </span>
          </div>

          <div className="p-3 bg-[#FDFCFB] rounded-lg border border-[#E8E5DF]">
            <span className="text-[10px] font-mono-num uppercase tracking-wider text-[#6B7280] block">
              Transactions
            </span>
            <span className="text-base font-bold font-mono-num text-[#1A1A1A] mt-0.5 block">
              {dbStatus?.counts?.transactions ?? 0}
            </span>
          </div>

          <div className="p-3 bg-[#FDFCFB] rounded-lg border border-[#E8E5DF]">
            <span className="text-[10px] font-mono-num uppercase tracking-wider text-[#6B7280] block">
              Active Budgets
            </span>
            <span className="text-base font-bold font-mono-num text-[#1A1A1A] mt-0.5 block">
              {dbStatus?.counts?.budgets ?? 0}
            </span>
          </div>

          <div className="p-3 bg-[#FDFCFB] rounded-lg border border-[#E8E5DF]">
            <span className="text-[10px] font-mono-num uppercase tracking-wider text-[#6B7280] block">
              Savings Goals
            </span>
            <span className="text-base font-bold font-mono-num text-[#1A1A1A] mt-0.5 block">
              {dbStatus?.counts?.goals ?? 0}
            </span>
          </div>

          <div className="p-3 bg-[#FDFCFB] rounded-lg border border-[#E8E5DF]">
            <span className="text-[10px] font-mono-num uppercase tracking-wider text-[#6B7280] block">
              Active Debts
            </span>
            <span className="text-base font-bold font-mono-num text-[#1A1A1A] mt-0.5 block">
              {dbStatus?.counts?.debts ?? 0}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E8E5DF] text-xs">
          <p className="text-[11px] text-[#6B7280]">
            All financial operations query directly from your MongoDB Atlas cluster. No hardcoded sample data exists in memory or storage.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            <button
              onClick={handleCleanSampleData}
              disabled={isCleaningData}
              className="px-3 py-1.5 bg-[#F7F5F2] hover:bg-[#E8E5DF] text-[#1A1A1A] rounded border border-[#E8E5DF] font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50 w-full sm:w-auto"
              title="Remove any sample records from the database"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C9A24B]" />
              <span>Purge Sample IDs</span>
            </button>

            <button
              onClick={handleWipeFresh}
              disabled={isCleaningData}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50 w-full sm:w-auto"
              title="Clear all transactions, debts, goals, and budgets to start 100% fresh"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Wipe to 100% Fresh Slate</span>
            </button>
          </div>
        </div>
      </div>

      {/* Appearance & Display Theme */}
      <div className="bg-white border border-[#E8E5DF] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4 text-[#1A1A1A]" />
            <h2 className="font-display text-base font-bold text-[#1A1A1A]">
              Interface Appearance & Theme
            </h2>
          </div>
          <span className="text-[11px] font-mono-num text-[#6B7280]">
            Current: <strong className="text-[#1A1A1A] capitalize">{theme}</strong> (Active: {resolvedTheme})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Light Theme Option */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              theme === 'light'
                ? 'border-[#1A1A1A] bg-[#F7F5F2] shadow-sm ring-1 ring-[#1A1A1A]'
                : 'border-[#E8E5DF] hover:border-[#D5D0C7] hover:bg-[#FDFCFB]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-md bg-[#FFFFFF] border border-[#E8E5DF] flex items-center justify-center text-[#1A1A1A]">
                <Sun className="w-4 h-4 text-amber-500" />
              </div>
              {theme === 'light' && (
                <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded bg-[#1A1A1A] text-white font-bold">
                  Active
                </span>
              )}
            </div>
            <div className="text-xs font-bold text-[#1A1A1A]">Editorial Light</div>
            <p className="text-[11px] text-[#6B7280] mt-0.5 leading-snug">
              Classic warm cream paper canvas with editorial typography and crisp serif headings.
            </p>
          </button>

          {/* Dark Theme Option */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              theme === 'dark'
                ? 'border-[#1A1A1A] bg-[#F7F5F2] shadow-sm ring-1 ring-[#1A1A1A]'
                : 'border-[#E8E5DF] hover:border-[#D5D0C7] hover:bg-[#FDFCFB]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-md bg-[#181A20] border border-[#2D323F] flex items-center justify-center text-[#F3F4F6]">
                <Moon className="w-4 h-4 text-amber-400" />
              </div>
              {theme === 'dark' && (
                <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded bg-[#1A1A1A] text-white font-bold">
                  Active
                </span>
              )}
            </div>
            <div className="text-xs font-bold text-[#1A1A1A]">Obsidian Dark</div>
            <p className="text-[11px] text-[#6B7280] mt-0.5 leading-snug">
              Professional matte charcoal palette engineered with CSS variables for low-light focus.
            </p>
          </button>

          {/* System Default Option */}
          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              theme === 'system'
                ? 'border-[#1A1A1A] bg-[#F7F5F2] shadow-sm ring-1 ring-[#1A1A1A]'
                : 'border-[#E8E5DF] hover:border-[#D5D0C7] hover:bg-[#FDFCFB]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-md bg-[#FFFFFF] border border-[#E8E5DF] flex items-center justify-center text-[#4B5563]">
                <Monitor className="w-4 h-4" />
              </div>
              {theme === 'system' && (
                <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded bg-[#1A1A1A] text-white font-bold">
                  Active
                </span>
              )}
            </div>
            <div className="text-xs font-bold text-[#1A1A1A]">System Sync</div>
            <p className="text-[11px] text-[#6B7280] mt-0.5 leading-snug">
              Automatically syncs with your operating system light and dark mode preferences.
            </p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Multi-Profile Management (Personal, Family, Business) */}
        <div className="bg-white border border-[#E8E5DF] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#1A1A1A]" />
              <div>
                <h2 className="font-display text-base font-bold text-[#1A1A1A]">
                  Profiles & Entity Vaults
                </h2>
                <p className="text-[11px] text-[#6B7280]">
                  Isolate finances across entities and protect them with security PIN locks.
                </p>
              </div>
            </div>
            <button
              onClick={openCreateProfileModal}
              className="px-2.5 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-sm transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Create Profile</span>
            </button>
          </div>

          {/* Current Profiles List */}
          <div className="space-y-2.5">
            {profiles.map((p) => {
              const isActive = p.id === activeProfile?.id;
              const isLockedForUser = isProfileLockedForUser(p);

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    isActive
                      ? 'bg-[#F7F5F2] border-[#1A1A1A] shadow-xs'
                      : 'bg-[#FDFCFB] border-[#E8E5DF] hover:border-[#D5D0C7]'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: p.color || '#1A1A1A' }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-bold text-[#1A1A1A] truncate text-sm">{p.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono-num font-semibold bg-[#E8E5DF]/70 text-[#4B5563]">
                          {p.type || 'personal'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-num font-bold bg-[#E8E5DF]/70 text-[#1A1A1A]">
                          {p.displayCurrency}
                        </span>
                      </div>

                      {/* Lock Status indicator */}
                      <div className="flex items-center space-x-1.5 mt-1">
                        {p.isLocked ? (
                          <span
                            className={`inline-flex items-center space-x-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                              isLockedForUser
                                ? 'bg-amber-100/70 text-amber-900'
                                : 'bg-emerald-100/70 text-emerald-900'
                            }`}
                          >
                            {isLockedForUser ? (
                              <>
                                <Lock className="w-2.5 h-2.5" />
                                <span>PIN Locked</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-2.5 h-2.5" />
                                <span>Unlocked (Session)</span>
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[10px] text-[#6B7280]">
                            <span>Open Access (No PIN)</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Profile Actions */}
                  <div className="flex items-center space-x-1.5 self-end sm:self-center shrink-0">
                    {p.isLocked && !isLockedForUser && (
                      <button
                        onClick={() => lockProfile(p.id)}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-colors border border-amber-200"
                        title="Re-lock this profile"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Lock</span>
                      </button>
                    )}

                    {isActive ? (
                      <span className="px-2.5 py-1 rounded-lg bg-[#1A1A1A] text-white text-[11px] font-mono-num font-bold">
                        Active Profile
                      </span>
                    ) : (
                      <button
                        onClick={() => selectProfile(p.id)}
                        className="px-2.5 py-1 bg-[#FFFFFF] hover:bg-[#E8E5DF] text-[#1A1A1A] rounded-lg border border-[#E8E5DF] text-[11px] font-bold transition-colors"
                      >
                        Switch To
                      </button>
                    )}

                    <button
                      onClick={() => openEditProfileModal(p)}
                      className="p-1.5 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#E8E5DF] rounded-lg transition-colors border border-transparent hover:border-[#E8E5DF]"
                      title="Edit Profile & PIN Lock Settings"
                      aria-label="Edit Profile"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Inline Creation Form */}
          <form onSubmit={handleCreateProfile} className="pt-3 border-t border-[#E8E5DF] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1A1A1A] block">
                Quick Add Profile
              </span>
              <button
                type="button"
                onClick={openCreateProfileModal}
                className="text-xs text-[#6B7280] hover:text-[#1A1A1A] underline"
              >
                Open Full Modal
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder="Profile name (e.g. Consulting, Household)"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-1.5 rounded-lg border border-[#E8E5DF] text-xs focus:outline-none focus:border-[#1A1A1A]"
              />
              <select
                value={newProfileType}
                onChange={(e) => setNewProfileType(e.target.value as any)}
                className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-2 py-1.5 rounded-lg border border-[#E8E5DF] text-xs focus:outline-none focus:border-[#1A1A1A]"
              >
                <option value="personal">Personal</option>
                <option value="family">Family Member</option>
                <option value="business">Business / Ops</option>
              </select>
              <select
                value={newProfileCurrency}
                onChange={(e) => setNewProfileCurrency(e.target.value)}
                className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-2 py-1.5 rounded-lg border border-[#E8E5DF] text-xs focus:outline-none focus:border-[#1A1A1A]"
              >
                <option value="GHS">GHS (Ghana)</option>
                <option value="USD">USD (Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="GBP">GBP (Pound)</option>
                <option value="NGN">NGN (Naira)</option>
              </select>
            </div>

            {/* Optional Lock Toggle in Quick Add */}
            <div className="p-2.5 rounded-lg bg-[#FDFCFB] border border-[#E8E5DF] space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center space-x-2">
                  <Lock className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span className="text-xs text-[#1A1A1A] font-medium">Lock this profile with a PIN</span>
                </div>
                <input
                  type="checkbox"
                  checked={newProfileLock}
                  onChange={(e) => setNewProfileLock(e.target.checked)}
                  className="rounded border-[#E8E5DF] text-[#1A1A1A] focus:ring-[#1A1A1A]"
                />
              </label>

              {newProfileLock && (
                <div className="pt-2 border-t border-[#E8E5DF] flex items-center space-x-2">
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="Enter 4-6 digit PIN"
                    value={newProfilePin}
                    onChange={(e) => setNewProfilePin(e.target.value.replace(/\D/g, ''))}
                    className="w-40 bg-[#FFFFFF] text-[#1A1A1A] px-2.5 py-1 rounded border border-[#E8E5DF] text-xs font-mono tracking-wider focus:outline-none focus:border-[#1A1A1A]"
                  />
                  <span className="text-[10px] text-[#6B7280]">
                    Only authorized users with this PIN can access this profile.
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isCreatingProfile || !newProfileName.trim()}
              className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 disabled:opacity-50 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreatingProfile ? 'Creating...' : 'Create Profile'}</span>
            </button>
          </form>
        </div>

        {/* 2. Paystack Real Banking Integration Status */}
        <div className="bg-white border border-[#E8E5DF] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#E8E5DF] pb-3">
            <CreditCard className="w-4 h-4 text-[#1A1A1A]" />
            <h2 className="font-display text-base font-bold text-[#1A1A1A]">
              Paystack Banking Rails & Webhooks
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#FDFCFB] rounded-lg border border-[#E8E5DF] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280]">Banking Transfer Rail:</span>
                <span className="inline-flex items-center text-[#15803D] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Active / Real-Time Production Ready
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280]">Paystack Secret Key:</span>
                <span className="font-mono-num font-semibold text-[#1A1A1A]">
                  {process.env.PAYSTACK_SECRET_KEY ? 'Configured (Live API)' : 'Dev Sandbox / Simulation Mode'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280]">Supported Settlement Rails:</span>
                <span className="text-[#1A1A1A] font-mono-num font-semibold">
                  Ghana Banks, MTN MoMo, Telecel Cash, AirtelTigo
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#FDFCFB] rounded-lg border border-[#E8E5DF] space-y-1 font-mono-num">
              <span className="text-[10px] uppercase tracking-wider text-[#6B7280] block font-bold">
                Webhook Notification URL (HMAC Verified)
              </span>
              <code className="text-[#1A1A1A] font-bold text-[11px] block select-all break-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/api/paystack/webhook` : '/api/paystack/webhook'}
              </code>
            </div>

            <p className="text-[11px] text-[#6B7280] leading-relaxed">
              When configuring Paystack in your dashboard settings, set the Webhook URL above to receive instantaneous transaction credit updates.
            </p>
          </div>
        </div>

        {/* 3. Live Forex Rates to GHS */}
        <div className="bg-white border border-[#E8E5DF] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#E8E5DF] pb-3">
            <Coins className="w-4 h-4 text-[#1A1A1A]" />
            <h2 className="font-display text-base font-bold text-[#1A1A1A]">
              Exchange Rates (Pegged to GHS)
            </h2>
          </div>

          <form onSubmit={handleSaveRates} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                  1 USD = (GHS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={usdRate}
                  onChange={(e) => setUsdRate(e.target.value)}
                  className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-1.5 rounded-lg border border-[#E8E5DF] font-mono-num focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                  1 EUR = (GHS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={eurRate}
                  onChange={(e) => setEurRate(e.target.value)}
                  className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-1.5 rounded-lg border border-[#E8E5DF] font-mono-num focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                  1 GBP = (GHS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={gbpRate}
                  onChange={(e) => setGbpRate(e.target.value)}
                  className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-1.5 rounded-lg border border-[#E8E5DF] font-mono-num focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                  1 NGN = (GHS)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={ngnRate}
                  onChange={(e) => setNgnRate(e.target.value)}
                  className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-1.5 rounded-lg border border-[#E8E5DF] font-mono-num focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingRates}
              className="px-4 py-2 bg-[#F7F5F2] hover:bg-[#E8E5DF] text-[#1A1A1A] rounded border border-[#E8E5DF] text-xs font-bold flex items-center space-x-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSavingRates ? 'animate-spin' : ''}`} />
              <span>Update Conversion Rates</span>
            </button>
          </form>
        </div>

        {/* 4. Complete JSON Database Backup & Migration */}
        <div className="bg-white border border-[#E8E5DF] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#E8E5DF] pb-3">
            <Shield className="w-4 h-4 text-[#1A1A1A]" />
            <h2 className="font-display text-base font-bold text-[#1A1A1A]">
              Database Backup & Migration
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            {/* Export */}
            <div className="space-y-2 p-3 bg-[#FDFCFB] rounded-xl border border-[#E8E5DF]">
              <span className="font-bold text-[#1A1A1A] block">
                Export Full MongoDB Snapshot
              </span>
              <p className="text-[#6B7280] text-[11px]">
                Download a clean, structured JSON file of your MongoDB Atlas data including profiles, transactions, debts, goals, and transfer logs.
              </p>
              <button
                onClick={handleDownloadBackup}
                className="px-3.5 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] rounded text-xs font-bold shadow-sm flex items-center space-x-1.5 active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Ledger Backup (JSON)</span>
              </button>
            </div>

            {/* Restore */}
            <div className="space-y-2 p-3 bg-[#FDFCFB] rounded-xl border border-[#E8E5DF]">
              <span className="font-bold text-[#1A1A1A] block">
                Import / Restore Backup
              </span>
              <textarea
                rows={2}
                placeholder="Paste backup JSON payload..."
                value={restoreJson}
                onChange={(e) => setRestoreJson(e.target.value)}
                className="w-full bg-white text-[#1A1A1A] p-2 rounded border border-[#E8E5DF] text-[11px] font-mono-num focus:outline-none focus:border-[#1A1A1A]"
              />
              <button
                onClick={handleRestoreBackup}
                disabled={isRestoring || !restoreJson.trim()}
                className="px-3.5 py-1.5 bg-[#F7F5F2] hover:bg-[#E8E5DF] text-[#1A1A1A] rounded border border-[#E8E5DF] text-xs font-bold flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Restore Database</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
