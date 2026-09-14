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
  Sun,
  Moon,
  Monitor,
  Palette,
  Lock,
  Unlock,
  ShieldCheck,
  Edit3,
  UserPlus,
  Mail,
  LogOut,
  UserCheck,
  Crown,
  RotateCcw,
  Sliders,
  ArrowRight,
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { TermsModal } from '../components/TermsModal';
import { PrivacyModal } from '../components/PrivacyModal';
import { api } from '../api/client';
import { formatCurrency } from '../design/tokens';

interface SettingsPageProps {
  onOpenAuditLogs: () => void;
  onOpenAdminModal?: () => void;
  onNavigateToHistory?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onOpenAuditLogs,
  onOpenAdminModal,
  onNavigateToHistory,
}) => {
  const { user, logout, setUserRole } = useAuth();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [isResettingBalance, setIsResettingBalance] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  const {
    profiles,
    activeProfile,
    summary,
    refreshData,
    notify,
    selectProfile,
    isProfileLockedForUser,
    lockProfile,
    openCreateProfileModal,
    openEditProfileModal,
    fetchProfiles,
  } = useLedger();
  const { theme, setTheme, uiStyle, setUiStyle, uiDensity, setUiDensity } = useTheme();
  const isOwner = user?.email?.toLowerCase() === 'jnkpappoe@gmail.com';

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

  const handleResetBalance = async () => {
    if (!activeProfile) return;
    setIsResettingBalance(true);
    try {
      await api.resetProfileBalance(activeProfile.id);
      notify('Active net balance reset to 0.00. Previous transactions safely archived to Monthly History.');
      setShowResetConfirmModal(false);
      await refreshData();
    } catch (err: any) {
      notify(err.message || 'Failed to reset balance', 'error');
    } finally {
      setIsResettingBalance(false);
    }
  };

  const handleToggleAutoMonthlyReset = async () => {
    if (!activeProfile) return;
    const currentVal = activeProfile.autoMonthlyReset !== false;
    try {
      await api.updateProfile(activeProfile.id, {
        autoMonthlyReset: !currentVal,
      });
      notify(!currentVal ? 'Automatic monthly rollover enabled' : 'Automatic monthly rollover disabled');
      await refreshData();
    } catch (err: any) {
      notify(err.message || 'Failed to update monthly setting', 'error');
    }
  };

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
      selectProfile(p.id);
    } catch (err: any) {
      notify(err.message || 'Failed to create profile', 'error');
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const backup = await api.getBackup();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `ledger_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      notify('Ledger backup downloaded');
    } catch (err: any) {
      notify('Failed to generate backup', 'error');
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreJson.trim()) return;
    if (!confirm('Warning: Restoring backup will overwrite current data. Proceed?')) return;

    setIsRestoring(true);
    try {
      const parsed = JSON.parse(restoreJson);
      await api.restoreBackup(parsed);
      notify('Ledger data restored successfully');
      setRestoreJson('');
      await refreshData();
    } catch (err: any) {
      notify(err.message || 'Restore failed (invalid JSON format)', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-ink" />
            <h1 className="font-display text-xl sm:text-2xl font-bold text-ink">
              Settings &amp; Preferences
            </h1>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Profiles, theme appearance, exchange rates, and data backup
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAuditLogs}
          className="lg-btn-quiet self-start sm:self-auto text-xs"
        >
          <History className="w-4 h-4 text-ink-muted" />
          <span>System Audit Trail</span>
        </button>
      </div>

      {/* User Account & Paystack Referencing Card */}
      {user && (
        <div className="lg-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-line pb-4 gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-sunken border border-line flex items-center justify-center text-ink shrink-0">
                <UserCheck className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="font-display text-sm sm:text-base font-bold text-ink">
                  User Account &amp; Paystack Profile
                </h2>
                <p className="text-xs text-ink-muted">
                  Primary account holder credentials and receipt routing
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => logout()}
              className="lg-btn-quiet text-neg hover:bg-neg/10 border-neg/30 self-start sm:self-auto text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-sunken rounded-xl border border-line">
              <span className="text-[10px] font-mono-num uppercase tracking-wider text-ink-muted block font-semibold">
                Username
              </span>
              <span className="text-sm font-bold text-ink mt-0.5 block truncate">
                @{user.username}
              </span>
            </div>

            <div className="p-3.5 bg-sunken rounded-xl border border-line">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono-num uppercase tracking-wider text-ink-muted block font-semibold">
                  Email (Receipts)
                </span>
                <span className="lg-pill lg-pill-pos text-[9px] py-0.5 px-1.5">
                  Linked
                </span>
              </div>
              <span className="text-sm font-bold text-ink mt-0.5 block truncate flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                <span className="truncate">{user.email}</span>
              </span>
            </div>

            <div className="p-3.5 bg-sunken rounded-xl border border-line">
              <span className="text-[10px] font-mono-num uppercase tracking-wider text-ink-muted block font-semibold">
                Terms &amp; Privacy Agreement
              </span>
              <div className="flex items-center space-x-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-xs text-accent hover:underline font-semibold"
                >
                  Terms
                </button>
                <span className="text-ink-muted">•</span>
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-xs text-accent hover:underline font-semibold"
                >
                  Privacy
                </button>
                <CheckCircle2 className="w-3.5 h-3.5 text-pos" />
              </div>
            </div>
          </div>

          {/* Account Role & Database Schema Access */}
          <div className="pt-3 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                user.role === 'admin'
                  ? 'bg-accent/15 text-accent border border-accent/30'
                  : 'bg-sunken text-ink-muted border border-line'
              }`}>
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap">
                  <span className="text-xs font-bold text-ink">
                    Account Role:
                  </span>
                  <span className={`lg-pill ${user.role === 'admin' ? 'lg-pill-accent' : 'lg-pill-dim'} text-[10px]`}>
                    {user.role === 'admin' ? 'Super Admin (Platform Owner)' : 'Standard User'}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  {isOwner
                    ? 'Authorized platform administrator (jnkpappoe@gmail.com). Exclusive authority over platform payouts, user oversight, and protocol fees.'
                    : 'Standard user account. Payout authorizations and system governance are managed by the platform administrator.'}
                </p>
              </div>
            </div>

            {/* Seamless Role Toggle for verified platform owner */}
            {isOwner && (
              <button
                type="button"
                onClick={async () => {
                  const targetRole = user.role === 'admin' ? 'user' : 'admin';
                  setIsSwitchingRole(true);
                  const res = await setUserRole(targetRole);
                  setIsSwitchingRole(false);
                  if (res.success) {
                    notify(targetRole === 'admin' ? 'Switched to Admin mode' : 'Switched to standard user mode');
                  } else {
                    notify(res.error || 'Failed to update role', 'error');
                  }
                }}
                disabled={isSwitchingRole}
                className="lg-btn-solid text-xs shrink-0 self-start sm:self-auto"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>
                  {isSwitchingRole
                    ? 'Updating...'
                    : user.role === 'admin'
                    ? 'Switch to User View'
                    : 'Switch to Admin View'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Admin Operations Section (Strictly visible only to verified owner) */}
      {isOwner && user?.role === 'admin' && onOpenAdminModal && (
        <div className="lg-card p-5 space-y-4 border-accent/40 bg-accent/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-accent/20 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="font-display text-sm sm:text-base font-bold text-ink">
                    Admin Portal Console
                  </h2>
                  <span className="lg-pill lg-pill-accent text-[9px]">
                    Owner Exclusive
                  </span>
                </div>
                <p className="text-xs text-ink-muted">
                  Administrative authority for Savings Vault payouts, protocol fees (2% standard &amp; 10% early penalty), user accounts, and AI quota limits.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenAdminModal}
              className="lg-btn-solid bg-accent text-white hover:bg-accent/90 text-xs shrink-0 self-start sm:self-auto"
            >
              <Crown className="w-4 h-4" />
              <span>Launch Admin Portal</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-ink">
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-surface border border-line">
              <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
              <span className="font-medium">Approve / Reject Vault Withdrawals</span>
            </div>
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-surface border border-line">
              <Coins className="w-4 h-4 text-pos shrink-0" />
              <span className="font-medium">Track 2% Standard &amp; 10% Early Fees</span>
            </div>
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-surface border border-line">
              <Users className="w-4 h-4 text-ink shrink-0" />
              <span className="font-medium">Full System &amp; Quota Oversight</span>
            </div>
          </div>
        </div>
      )}

      {/* Interface Appearance & Layout Options */}
      <div className="lg-card p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4 text-ink" />
            <h2 className="font-display text-sm sm:text-base font-bold text-ink">
              Interface Appearance &amp; Layout
            </h2>
          </div>
          <span className="text-xs font-mono-num text-ink-muted">
            Active: <strong className="text-ink capitalize">{uiStyle}</strong>
          </span>
        </div>

        {/* 1. Interface Style Cards */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-ink uppercase tracking-wider">
            Choose Preferred Style
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Modern Clean */}
            <button
              type="button"
              onClick={() => setUiStyle('modern')}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                uiStyle === 'modern'
                  ? 'border-accent bg-accent/5 ring-1 ring-accent'
                  : 'border-line bg-surface hover:border-ink/20'
              }`}
            >
              {uiStyle === 'modern' && (
                <span className="absolute top-3 right-3 lg-pill lg-pill-accent text-[9px]">
                  Active
                </span>
              )}
              <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center font-bold text-sm mb-2.5">
                Aa
              </div>
              <div className="text-xs font-bold text-ink">
                Modern Clean
              </div>
              <p className="text-[11px] text-ink-muted mt-1 leading-snug">
                Fintech standard interface with uncluttered slate cards and clear contrast.
              </p>
            </button>

            {/* Minimalist Mono */}
            <button
              type="button"
              onClick={() => setUiStyle('minimal')}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                uiStyle === 'minimal'
                  ? 'border-ink bg-sunken ring-1 ring-ink'
                  : 'border-line bg-surface hover:border-ink/20'
              }`}
            >
              {uiStyle === 'minimal' && (
                <span className="absolute top-3 right-3 lg-pill lg-pill-dim text-[9px]">
                  Active
                </span>
              )}
              <div className="w-8 h-8 rounded-lg bg-sunken border border-line text-ink flex items-center justify-center font-mono font-bold text-sm mb-2.5">
                #
              </div>
              <div className="text-xs font-bold text-ink">
                Minimalist Mono
              </div>
              <p className="text-[11px] text-ink-muted mt-1 leading-snug">
                Ultra-crisp monochrome layout with zero decorative clutter.
              </p>
            </button>

            {/* Nordic Slate */}
            <button
              type="button"
              onClick={() => setUiStyle('slate')}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                uiStyle === 'slate'
                  ? 'border-accent bg-accent/5 ring-1 ring-accent'
                  : 'border-line bg-surface hover:border-ink/20'
              }`}
            >
              {uiStyle === 'slate' && (
                <span className="absolute top-3 right-3 lg-pill lg-pill-accent text-[9px]">
                  Active
                </span>
              )}
              <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center font-bold text-sm mb-2.5">
                S
              </div>
              <div className="text-xs font-bold text-ink">
                Nordic Slate
              </div>
              <p className="text-[11px] text-ink-muted mt-1 leading-snug">
                Executive fintech appearance with cool slate hues and crisp accents.
              </p>
            </button>

            {/* Classic Editorial */}
            <button
              type="button"
              onClick={() => setUiStyle('editorial')}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                uiStyle === 'editorial'
                  ? 'border-ink bg-sunken ring-1 ring-ink'
                  : 'border-line bg-surface hover:border-ink/20'
              }`}
            >
              {uiStyle === 'editorial' && (
                <span className="absolute top-3 right-3 lg-pill lg-pill-dim text-[9px]">
                  Active
                </span>
              )}
              <div className="w-8 h-8 rounded-lg bg-sunken border border-line text-ink flex items-center justify-center font-serif font-bold text-sm mb-2.5">
                §
              </div>
              <div className="text-xs font-bold text-ink">
                Classic Editorial
              </div>
              <p className="text-[11px] text-ink-muted mt-1 leading-snug">
                Warm paper styling, refined serif headers, and ticket stub styling.
              </p>
            </button>
          </div>
        </div>

        {/* 2. Color Palette & Density Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-line">
          {/* Theme Mode */}
          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
              Color Theme
            </label>
            <div className="lg-seg">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`lg-seg-btn flex items-center justify-center space-x-1.5 ${theme === 'light' ? 'active' : ''}`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`lg-seg-btn flex items-center justify-center space-x-1.5 ${theme === 'dark' ? 'active' : ''}`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`lg-seg-btn flex items-center justify-center space-x-1.5 ${theme === 'system' ? 'active' : ''}`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* Spacing & Density */}
          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
              Layout Density
            </label>
            <div className="lg-seg">
              <button
                type="button"
                onClick={() => setUiDensity('standard')}
                className={`lg-seg-btn flex items-center justify-center space-x-1.5 ${uiDensity === 'standard' ? 'active' : ''}`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Comfortable</span>
              </button>
              <button
                type="button"
                onClick={() => setUiDensity('compact')}
                className={`lg-seg-btn flex items-center justify-center space-x-1.5 ${uiDensity === 'compact' ? 'active' : ''}`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Compact</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Cycle & Net Balance Reset Section */}
      <div className="lg-card p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-3">
          <div className="flex items-center space-x-2">
            <RotateCcw className="w-4 h-4 text-ink" />
            <h2 className="font-display text-sm sm:text-base font-bold text-ink">
              Financial Cycles &amp; Balance Reset
            </h2>
          </div>
          <span className="text-xs font-mono-num text-ink-muted">
            Active Cycle: <strong className="text-ink">{summary?.cycleMonth || 'Current Month'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active Balance Status Card */}
          <div className="p-4 rounded-xl border border-line bg-sunken space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                Active Net Balance
              </span>
              <span className="lg-pill lg-pill-pos text-[10px]">
                {activeProfile?.autoMonthlyReset !== false ? 'Monthly Cycle' : 'All-Time'}
              </span>
            </div>

            <div className="text-2xl font-bold font-mono-num num text-ink">
              {formatCurrency(summary?.netBalance ?? 0, activeProfile?.displayCurrency || 'GHS')}
            </div>

            <div className="pt-2 border-t border-line flex items-center justify-between text-xs text-ink-muted">
              <span>Cumulative All-Time Balance:</span>
              <span className="font-mono-num num font-bold text-ink">
                {formatCurrency(summary?.allTimeNetBalance ?? summary?.netBalance ?? 0, activeProfile?.displayCurrency || 'GHS')}
              </span>
            </div>

            {activeProfile?.balanceResetAt && (
              <div className="text-[11px] text-ink-muted">
                Cycle manually restarted: <span className="num font-semibold">{new Date(activeProfile.balanceResetAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Reset Action & Controls */}
          <div className="p-4 rounded-xl border border-line bg-sunken flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-ink">
                Start a Fresh Cycle / Reset Balance
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Reset your active dashboard balance to 0.00 to start tracking a fresh period. All previous transactions are permanently preserved in your <strong>Monthly History</strong> archive.
              </p>
              <div className="text-[11px] text-pos font-medium flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Savings Vaults and debts are essential and never reset.</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(true)}
                disabled={isResettingBalance}
                className="lg-btn-solid text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isResettingBalance ? 'Resetting...' : 'Reset Net Balance to 0.00'}</span>
              </button>

              {onNavigateToHistory && (
                <button
                  type="button"
                  onClick={onNavigateToHistory}
                  className="lg-btn-quiet text-xs"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Open Monthly History</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Rollover Switch */}
        <div className="p-4 rounded-xl border border-line bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="font-bold text-ink">
              Automatic Monthly Rollover
            </div>
            <p className="text-[11px] text-ink-muted">
              Every 1st of the month, active balance resets to 0.00 for the new month, keeping completed months organized in Monthly History.
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleAutoMonthlyReset}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
              activeProfile?.autoMonthlyReset !== false
                ? 'bg-ink text-canvas border-ink shadow-xs'
                : 'bg-surface text-ink-muted border-line hover:text-ink'
            }`}
          >
            {activeProfile?.autoMonthlyReset !== false ? 'Enabled (Monthly Cycle)' : 'Disabled (All-Time)'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Multi-Profile Management */}
        <div className="lg-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-ink" />
              <div>
                <h2 className="font-display text-sm sm:text-base font-bold text-ink">
                  Profiles &amp; Entity Vaults
                </h2>
                <p className="text-xs text-ink-muted">
                  Isolate finances across entities and protect them with security PIN locks.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openCreateProfileModal}
              className="lg-btn-solid text-xs shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Profile</span>
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
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    isActive
                      ? 'bg-sunken border-ink/40 shadow-xs'
                      : 'bg-surface border-line hover:border-ink/20'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: p.color || 'var(--ink)' }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-bold text-ink truncate text-sm">{p.name}</span>
                        <span className="lg-pill lg-pill-dim text-[10px] uppercase font-mono-num font-semibold">
                          {p.type || 'personal'}
                        </span>
                        <span className="lg-pill lg-pill-dim text-[10px] font-mono-num font-bold">
                          {p.displayCurrency}
                        </span>
                      </div>

                      {/* Lock Status indicator */}
                      <div className="flex items-center space-x-1.5 mt-1">
                        {p.isLocked ? (
                          <span
                            className={`inline-flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              isLockedForUser
                                ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                                : 'bg-pos/15 text-pos border border-pos/30'
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
                          <span className="inline-flex items-center space-x-1 text-[10px] text-ink-muted">
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
                        type="button"
                        onClick={() => lockProfile(p.id)}
                        className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors border border-amber-500/30"
                        title="Re-lock this profile"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Lock</span>
                      </button>
                    )}

                    {isActive ? (
                      <span className="lg-pill lg-pill-accent text-xs font-mono-num font-bold">
                        Active Profile
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => selectProfile(p.id)}
                        className="lg-btn-quiet text-xs"
                      >
                        Switch To
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditProfileModal(p)}
                      className="p-2 text-ink-muted hover:text-ink hover:bg-sunken rounded-lg transition-colors border border-transparent hover:border-line"
                      title="Edit Profile & PIN Lock Settings"
                      aria-label="Edit Profile"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Inline Creation Form */}
          <form onSubmit={handleCreateProfile} className="pt-3 border-t border-line space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink block">
                Quick Add Profile
              </span>
              <button
                type="button"
                onClick={openCreateProfileModal}
                className="text-xs text-ink-muted hover:text-ink underline font-medium"
              >
                Full Setup Modal
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder="Profile name (e.g. Consulting)"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="lg-input text-xs"
              />
              <select
                value={newProfileType}
                onChange={(e) => setNewProfileType(e.target.value as any)}
                className="lg-select text-xs"
              >
                <option value="personal">Personal</option>
                <option value="family">Family Member</option>
                <option value="business">Business / Ops</option>
              </select>
              <select
                value={newProfileCurrency}
                onChange={(e) => setNewProfileCurrency(e.target.value)}
                className="lg-select text-xs"
              >
                <option value="GHS">GHS (Ghana)</option>
                <option value="USD">USD (Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="GBP">GBP (Pound)</option>
                <option value="NGN">NGN (Naira)</option>
              </select>
            </div>

            {/* Optional Lock Toggle in Quick Add */}
            <div className="p-3 rounded-xl bg-sunken border border-line space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center space-x-2">
                  <Lock className="w-3.5 h-3.5 text-ink-muted" />
                  <span className="text-xs text-ink font-semibold">Lock this profile with a PIN</span>
                </div>
                <input
                  type="checkbox"
                  checked={newProfileLock}
                  onChange={(e) => setNewProfileLock(e.target.checked)}
                  className="rounded border-line text-ink focus:ring-accent"
                />
              </label>

              {newProfileLock && (
                <div className="pt-2 border-t border-line flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="4-6 digit PIN"
                    value={newProfilePin}
                    onChange={(e) => setNewProfilePin(e.target.value.replace(/\D/g, ''))}
                    className="w-full sm:w-36 lg-input text-xs font-mono-num tracking-widest text-center"
                  />
                  <span className="text-[11px] text-ink-muted">
                    Only authorized users with this PIN can access this profile.
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isCreatingProfile || !newProfileName.trim()}
              className="lg-btn-solid text-xs w-full sm:w-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreatingProfile ? 'Creating...' : 'Create Profile'}</span>
            </button>
          </form>
        </div>

        {/* 2. Payment & Transfer Gateway */}
        <div className="lg-card p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-line pb-3">
            <CreditCard className="w-4 h-4 text-ink" />
            <h2 className="font-display text-sm sm:text-base font-bold text-ink">
              Payment &amp; Transfer Gateway
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-sunken rounded-xl border border-line space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-ink-muted font-medium">Gateway Status:</span>
                <span className="inline-flex items-center text-pos font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Active &amp; Connected
                </span>
              </div>
              <div className="flex justify-between items-center flex-wrap gap-1">
                <span className="text-ink-muted font-medium">Supported Channels:</span>
                <span className="text-ink font-semibold">
                  Mobile Money (MTN, Telecel, AT), Cards &amp; Bank
                </span>
              </div>
            </div>

            <p className="text-[11px] text-ink-muted leading-relaxed">
              Automated savings transfers and deposits are credited directly to your profile ledgers with instant email confirmation and receipt reference tracking.
            </p>
          </div>
        </div>

        {/* 3. Live Forex Rates to GHS */}
        <div className="lg-card p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-line pb-3">
            <Coins className="w-4 h-4 text-ink" />
            <h2 className="font-display text-sm sm:text-base font-bold text-ink">
              Exchange Rates (Pegged to GHS)
            </h2>
          </div>

          <form onSubmit={handleSaveRates} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
                  1 USD = (GHS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={usdRate}
                  onChange={(e) => setUsdRate(e.target.value)}
                  className="lg-input text-xs font-mono-num num"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
                  1 EUR = (GHS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={eurRate}
                  onChange={(e) => setEurRate(e.target.value)}
                  className="lg-input text-xs font-mono-num num"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
                  1 GBP = (GHS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={gbpRate}
                  onChange={(e) => setGbpRate(e.target.value)}
                  className="lg-input text-xs font-mono-num num"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
                  1 NGN = (GHS)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={ngnRate}
                  onChange={(e) => setNgnRate(e.target.value)}
                  className="lg-input text-xs font-mono-num num"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingRates}
              className="lg-btn-quiet text-xs font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSavingRates ? 'animate-spin' : ''}`} />
              <span>Update Conversion Rates</span>
            </button>
          </form>
        </div>

        {/* 4. Complete Data Backup & Restore */}
        <div className="lg-card p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-line pb-3">
            <Shield className="w-4 h-4 text-ink" />
            <h2 className="font-display text-sm sm:text-base font-bold text-ink">
              Data Backup &amp; Recovery
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            {/* Export */}
            <div className="space-y-2 p-3.5 bg-sunken rounded-xl border border-line">
              <span className="font-bold text-ink block">
                Export Ledger Backup
              </span>
              <p className="text-ink-muted text-[11px] leading-relaxed">
                Download a clean, structured JSON file of your financial data including profiles, transactions, debts, goals, and transfer logs.
              </p>
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="lg-btn-solid text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Ledger Backup (JSON)</span>
              </button>
            </div>

            {/* Restore */}
            <div className="space-y-2 p-3.5 bg-sunken rounded-xl border border-line">
              <span className="font-bold text-ink block">
                Import / Restore Backup
              </span>
              <textarea
                rows={2}
                placeholder="Paste backup JSON content here..."
                value={restoreJson}
                onChange={(e) => setRestoreJson(e.target.value)}
                className="lg-input font-mono-num text-[11px] p-2 resize-y"
              />
              <button
                type="button"
                onClick={handleRestoreBackup}
                disabled={isRestoring || !restoreJson.trim()}
                className="lg-btn-quiet text-xs font-bold"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Restore from Backup</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        isAccepted={true}
      />
      <PrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        isAccepted={true}
      />

      {/* Reset Balance Confirmation Modal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
          <div className="lg-card max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 border border-amber-500/30 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-ink">
                  Reset Net Balance to 0.00?
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  This restarts your active dashboard ledger at <strong>0.00</strong> so you can track a clean, new financial cycle.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-sunken border border-line text-xs space-y-2 text-ink">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-pos shrink-0" />
                <span><strong>Zero Data Loss:</strong> Past transactions are permanently stored in <strong>Monthly History</strong>.</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-pos shrink-0" />
                <span><strong>Savings Vaults Untouched:</strong> Target goals and locked vaults never reset.</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-pos shrink-0" />
                <span><strong>Debts Preserved:</strong> All receivables and payables remain intact.</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                disabled={isResettingBalance}
                className="lg-btn-quiet text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetBalance}
                disabled={isResettingBalance}
                className="lg-btn-solid text-xs"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResettingBalance ? 'animate-spin' : ''}`} />
                <span>{isResettingBalance ? 'Resetting...' : 'Yes, Reset to 0.00'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
