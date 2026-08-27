import React, { useState } from 'react';
import {
  Settings,
  Shield,
  KeyRound,
  Users,
  Coins,
  CreditCard,
  Download,
  Upload,
  CheckCircle2,
  RefreshCw,
  Plus,
  Lock,
  History,
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

interface SettingsPageProps {
  onOpenAuditLogs: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onOpenAuditLogs }) => {
  const { profiles, activeProfile, rates, refreshData, notify, setActiveProfileId } = useLedger();
  const { isPinSet } = useAuth();

  // Exchange rate local states
  const [usdRate, setUsdRate] = useState(rates?.USD?.toString() || '15.5');
  const [eurRate, setEurRate] = useState(rates?.EUR?.toString() || '16.8');
  const [gbpRate, setGbpRate] = useState(rates?.GBP?.toString() || '19.8');
  const [ngnRate, setNgnRate] = useState(rates?.NGN?.toString() || '0.01');
  const [isSavingRates, setIsSavingRates] = useState(false);

  // New Profile local state
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileType, setNewProfileType] = useState<'personal' | 'family' | 'business'>('personal');
  const [newProfileCurrency, setNewProfileCurrency] = useState('GHS');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  // PIN settings state
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  // Backup & restore
  const [restoreJson, setRestoreJson] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

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

    setIsCreatingProfile(true);
    try {
      const p = await api.createProfile({
        name: newProfileName,
        type: newProfileType,
        displayCurrency: newProfileCurrency,
        color: newProfileType === 'family' ? '#4FA878' : newProfileType === 'business' ? '#5E81AC' : '#C9A24B',
      });
      notify(`Profile "${p.name}" created`);
      setNewProfileName('');
      await refreshData();
      setActiveProfileId(p.id);
    } catch (err: any) {
      notify(err.message || 'Failed to create profile', 'error');
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      notify('New PIN confirmation does not match', 'error');
      return;
    }
    if (newPin.length < 4) {
      notify('PIN must be at least 4 digits', 'error');
      return;
    }

    setIsUpdatingPin(true);
    try {
      await api.setPin(oldPin, newPin);
      notify('Owner security PIN updated successfully');
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err: any) {
      notify(err.message || 'PIN update failed', 'error');
    } finally {
      setIsUpdatingPin(false);
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
    } catch (err: any) {
      notify(err.message || 'Restore failed (invalid JSON format)', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-[#1A1A1A]" />
            <h1 className="font-display text-2xl font-bold text-[#1A1A1A]">
              Ledger Configuration & System Controls
            </h1>
          </div>
          <p className="text-xs text-[#6B7280] font-mono-num mt-0.5">
            Profiles, Paystack Banking integration, Forex rates, PIN security, and Data backups
          </p>
        </div>

        <button
          onClick={onOpenAuditLogs}
          className="px-3.5 py-2 bg-[#F7F5F2] hover:bg-[#E8E5DF] text-[#1A1A1A] rounded-lg border border-[#E8E5DF] text-xs font-semibold flex items-center space-x-1.5 transition-colors"
        >
          <History className="w-4 h-4 text-[#6B7280]" />
          <span>System Audit Trail</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Multi-Profile Management (Personal, Family, Business) */}
        <div className="bg-white border border-[#E8E5DF] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#E8E5DF] pb-3">
            <Users className="w-4 h-4 text-[#1A1A1A]" />
            <h2 className="font-display text-base font-bold text-[#1A1A1A]">
              Family & Business Profiles
            </h2>
          </div>

          {/* Current Profiles List */}
          <div className="space-y-2">
            {profiles.map((p) => {
              const isActive = p.id === activeProfile?.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setActiveProfileId(p.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between text-xs ${
                    isActive
                      ? 'bg-[#F7F5F2] border-[#1A1A1A] shadow-xs'
                      : 'bg-[#FDFCFB] border-[#E8E5DF] hover:border-[#1A1A1A]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: p.color || '#1A1A1A' }}
                    />
                    <div>
                      <span className="font-bold text-[#1A1A1A]">{p.name}</span>
                      <span className="text-[10px] text-[#6B7280] block font-mono-num uppercase">
                        {p.type} • {p.displayCurrency}
                      </span>
                    </div>
                  </div>
                  {isActive && (
                    <span className="px-2 py-0.5 rounded bg-[#1A1A1A] text-[#FFFFFF] text-[10px] font-mono-num font-bold">
                      Active Profile
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Profile Form */}
          <form onSubmit={handleCreateProfile} className="pt-3 border-t border-[#E8E5DF] space-y-3">
            <span className="text-xs font-bold text-[#1A1A1A] block">
              Create New Family / Sub-Account Profile
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder="Profile name"
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
            <button
              type="submit"
              disabled={isCreatingProfile || !newProfileName.trim()}
              className="px-3 py-1.5 bg-[#F7F5F2] hover:bg-[#E8E5DF] text-[#1A1A1A] rounded border border-[#E8E5DF] text-xs font-bold flex items-center space-x-1 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Profile</span>
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
                {window.location.origin}/api/paystack/webhook
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

        {/* 4. Owner Security PIN Protection */}
        <div className="bg-white border border-[#E8E5DF] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#E8E5DF] pb-3">
            <Lock className="w-4 h-4 text-[#1A1A1A]" />
            <h2 className="font-display text-base font-bold text-[#1A1A1A]">
              Owner Security PIN
            </h2>
          </div>

          <form onSubmit={handleUpdatePin} className="space-y-3 text-xs">
            <p className="text-[#6B7280] text-xs">
              Protect sensitive account data and real money movements with a 4-to-6 digit numeric PIN.
            </p>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                Current PIN (Default: 1234)
              </label>
              <input
                type="password"
                maxLength={6}
                required
                placeholder="••••"
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value)}
                className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-1.5 rounded-lg border border-[#E8E5DF] font-mono-num tracking-widest text-center focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                  New PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-1.5 rounded-lg border border-[#E8E5DF] font-mono-num tracking-widest text-center focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-1.5 rounded-lg border border-[#E8E5DF] font-mono-num tracking-widest text-center focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingPin || !newPin}
              className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] rounded text-xs font-bold flex items-center space-x-1.5 disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Update Security PIN</span>
            </button>
          </form>
        </div>

        {/* 5. Complete JSON Database Backup & Migration */}
        <div className="col-span-full bg-white border border-[#E8E5DF] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#E8E5DF] pb-3">
            <Shield className="w-4 h-4 text-[#1A1A1A]" />
            <h2 className="font-display text-base font-bold text-[#1A1A1A]">
              Ledger Atomic Database Backup & Migration
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            
            {/* Export */}
            <div className="space-y-3 p-4 bg-[#FDFCFB] rounded-xl border border-[#E8E5DF]">
              <span className="font-bold text-[#1A1A1A] block">
                Export Full System Snapshot
              </span>
              <p className="text-[#6B7280]">
                Download a clean, structured JSON file containing all profiles, transactions, debts, goals, and transfer logs.
              </p>
              <button
                onClick={handleDownloadBackup}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] rounded text-xs font-bold shadow-sm flex items-center space-x-1.5 active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Ledger Backup (JSON)</span>
              </button>
            </div>

            {/* Restore */}
            <div className="space-y-3 p-4 bg-[#FDFCFB] rounded-xl border border-[#E8E5DF]">
              <span className="font-bold text-[#1A1A1A] block">
                Restore from Backup Snapshot
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
                className="px-4 py-1.5 bg-[#F7F5F2] hover:bg-[#E8E5DF] text-[#1A1A1A] rounded border border-[#E8E5DF] text-xs font-bold flex items-center space-x-1.5 disabled:opacity-50"
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
