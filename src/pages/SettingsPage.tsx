import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Users,
  Coins,
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
  Edit3,
  UserPlus,
  Mail,
  LogOut,
  UserCheck,
  Crown,
  RotateCcw,
  Sliders,
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
  const { theme, setTheme, uiDensity, setUiDensity } = useTheme();

  const isOwner = user?.email?.toLowerCase() === 'jnkpappoe@gmail.com';
  const isAdmin = user?.role === 'admin' || isOwner;

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
      notify('Active net balance reset to 0.00. Previous records preserved in Monthly History.');
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
    if (!isAdmin) {
      notify('Only platform administrators can modify exchange rates', 'error');
      return;
    }
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
      notify('PIN must be at least 4 digits to lock this profile', 'error');
      return;
    }

    setIsCreatingProfile(true);
    try {
      const p = await api.createProfile({
        name: newProfileName.trim(),
        type: newProfileType,
        displayCurrency: newProfileCurrency,
        color: newProfileType === 'family' ? '#4FA878' : newProfileType === 'business' ? '#5E81AC' : '#0284C7',
        isLocked: newProfileLock,
        pin: newProfileLock ? newProfilePin.trim() : undefined,
      });
      notify(newProfileLock ? `Protected profile "${p.name}" created` : `Profile "${p.name}" created`);
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
    } catch {
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
    <div className="space-y-6 pb-8 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="t-title text-ink font-bold">Settings</h1>
          <p className="t-meta text-ink-3 mt-0.5">
            Profiles, appearance, financial cycle rollover, and backups
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAuditLogs}
          className="lg-btn lg-btn-quiet text-xs self-start sm:self-auto"
        >
          <History className="w-3.5 h-3.5 text-ink-3" strokeWidth={1.8} />
          <span>Audit Log</span>
        </button>
      </div>

      {/* User Account Card */}
      {user && (
        <div className="lg-card p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3.5">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-sunken border border-line flex items-center justify-center text-ink shrink-0">
                <UserCheck className="w-4 h-4 text-accent" strokeWidth={1.8} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-ink font-display">
                    @{user.username}
                  </h2>
                  <span className={`lg-tag text-[9px] ${isAdmin ? 'lg-tag-accent' : ''}`}>
                    {user.role === 'admin' ? 'Super Admin' : 'Member'}
                  </span>
                </div>
                <p className="text-xs text-ink-3 flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3" strokeWidth={1.8} />
                  <span>{user.email}</span>
                  <span className="text-line-strong">•</span>
                  <span className="text-pos font-semibold">Receipts Linked</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {isOwner && (
                <button
                  type="button"
                  onClick={async () => {
                    const targetRole = user.role === 'admin' ? 'user' : 'admin';
                    setIsSwitchingRole(true);
                    const res = await setUserRole(targetRole);
                    setIsSwitchingRole(false);
                    if (res.success) {
                      notify(targetRole === 'admin' ? 'Switched to Admin View' : 'Switched to User View');
                    } else {
                      notify(res.error || 'Failed to update role', 'error');
                    }
                  }}
                  disabled={isSwitchingRole}
                  className="lg-btn lg-btn-quiet text-xs"
                >
                  <Crown className="w-3.5 h-3.5 text-accent" strokeWidth={1.8} />
                  <span>{isSwitchingRole ? 'Updating...' : user.role === 'admin' ? 'User View' : 'Admin View'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => logout()}
                className="lg-btn lg-btn-danger text-xs"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3 pt-0.5">
            <div className="flex items-center gap-3">
              <span>Legal Agreements:</span>
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="text-accent underline font-semibold hover:text-ink"
              >
                Terms
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(true)}
                className="text-accent underline font-semibold hover:text-ink"
              >
                Privacy Policy
              </button>
              <CheckCircle2 className="w-3.5 h-3.5 text-pos" strokeWidth={1.8} />
            </div>
          </div>
        </div>
      )}

      {/* Admin Operations Banner (Strictly for owner with admin role) */}
      {isAdmin && onOpenAdminModal && (
        <div className="lg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-accent/40 bg-accent-soft">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink">Admin Console</h3>
                <span className="lg-tag lg-tag-accent text-[9px]">Owner</span>
              </div>
              <p className="text-xs text-ink-3">
                Vault payouts, 2% standard fees, platform exchange rates &amp; user management.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAdminModal}
            className="lg-btn lg-btn-solid text-xs shrink-0 self-start sm:self-auto"
          >
            <Crown className="w-3.5 h-3.5" strokeWidth={1.8} />
            <span>Launch Admin Portal</span>
          </button>
        </div>
      )}

      {/* Interface Theme & Layout */}
      <div className="lg-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4 text-accent" strokeWidth={1.8} />
            <h2 className="text-sm font-bold text-ink">Interface Appearance</h2>
          </div>
          <span className="text-xs font-mono-num text-ink-3">
            Current: <strong className="text-ink uppercase">{theme}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5 font-mono-num">
              Theme Mode
            </label>
            <div className="lg-seg">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`lg-seg-btn flex items-center justify-center space-x-1.5 ${theme === 'light' ? 'active' : ''}`}
              >
                <Sun className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`lg-seg-btn flex items-center justify-center space-x-1.5 ${theme === 'dark' ? 'active' : ''}`}
              >
                <Moon className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`lg-seg-btn flex items-center justify-center space-x-1.5 ${theme === 'system' ? 'active' : ''}`}
              >
                <Monitor className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span>System</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5 font-mono-num">
              Layout Density
            </label>
            <div className="lg-seg">
              <button
                type="button"
                onClick={() => setUiDensity('standard')}
                className={`lg-seg-btn flex items-center justify-center space-x-1.5 ${uiDensity === 'standard' ? 'active' : ''}`}
              >
                <Sliders className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span>Standard</span>
              </button>
              <button
                type="button"
                onClick={() => setUiDensity('compact')}
                className={`lg-seg-btn flex items-center justify-center space-x-1.5 ${uiDensity === 'compact' ? 'active' : ''}`}
              >
                <Sliders className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span>Compact</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Cycles & Balance Reset */}
      <div className="lg-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-3">
          <div className="flex items-center space-x-2">
            <RotateCcw className="w-4 h-4 text-accent" strokeWidth={1.8} />
            <h2 className="text-sm font-bold text-ink">
              Financial Cycles &amp; Net Balance Reset
            </h2>
          </div>
          <span className="text-xs font-mono-num text-ink-3">
            Cycle: <strong className="text-ink">{summary?.cycleMonth || 'Current Month'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl border border-line bg-sunken space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-3 font-semibold uppercase tracking-wider font-mono-num">
                Active Net Balance
              </span>
              <span className="lg-tag lg-tag-pos text-[9px]">
                {activeProfile?.autoMonthlyReset !== false ? 'Monthly' : 'All-Time'}
              </span>
            </div>

            <div className="text-xl font-bold font-mono-num num text-ink">
              {formatCurrency(summary?.netBalance ?? 0, activeProfile?.displayCurrency || 'GHS')}
            </div>

            <div className="pt-2 border-t border-line flex items-center justify-between text-xs text-ink-3">
              <span>All-Time Cumulative:</span>
              <span className="font-mono-num num font-bold text-ink">
                {formatCurrency(summary?.allTimeNetBalance ?? summary?.netBalance ?? 0, activeProfile?.displayCurrency || 'GHS')}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-line bg-sunken flex flex-col justify-between space-y-3">
            <div className="space-y-1 text-xs">
              <div className="font-bold text-ink">Start a Fresh Cycle</div>
              <p className="text-[11px] text-ink-3">
                Resets active dashboard balance to 0.00. Completed transactions remain permanently archived in <strong>Monthly History</strong>. Vaults &amp; debts never reset.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(true)}
                disabled={isResettingBalance}
                className="lg-btn lg-btn-solid text-xs"
              >
                <RotateCcw className="w-3 h-3" strokeWidth={1.8} />
                <span>{isResettingBalance ? 'Resetting...' : 'Reset Net Balance'}</span>
              </button>

              {onNavigateToHistory && (
                <button
                  type="button"
                  onClick={onNavigateToHistory}
                  className="lg-btn lg-btn-quiet text-xs"
                >
                  <History className="w-3 h-3" strokeWidth={1.8} />
                  <span>View History</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Rollover Toggle */}
        <div className="p-3 rounded-xl border border-line bg-sunken flex items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-bold text-ink">Automatic Monthly Rollover</div>
            <p className="text-[11px] text-ink-3">
              Automatically starts a fresh 0.00 cycle on the 1st of every month.
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleAutoMonthlyReset}
            className={`lg-btn text-xs shrink-0 ${
              activeProfile?.autoMonthlyReset !== false ? 'lg-btn-solid' : 'lg-btn-quiet'
            }`}
          >
            {activeProfile?.autoMonthlyReset !== false ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      {/* Multi-Profile Management */}
      <div className="lg-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-accent" strokeWidth={1.8} />
            <h2 className="text-sm font-bold text-ink">Profiles &amp; Entity Vaults</h2>
          </div>
          <button
            type="button"
            onClick={openCreateProfileModal}
            className="lg-btn lg-btn-solid text-xs"
          >
            <UserPlus className="w-3.5 h-3.5" strokeWidth={1.8} />
            <span>+ Add Profile</span>
          </button>
        </div>

        <div className="space-y-2">
          {profiles.map((p) => {
            const isActive = p.id === activeProfile?.id;
            const isLockedForUser = isProfileLockedForUser(p);

            return (
              <div
                key={p.id}
                className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                  isActive
                    ? 'bg-sunken border-line-strong shadow-xs'
                    : 'bg-surface border-line hover:border-line-strong'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: p.color || 'var(--lg-ink)' }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-ink truncate">{p.name}</span>
                      <span className="lg-tag text-[9px] uppercase font-mono-num">{p.type || 'personal'}</span>
                      <span className="lg-tag text-[9px] font-mono-num font-bold">{p.displayCurrency}</span>
                      {p.isLocked && (
                        <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                          isLockedForUser ? 'text-warn bg-warn-soft' : 'text-pos bg-pos-soft'
                        }`}>
                          {isLockedForUser ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                          {isLockedForUser ? 'Locked' : 'Unlocked'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 self-end sm:self-center shrink-0">
                  {p.isLocked && !isLockedForUser && (
                    <button
                      type="button"
                      onClick={() => lockProfile(p.id)}
                      className="lg-btn lg-btn-quiet text-xs text-warn"
                      title="Lock this profile"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Lock</span>
                    </button>
                  )}

                  {isActive ? (
                    <span className="lg-tag lg-tag-accent text-[10px] font-bold">
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => selectProfile(p.id)}
                      className="lg-btn lg-btn-quiet text-xs"
                    >
                      Switch
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openEditProfileModal(p)}
                    className="lg-iconbtn"
                    title="Edit Profile"
                    aria-label="Edit Profile"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-ink-3 hover:text-ink" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Add Profile */}
        <form onSubmit={handleCreateProfile} className="pt-2 border-t border-line space-y-2.5">
          <span className="text-xs font-bold text-ink block">Quick Add Profile</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              required
              placeholder="Profile name"
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
              <option value="family">Family</option>
              <option value="business">Business</option>
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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <label className="flex items-center space-x-2 text-xs text-ink-3 cursor-pointer">
              <input
                type="checkbox"
                checked={newProfileLock}
                onChange={(e) => setNewProfileLock(e.target.checked)}
                className="rounded border-line text-accent focus:ring-accent"
              />
              <span>PIN Protection</span>
              {newProfileLock && (
                <input
                  type="password"
                  maxLength={6}
                  placeholder="PIN"
                  value={newProfilePin}
                  onChange={(e) => setNewProfilePin(e.target.value.replace(/\D/g, ''))}
                  className="w-20 lg-input text-xs font-mono-num text-center tracking-widest ml-2"
                />
              )}
            </label>

            <button
              type="submit"
              disabled={isCreatingProfile || !newProfileName.trim()}
              className="lg-btn lg-btn-solid text-xs"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />
              <span>{isCreatingProfile ? 'Creating...' : 'Create Profile'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Exchange Rates & Backup Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forex Rates (Admin-only editable; view-only for standard users) */}
        <div className="lg-card p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center space-x-2">
              <Coins className="w-4 h-4 text-accent" strokeWidth={1.8} />
              <h2 className="text-sm font-bold text-ink">Exchange Rates (vs GHS)</h2>
            </div>
            {isAdmin ? (
              <span className="lg-tag lg-tag-accent text-[9px] font-semibold">
                Admin Control
              </span>
            ) : (
              <span className="lg-tag text-[9px] font-semibold flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Admin Managed
              </span>
            )}
          </div>

          <form onSubmit={handleSaveRates} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] uppercase font-mono-num text-ink-3 font-bold mb-1">
                  1 USD (GHS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  disabled={!isAdmin}
                  value={usdRate}
                  onChange={(e) => setUsdRate(e.target.value)}
                  className={`lg-input text-xs font-mono-num num ${!isAdmin ? 'opacity-85 cursor-not-allowed bg-sunken' : ''}`}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono-num text-ink-3 font-bold mb-1">
                  1 EUR (GHS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  disabled={!isAdmin}
                  value={eurRate}
                  onChange={(e) => setEurRate(e.target.value)}
                  className={`lg-input text-xs font-mono-num num ${!isAdmin ? 'opacity-85 cursor-not-allowed bg-sunken' : ''}`}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono-num text-ink-3 font-bold mb-1">
                  1 GBP (GHS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  disabled={!isAdmin}
                  value={gbpRate}
                  onChange={(e) => setGbpRate(e.target.value)}
                  className={`lg-input text-xs font-mono-num num ${!isAdmin ? 'opacity-85 cursor-not-allowed bg-sunken' : ''}`}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono-num text-ink-3 font-bold mb-1">
                  1 NGN (GHS)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  disabled={!isAdmin}
                  value={ngnRate}
                  onChange={(e) => setNgnRate(e.target.value)}
                  className={`lg-input text-xs font-mono-num num ${!isAdmin ? 'opacity-85 cursor-not-allowed bg-sunken' : ''}`}
                />
              </div>
            </div>

            {isAdmin ? (
              <button
                type="submit"
                disabled={isSavingRates}
                className="lg-btn lg-btn-quiet text-xs font-semibold"
              >
                <RefreshCw className={`w-3 h-3 ${isSavingRates ? 'animate-spin' : ''}`} strokeWidth={1.8} />
                <span>Update Conversion Rates</span>
              </button>
            ) : (
              <p className="text-[11px] text-ink-3 italic pt-0.5">
                Conversion rates are set globally by the platform administrator.
              </p>
            )}
          </form>
        </div>

        {/* Data Backup & Recovery */}
        <div className="lg-card p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center space-x-2 border-b border-line pb-3">
            <Shield className="w-4 h-4 text-accent" strokeWidth={1.8} />
            <h2 className="text-sm font-bold text-ink">Backup &amp; Recovery</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-sunken rounded-xl border border-line">
              <div>
                <span className="font-bold text-ink block">Export Data</span>
                <span className="text-[11px] text-ink-3">Download full JSON snapshot.</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="lg-btn lg-btn-solid text-xs"
              >
                <Download className="w-3 h-3" strokeWidth={1.8} />
                <span>Export JSON</span>
              </button>
            </div>

            <div className="p-3 bg-sunken rounded-xl border border-line space-y-2">
              <span className="font-bold text-ink block">Restore Backup</span>
              <textarea
                rows={2}
                placeholder="Paste backup JSON data..."
                value={restoreJson}
                onChange={(e) => setRestoreJson(e.target.value)}
                className="lg-input font-mono-num text-[11px] p-2 resize-y"
              />
              <button
                type="button"
                onClick={handleRestoreBackup}
                disabled={isRestoring || !restoreJson.trim()}
                className="lg-btn lg-btn-quiet text-xs font-semibold"
              >
                <Upload className="w-3 h-3" strokeWidth={1.8} />
                <span>Restore Snapshot</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="lg-card max-w-md w-full p-5 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 rounded-xl bg-warn-soft text-warn border border-line shrink-0">
                <RotateCcw className="w-5 h-5" strokeWidth={1.8} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-ink">
                  Reset Active Net Balance to 0.00?
                </h3>
                <p className="text-xs text-ink-3 leading-relaxed">
                  Restarts active dashboard calculation for a new financial period. All past transactions remain permanently in <strong>Monthly History</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                disabled={isResettingBalance}
                className="lg-btn lg-btn-quiet text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetBalance}
                disabled={isResettingBalance}
                className="lg-btn lg-btn-solid text-xs"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResettingBalance ? 'animate-spin' : ''}`} strokeWidth={1.8} />
                <span>{isResettingBalance ? 'Resetting...' : 'Yes, Reset to 0.00'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
