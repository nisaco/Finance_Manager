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
  FileText,
  UserCheck,
  Crown,
  RotateCcw,
  Calendar,
  AlertTriangle,
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

export const SettingsPage: React.FC<SettingsPageProps> = ({ onOpenAuditLogs, onOpenAdminModal, onNavigateToHistory }) => {
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
  const { theme, resolvedTheme, setTheme, uiStyle, setUiStyle, uiDensity, setUiDensity } = useTheme();
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-[#1A1A1A] dark:text-[#F3F4F6]" />
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
              Settings &amp; Preferences
            </h1>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mt-0.5">
            Profiles, theme appearance, exchange rates, and data backup
          </p>
        </div>

        <button
          onClick={onOpenAuditLogs}
          className="px-3.5 py-2 bg-[#F7F5F2] dark:bg-[#22252E] hover:bg-[#E8E5DF] dark:hover:bg-[#2D323F] text-[#1A1A1A] dark:text-[#F3F4F6] rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors w-full sm:w-auto"
        >
          <History className="w-4 h-4 text-[#6B7280] dark:text-[#9CA3AF]" />
          <span>System Audit Trail</span>
        </button>
      </div>

      {/* User Account & Paystack Referencing Card */}
      {user && (
        <div className="bg-white dark:bg-[#151921] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl p-4 sm:p-5 shadow-sm space-y-3 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E8E5DF] dark:border-[#2D323F] pb-3 gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#F5F4F0] dark:bg-[#1E2330] flex items-center justify-center text-[#1A1A1A] dark:text-[#F3F4F6]">
                <UserCheck className="w-4 h-4 text-[#2563EB]" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                  User Account &amp; Paystack Profile
                </h2>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  Primary account holder credentials and receipt routing
                </p>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="px-3 py-1.5 rounded-lg border border-[#FCA5A5] dark:border-[#7F1D1D] bg-[#FEF2F2] dark:bg-[#450A0A]/30 text-[#B91C1C] dark:text-[#FCA5A5] text-xs font-semibold flex items-center justify-center space-x-1.5 hover:bg-[#FEE2E2] transition-colors w-full sm:w-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-[#FDFCFB] dark:bg-[#1E2330] rounded-lg border border-[#E8E5DF] dark:border-[#2D323F]">
              <span className="text-[10px] font-mono-num uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block">
                Username
              </span>
              <span className="text-sm font-bold text-[#1A1A1A] dark:text-[#F3F4F6] mt-0.5 block truncate">
                @{user.username}
              </span>
            </div>

            <div className="p-3 bg-[#FDFCFB] dark:bg-[#1E2330] rounded-lg border border-[#E8E5DF] dark:border-[#2D323F]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono-num uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block">
                  Email (Paystack Receipts)
                </span>
                <span className="text-[9px] font-bold text-[#10B981] bg-[#ECFDF5] dark:bg-[#064E3B]/30 px-1.5 py-0.5 rounded">
                  Linked
                </span>
              </div>
              <span className="text-sm font-bold text-[#1A1A1A] dark:text-[#F3F4F6] mt-0.5 block truncate flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#6B7280]" />
                {user.email}
              </span>
            </div>

            <div className="p-3 bg-[#FDFCFB] dark:bg-[#1E2330] rounded-lg border border-[#E8E5DF] dark:border-[#2D323F]">
              <span className="text-[10px] font-mono-num uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block">
                Terms &amp; Privacy Agreement
              </span>
              <div className="flex items-center space-x-2 mt-1">
                <button
                  onClick={() => setShowTermsModal(true)}
                  className="text-xs text-[#2563EB] hover:underline font-medium"
                >
                  Terms
                </button>
                <span className="text-[#9CA3AF]">•</span>
                <button
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-xs text-[#2563EB] hover:underline font-medium"
                >
                  Privacy
                </button>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
              </div>
            </div>
          </div>

          {/* Account Role & Database Schema Access */}
          <div className="pt-2 border-t border-[#E8E5DF] dark:border-[#2D323F] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                user.role === 'admin'
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  : 'bg-[#F3F4F6] dark:bg-[#252830] text-[#6B7280] dark:text-[#9CA3AF]'
              }`}>
                <Crown className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                    Account Role:
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    user.role === 'admin'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                  }`}>
                    {user.role === 'admin' ? 'Super Admin (Platform Owner)' : 'Standard User'}
                  </span>
                </div>
                <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                  {isOwner
                    ? 'Authorized platform administrator account (jnkpappoe@gmail.com). You have exclusive authority over platform payouts, user management, and system rules.'
                    : 'Standard user account. Payout authorizations and system governance are managed by the platform administrator.'}
                </p>
              </div>
            </div>

            {/* Seamless Role Toggle - Strictly allowed ONLY for the verified platform owner */}
            {isOwner && (
              <button
                onClick={async () => {
                  const targetRole = user.role === 'admin' ? 'user' : 'admin';
                  setIsSwitchingRole(true);
                  const res = await setUserRole(targetRole);
                  setIsSwitchingRole(false);
                  if (res.success) {
                    notify(targetRole === 'admin' ? 'Seamlessly switched to Admin mode!' : 'Seamlessly switched to standard view.');
                  } else {
                    notify(res.error || 'Failed to update role', 'error');
                  }
                }}
                disabled={isSwitchingRole}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs shrink-0 ${
                  user.role === 'admin'
                    ? 'bg-[#F3F4F6] hover:bg-[#E5E7EB] dark:bg-[#22252E] dark:hover:bg-[#2D323F] text-[#4B5563] dark:text-[#9CA3AF] border border-[#E8E5DF] dark:border-[#2D323F]'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xs'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>
                  {isSwitchingRole
                    ? 'Updating...'
                    : user.role === 'admin'
                    ? 'Switch to User Mode'
                    : 'Switch to Admin Mode'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Admin Operations Section (Strictly visible only to verified owner) */}
      {isOwner && user?.role === 'admin' && onOpenAdminModal && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-transparent border border-amber-300 dark:border-amber-700/60 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 dark:border-amber-800/60 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-xs">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="font-display text-base font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                    Admin Portal Console
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono-num font-bold bg-amber-500 text-white uppercase tracking-wider">
                    Owner Exclusive
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  Exclusive administrative authority for Savings Vault payouts, protocol fees (2% standard &amp; 10% early penalty), user accounts, and AI quota limits.
                </p>
              </div>
            </div>

            <button
              onClick={onOpenAdminModal}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-1.5 transition-all active:scale-95 shrink-0"
            >
              <Crown className="w-4 h-4" />
              <span>Launch Admin Portal</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            <div className="flex items-center space-x-2 p-2 rounded-lg bg-white/60 dark:bg-[#1E2330]/60 border border-amber-200/60 dark:border-amber-900/40">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Approve / Reject Vault Withdrawals</span>
            </div>
            <div className="flex items-center space-x-2 p-2 rounded-lg bg-white/60 dark:bg-[#1E2330]/60 border border-amber-200/60 dark:border-amber-900/40">
              <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Track 2% Standard &amp; 10% Early Fees</span>
            </div>
            <div className="flex items-center space-x-2 p-2 rounded-lg bg-white/60 dark:bg-[#1E2330]/60 border border-amber-200/60 dark:border-amber-900/40">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Full System &amp; Quota Oversight</span>
            </div>
          </div>
        </div>
      )}

      {/* Interface Appearance & Style Options */}
      <div className="bg-white dark:bg-[#151921] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl p-5 shadow-sm space-y-5 transition-colors">
        <div className="flex items-center justify-between border-b border-[#E8E5DF] dark:border-[#2D323F] pb-3">
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4 text-[#1A1A1A] dark:text-white" />
            <h2 className="font-display text-base font-bold text-[#1A1A1A] dark:text-white">
              Interface Appearance &amp; Layout Options
            </h2>
          </div>
          <span className="text-[11px] font-mono-num text-[#6B7280] dark:text-[#9CA3AF]">
            Active Style: <strong className="text-[#1A1A1A] dark:text-white capitalize">{uiStyle}</strong>
          </span>
        </div>

        {/* 1. Interface Style Cards */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#1A1A1A] dark:text-white">
            Choose Your Preferred Look &amp; Feel
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Modern Clean (Recommended) */}
            <button
              type="button"
              onClick={() => setUiStyle('modern')}
              className={`p-3.5 rounded-xl border text-left transition-all relative ${
                uiStyle === 'modern'
                  ? 'border-[#0F172A] dark:border-white bg-[#F8FAFC] dark:bg-[#1E2738] ring-2 ring-[#0F172A] dark:ring-white shadow-sm'
                  : 'border-[#E2E8F0] dark:border-[#232F42] hover:border-[#CBD5E1] bg-white dark:bg-[#141B26]'
              }`}
            >
              {uiStyle === 'modern' && (
                <span className="absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A]">
                  Active
                </span>
              )}
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm mb-2">
                Aa
              </div>
              <div className="text-xs font-bold text-[#0F172A] dark:text-white">
                Modern Clean
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1 leading-snug">
                Simple, uncluttered sans-serif interface with clean slate cards and high legibility.
              </p>
            </button>

            {/* Minimalist Mono */}
            <button
              type="button"
              onClick={() => setUiStyle('minimal')}
              className={`p-3.5 rounded-xl border text-left transition-all relative ${
                uiStyle === 'minimal'
                  ? 'border-black dark:border-white bg-[#F4F4F5] dark:bg-[#27272A] ring-2 ring-black dark:ring-white shadow-sm'
                  : 'border-[#E4E4E7] dark:border-[#27272A] hover:border-[#D4D4D8] bg-white dark:bg-[#18181B]'
              }`}
            >
              {uiStyle === 'minimal' && (
                <span className="absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black text-white dark:bg-white dark:text-black">
                  Active
                </span>
              )}
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center font-mono font-bold text-sm mb-2">
                #
              </div>
              <div className="text-xs font-bold text-[#18181B] dark:text-white">
                Minimalist Mono
              </div>
              <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-1 leading-snug">
                Ultra-minimal monochrome design with zero decorative clutter and crisp borders.
              </p>
            </button>

            {/* Nordic Slate */}
            <button
              type="button"
              onClick={() => setUiStyle('slate')}
              className={`p-3.5 rounded-xl border text-left transition-all relative ${
                uiStyle === 'slate'
                  ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-600 dark:ring-indigo-400 shadow-sm'
                  : 'border-[#CBD5E1] dark:border-[#314059] hover:border-[#94A3B8] bg-white dark:bg-[#141B26]'
              }`}
            >
              {uiStyle === 'slate' && (
                <span className="absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                  Active
                </span>
              )}
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm mb-2">
                S
              </div>
              <div className="text-xs font-bold text-[#0F172A] dark:text-white">
                Nordic Slate
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1 leading-snug">
                Executive fintech appearance with cool slate hues and indigo highlights.
              </p>
            </button>

            {/* Classic Editorial (Legacy Option) */}
            <button
              type="button"
              onClick={() => setUiStyle('editorial')}
              className={`p-3.5 rounded-xl border text-left transition-all relative ${
                uiStyle === 'editorial'
                  ? 'border-[#1A1A1A] dark:border-[#F3F4F6] bg-[#F7F5F2] dark:bg-[#22252E] ring-2 ring-[#1A1A1A] dark:ring-[#F3F4F6] shadow-sm'
                  : 'border-[#E8E5DF] dark:border-[#2D323F] hover:border-[#D5D0C7] bg-[#FDFCFB] dark:bg-[#181A20]'
              }`}
            >
              {uiStyle === 'editorial' && (
                <span className="absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]">
                  Active
                </span>
              )}
              <div className="w-8 h-8 rounded-lg bg-[#E8E5DF] dark:bg-[#2D323F] text-[#1A1A1A] dark:text-white flex items-center justify-center font-serif font-bold text-sm mb-2">
                §
              </div>
              <div className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                Classic Editorial
              </div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-1 leading-snug">
                Warm cream paper styling, serif typography, and receipt ticket perforations.
              </p>
            </button>

          </div>
        </div>

        {/* 2. Color Palette & Density Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E8E5DF] dark:border-[#2D323F]">
          
          {/* Theme Mode */}
          <div>
            <label className="block text-xs font-bold text-[#1A1A1A] dark:text-white mb-2">
              Color Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                  theme === 'light'
                    ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] border-[#1A1A1A] shadow-xs'
                    : 'bg-[#FDFCFB] dark:bg-[#1E2330] text-[#6B7280] dark:text-[#9CA3AF] border-[#E8E5DF] dark:border-[#2D323F] hover:text-[#1A1A1A] dark:hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                  theme === 'dark'
                    ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] border-[#1A1A1A] shadow-xs'
                    : 'bg-[#FDFCFB] dark:bg-[#1E2330] text-[#6B7280] dark:text-[#9CA3AF] border-[#E8E5DF] dark:border-[#2D323F] hover:text-[#1A1A1A] dark:hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-amber-300" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                  theme === 'system'
                    ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] border-[#1A1A1A] shadow-xs'
                    : 'bg-[#FDFCFB] dark:bg-[#1E2330] text-[#6B7280] dark:text-[#9CA3AF] border-[#E8E5DF] dark:border-[#2D323F] hover:text-[#1A1A1A] dark:hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Auto</span>
              </button>
            </div>
          </div>

          {/* Spacing & Density */}
          <div>
            <label className="block text-xs font-bold text-[#1A1A1A] dark:text-white mb-2">
              Layout Density
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUiDensity('standard')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                  uiDensity === 'standard'
                    ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] border-[#1A1A1A] shadow-xs'
                    : 'bg-[#FDFCFB] dark:bg-[#1E2330] text-[#6B7280] dark:text-[#9CA3AF] border-[#E8E5DF] dark:border-[#2D323F] hover:text-[#1A1A1A] dark:hover:text-white'
                }`}
              >
                <span>Comfortable</span>
              </button>

              <button
                type="button"
                onClick={() => setUiDensity('compact')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                  uiDensity === 'compact'
                    ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] border-[#1A1A1A] shadow-xs'
                    : 'bg-[#FDFCFB] dark:bg-[#1E2330] text-[#6B7280] dark:text-[#9CA3AF] border-[#E8E5DF] dark:border-[#2D323F] hover:text-[#1A1A1A] dark:hover:text-white'
                }`}
              >
                <span>Compact</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Financial Cycle & Net Balance Reset Section */}
      <div className="bg-white dark:bg-[#151921] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl p-5 shadow-sm space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E8E5DF] dark:border-[#2D323F] pb-3">
          <div className="flex items-center space-x-2">
            <RotateCcw className="w-4 h-4 text-[#1A1A1A] dark:text-white" />
            <h2 className="font-display text-base font-bold text-[#1A1A1A] dark:text-white">
              Financial Cycles &amp; Balance Reset
            </h2>
          </div>
          <span className="text-[11px] font-mono-num text-[#6B7280] dark:text-[#9CA3AF]">
            Active Cycle: <strong className="text-[#1A1A1A] dark:text-white">{summary?.cycleMonth || 'Current Month'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active Balance Status Card */}
          <div className="p-4 rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] bg-[#FDFCFB] dark:bg-[#1A1D24] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider">
                Active Ledger Net Balance
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {activeProfile?.autoMonthlyReset !== false ? 'Monthly Cycle' : 'All-Time'}
              </span>
            </div>

            <div className="text-2xl font-bold font-mono-num text-[#1A1A1A] dark:text-[#F3F4F6]">
              {formatCurrency(summary?.netBalance ?? 0, activeProfile?.displayCurrency || 'GHS')}
            </div>

            <div className="pt-2 border-t border-[#E8E5DF]/60 dark:border-[#2D323F]/60 flex items-center justify-between text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
              <span>Cumulative All-Time Balance:</span>
              <span className="font-mono-num font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                {formatCurrency(summary?.allTimeNetBalance ?? summary?.netBalance ?? 0, activeProfile?.displayCurrency || 'GHS')}
              </span>
            </div>

            {activeProfile?.balanceResetAt && (
              <div className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">
                Cycle manually restarted: {new Date(activeProfile.balanceResetAt).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Reset Action & Controls */}
          <div className="p-4 rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] bg-[#FDFCFB] dark:bg-[#1A1D24] flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                Start a Fresh Cycle / Reset Balance
              </div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
                Reset your active dashboard balance to 0.00 to start tracking a fresh period. All previous transactions are permanently stored in your <strong>Monthly History</strong> archive.
              </p>
              <div className="text-[11px] text-[#22C55E] font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Savings Vaults and debts are essential and never reset.</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(true)}
                disabled={isResettingBalance}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#1A1A1A] text-white hover:bg-[#333333] dark:bg-white dark:text-[#111317] dark:hover:bg-[#E5E7EB] transition-colors flex items-center space-x-1.5 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isResettingBalance ? 'Resetting...' : 'Reset Net Balance to 0.00'}</span>
              </button>

              {onNavigateToHistory && (
                <button
                  type="button"
                  onClick={onNavigateToHistory}
                  className="px-3 py-2 rounded-xl text-xs font-semibold border border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#16181E] text-[#1A1A1A] dark:text-white hover:bg-[#F7F5F0] dark:hover:bg-[#20242E] transition-colors flex items-center space-x-1"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Open Monthly History</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Rollover Switch */}
        <div className="p-4 rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#16181E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
              Automatic Monthly Rollover
            </div>
            <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
              Every 1st of the month, active balance resets to 0.00 for the new month, keeping completed months in Monthly History.
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleAutoMonthlyReset}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              activeProfile?.autoMonthlyReset !== false
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] dark:bg-white dark:text-[#111317] dark:border-white'
                : 'bg-white text-[#6B7280] border-[#E8E5DF] dark:bg-[#20242E] dark:text-[#9CA3AF] dark:border-[#2D323F]'
            }`}
          >
            {activeProfile?.autoMonthlyReset !== false ? 'Enabled (Monthly Cycle)' : 'Disabled (All-Time)'}
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

        {/* 2. Payment & Transfer Gateway */}
        <div className="bg-white border border-[#E8E5DF] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#E8E5DF] pb-3">
            <CreditCard className="w-4 h-4 text-[#1A1A1A]" />
            <h2 className="font-display text-base font-bold text-[#1A1A1A]">
              Payment &amp; Transfer Gateway
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#FDFCFB] rounded-lg border border-[#E8E5DF] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280]">Status:</span>
                <span className="inline-flex items-center text-[#15803D] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Active &amp; Connected
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280]">Supported Channels:</span>
                <span className="text-[#1A1A1A] font-mono-num font-semibold">
                  Bank Transfers, Mobile Money (MTN, Telecel, AirtelTigo)
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#6B7280] leading-relaxed">
              Automated savings transfers and deposits are credited directly to your profile ledgers with instant email confirmation.
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

        {/* 4. Complete Data Backup & Restore */}
        <div className="bg-white border border-[#E8E5DF] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#E8E5DF] pb-3">
            <Shield className="w-4 h-4 text-[#1A1A1A]" />
            <h2 className="font-display text-base font-bold text-[#1A1A1A]">
              Data Backup &amp; Recovery
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            {/* Export */}
            <div className="space-y-2 p-3 bg-[#FDFCFB] rounded-xl border border-[#E8E5DF]">
              <span className="font-bold text-[#1A1A1A] block">
                Export Ledger Backup
              </span>
              <p className="text-[#6B7280] text-[11px]">
                Download a clean, structured JSON file of your financial data including profiles, transactions, debts, goals, and transfer logs.
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
                placeholder="Paste backup JSON content..."
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1A1D24] border border-[#E8E5DF] dark:border-[#2D323F] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0 border border-amber-200 dark:border-amber-800">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                  Reset Net Balance to 0.00?
                </h3>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
                  This restarts your active dashboard ledger at <strong>0.00</strong> so you can track a clean, new financial cycle.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F9F8F6] dark:bg-[#20242E] border border-[#E8E5DF] dark:border-[#2D323F] text-xs space-y-2 text-[#4B5563] dark:text-[#D1D5DB]">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                <span><strong>Zero Data Loss:</strong> All past transactions are permanently saved in your <strong>Monthly History</strong>.</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                <span><strong>Savings Vaults Untouched:</strong> Your emergency funds and goal vaults never reset.</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                <span><strong>Debts Preserved:</strong> All money owed to or by you remains intact.</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                disabled={isResettingBalance}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#E8E5DF] dark:border-[#2D323F] text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F7F5F0] dark:hover:bg-[#20242E] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetBalance}
                disabled={isResettingBalance}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1A1A1A] text-white hover:bg-[#333333] dark:bg-white dark:text-[#111317] dark:hover:bg-[#E5E7EB] transition-colors flex items-center space-x-1.5 shadow-sm"
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
