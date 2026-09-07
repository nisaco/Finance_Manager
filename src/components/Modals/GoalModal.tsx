import React, { useState, useEffect } from 'react';
import {
  X,
  PiggyBank,
  ShieldCheck,
  CheckCircle,
  Loader2,
  Lock,
  Sparkles,
  Percent,
} from 'lucide-react';
import { Goal, PaystackBank } from '../../types';
import { useLedger } from '../../context/LedgerContext';
import { api } from '../../api/client';
import { formatCurrency } from '../../design/tokens';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Goal | null;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  initialData,
}) => {
  const { activeProfile, refreshData, notify } = useLedger();

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('0');
  const [currency, setCurrency] = useState('GHS');
  const [deadline, setDeadline] = useState('');
  const [vaultType, setVaultType] = useState<Goal['vaultType']>('high_yield_vault');
  const [interestRateApr, setInterestRateApr] = useState('7.5');
  const [isLocked, setIsLocked] = useState(true);

  // Paystack real-money setup
  const [isRealMoney, setIsRealMoney] = useState(false);
  const [banks, setBanks] = useState<PaystackBank[]>([]);
  const [selectedBankCode, setSelectedBankCode] = useState('MTN');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getPaystackBanks('ghana').then(setBanks).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setTarget(initialData.target.toString());
      setCurrent(initialData.current.toString());
      setCurrency(initialData.currency);
      setDeadline(initialData.deadline || '');
      setVaultType(initialData.vaultType || 'high_yield_vault');
      setInterestRateApr(initialData.interestRateApr?.toString() || '7.5');
      setIsLocked(initialData.isLocked ?? true);

      const hasPaystack = initialData.paystackDestination?.type === 'paystack_recipient';
      setIsRealMoney(hasPaystack);
      if (hasPaystack) {
        setAccountName(initialData.paystackDestination.accountName || '');
        setAccountNumber(initialData.paystackDestination.accountNumber || '');
        setIsResolved(true);
      }
    } else {
      setName('');
      setTarget('');
      setCurrent('0');
      setCurrency(activeProfile?.displayCurrency || 'GHS');
      setDeadline('');
      setVaultType('high_yield_vault');
      setInterestRateApr('7.5');
      setIsLocked(true);
      setIsRealMoney(false);
      setAccountNumber('');
      setAccountName('');
      setIsResolved(false);
    }
  }, [initialData, isOpen, activeProfile]);

  const handleResolveAccount = async () => {
    if (!accountNumber || accountNumber.length < 9) {
      notify('Please enter a valid account or mobile money number', 'error');
      return;
    }
    setIsResolving(true);
    try {
      const res = await api.resolveAccount(accountNumber, selectedBankCode);
      setAccountName(res.accountName);
      setIsResolved(true);
      notify(`Account verified: ${res.accountName}`);
    } catch (err: any) {
      notify(err.message || 'Account resolution failed', 'error');
      setIsResolved(false);
    } finally {
      setIsResolving(false);
    }
  };

  const handleLockDuration = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDeadline(d.toISOString().split('T')[0]);
  };

  // Calculate estimated yield
  const numTarget = parseFloat(target) || 0;
  const numRate = parseFloat(interestRateApr) || 0;
  const estimatedAnnualYield = (numTarget * (numRate / 100));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    if (!numTarget || numTarget <= 0) {
      notify('Please enter a valid target amount', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let paystackDestination: Goal['paystackDestination'] = { type: 'none' };

      if (isRealMoney) {
        const bank = banks.find((b) => b.code === selectedBankCode);
        let recipientCode = initialData?.paystackDestination?.recipientCode;

        if (!recipientCode) {
          const recRes = await api.createRecipient(
            accountName || name,
            accountNumber,
            selectedBankCode,
            currency
          );
          recipientCode = recRes.recipientCode;
        }

        paystackDestination = {
          type: 'paystack_recipient',
          recipientCode,
          accountLast4: accountNumber.slice(-4),
          bankName: bank?.name || 'Bank / MoMo Ghana',
          accountName: accountName || 'Verified Vault',
          accountNumber,
        };
      }

      const payload = {
        name,
        target: numTarget,
        currency,
        deadline: deadline || undefined,
        vaultType,
        interestRateApr: vaultType === 'high_yield_vault' ? numRate : 0,
        isLocked: vaultType === 'high_yield_vault' ? isLocked : false,
        paystackDestination,
      };

      if (initialData) {
        await api.updateGoal(initialData.id, payload);
        notify('Savings vault updated');
      } else {
        await api.createGoal({
          profileId: activeProfile.id,
          ...payload,
          current: isRealMoney ? 0 : parseFloat(current) || 0,
        });
        notify('Savings vault established');
      }
      await refreshData();
      onClose();
    } catch (err: any) {
      notify(err.message || 'Failed to save goal', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A1A1A]/40 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#E8E5DF] dark:border-[#2D323F] shrink-0">
          <div className="flex items-center space-x-2">
            <PiggyBank className="w-5 h-5 text-[#1A1A1A] dark:text-white" />
            <h2 className="font-display text-base sm:text-lg font-bold text-[#1A1A1A] dark:text-white">
              {initialData ? 'Edit Savings Vault' : 'Create New Savings Vault'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-1 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-white hover:bg-[#F7F5F2] dark:hover:bg-[#252830] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Vault Archetype */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mb-1.5 font-bold">
              Vault Type &amp; Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setVaultType('high_yield_vault');
                  setIsLocked(true);
                }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  vaultType === 'high_yield_vault'
                    ? 'border-[#1A1A1A] dark:border-white bg-[#FDFCFB] dark:bg-[#15181E] ring-1 ring-[#1A1A1A] dark:ring-white'
                    : 'border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#1E2128] hover:bg-[#F7F5F2]'
                }`}
              >
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[#1A1A1A] dark:text-white">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Time-Locked</span>
                </div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1">
                  Discipline Vault
                </div>
                <div className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5 leading-tight">
                  Locked to term. 10% penalty only if broken early.
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setVaultType('emergency_stash');
                  setIsLocked(false);
                }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  vaultType === 'emergency_stash'
                    ? 'border-[#1A1A1A] dark:border-white bg-[#FDFCFB] dark:bg-[#15181E] ring-1 ring-[#1A1A1A] dark:ring-white'
                    : 'border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#1E2128] hover:bg-[#F7F5F2]'
                }`}
              >
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[#1A1A1A] dark:text-white">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>Emergency</span>
                </div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-1">
                  Instant Access
                </div>
                <div className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5 leading-tight">
                  Flexible reserve. Standard 2% protocol fee.
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setVaultType('flexible_goal');
                  setIsLocked(false);
                }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  vaultType === 'flexible_goal'
                    ? 'border-[#1A1A1A] dark:border-white bg-[#FDFCFB] dark:bg-[#15181E] ring-1 ring-[#1A1A1A] dark:ring-white'
                    : 'border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#1E2128] hover:bg-[#F7F5F2]'
                }`}
              >
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[#1A1A1A] dark:text-white">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span>Milestone</span>
                </div>
                <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-1">
                  Target Savings
                </div>
                <div className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5 leading-tight">
                  Purchase or event savings milestones.
                </div>
              </button>
            </div>
          </div>

          {/* Goal Name */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mb-1 font-bold">
              Vault Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 6-Month Emergency Fund, Land Investment, Tech Equipment"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#FDFCFB] dark:bg-[#15181E] text-[#1A1A1A] dark:text-white px-3 py-2 rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] text-sm focus:outline-none focus:border-[#1A1A1A] dark:focus:border-white"
            />
          </div>

          {/* Target Amount & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mb-1 font-bold">
                Target Vault Target
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="10000.00"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full bg-[#FDFCFB] dark:bg-[#15181E] text-[#1A1A1A] dark:text-white px-3 py-2 rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] text-sm font-mono-num font-bold focus:outline-none focus:border-[#1A1A1A] dark:focus:border-white"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mb-1 font-bold">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[#FDFCFB] dark:bg-[#15181E] text-[#1A1A1A] dark:text-white px-3 py-2 rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] text-sm font-mono-num focus:outline-none focus:border-[#1A1A1A] dark:focus:border-white"
              >
                <option value="GHS">GHS (Ghana Cedi)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="GBP">GBP (British Pound)</option>
                <option value="NGN">NGN (Nigerian Naira)</option>
              </select>
            </div>
          </div>

          {/* Lock Duration & Discipline Notice for Time-Locked Vaults */}
          {vaultType === 'high_yield_vault' && (
            <div className="p-3.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-2.5">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Discipline Lock Term Shortcuts</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleLockDuration(30)}
                  className="px-2.5 py-1 text-xs rounded bg-white dark:bg-[#1E2128] border border-amber-200 dark:border-amber-800 hover:bg-amber-100 font-medium"
                >
                  30 Days (1 Mo)
                </button>
                <button
                  type="button"
                  onClick={() => handleLockDuration(90)}
                  className="px-2.5 py-1 text-xs rounded bg-white dark:bg-[#1E2128] border border-amber-200 dark:border-amber-800 hover:bg-amber-100 font-medium"
                >
                  90 Days (3 Mo)
                </button>
                <button
                  type="button"
                  onClick={() => handleLockDuration(180)}
                  className="px-2.5 py-1 text-xs rounded bg-white dark:bg-[#1E2128] border border-amber-200 dark:border-amber-800 hover:bg-amber-100 font-medium"
                >
                  180 Days (6 Mo)
                </button>
                <button
                  type="button"
                  onClick={() => handleLockDuration(365)}
                  className="px-2.5 py-1 text-xs rounded bg-white dark:bg-[#1E2128] border border-amber-200 dark:border-amber-800 hover:bg-amber-100 font-medium"
                >
                  365 Days (1 Yr)
                </button>
              </div>

              {/* Fee and Penalty Notice */}
              <div className="pt-2 border-t border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                <strong>Discipline Commitment:</strong> Reaching maturity incurs only the standard 2% disbursement fee. Liquidating early prior to maturity triggers a 10% early unlock penalty.
              </div>
            </div>
          )}

          {/* Maturity / Target Date */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mb-1 font-bold">
              {vaultType === 'high_yield_vault' ? 'Maturity Date (Lock Expiry)' : 'Target Date (Optional)'}
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-[#FDFCFB] dark:bg-[#15181E] text-[#1A1A1A] dark:text-white px-3 py-2 rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] text-sm font-mono-num focus:outline-none focus:border-[#1A1A1A] dark:focus:border-white"
            />
          </div>

          {/* PAYSTACK DESTINATION SECTION */}
          <div className="border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl p-4 bg-[#FDFCFB] dark:bg-[#181A20] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                  Link Paystack Payout Destination
                </span>
                <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] block">
                  Connect a verified bank or Mobile Money account for direct Paystack payouts.
                </span>
              </div>
              <input
                type="checkbox"
                id="realMoneyToggle"
                checked={isRealMoney}
                onChange={(e) => setIsRealMoney(e.target.checked)}
                className="w-4 h-4 rounded text-[#1A1A1A] bg-[#FFFFFF] border-[#E8E5DF] focus:ring-[#1A1A1A]"
              />
            </div>

            {isRealMoney && (
              <div className="space-y-3 pt-2 border-t border-[#E8E5DF] dark:border-[#2D323F] animate-in fade-in duration-200">
                {/* Bank / Provider Selection */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mb-1 font-bold">
                    Destination Bank or Mobile Money Network
                  </label>
                  <select
                    value={selectedBankCode}
                    onChange={(e) => {
                      setSelectedBankCode(e.target.value);
                      setIsResolved(false);
                    }}
                    className="w-full bg-[#FFFFFF] dark:bg-[#15181E] text-[#1A1A1A] dark:text-white px-3 py-2 rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] text-xs focus:outline-none focus:border-[#1A1A1A]"
                  >
                    {banks.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Account / MoMo Number with Verification */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mb-1 font-bold">
                    Account / Mobile Money Number
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="e.g. 0244000000 or Account No"
                      value={accountNumber}
                      onChange={(e) => {
                        setAccountNumber(e.target.value);
                        setIsResolved(false);
                      }}
                      className="w-full bg-[#FFFFFF] dark:bg-[#15181E] text-[#1A1A1A] dark:text-white px-3 py-2 rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] text-xs font-mono-num focus:outline-none focus:border-[#1A1A1A]"
                    />
                    <button
                      type="button"
                      onClick={handleResolveAccount}
                      disabled={isResolving || !accountNumber}
                      className="px-3 py-2 bg-[#F7F5F2] dark:bg-[#252830] hover:bg-[#E8E5DF] dark:hover:bg-[#2D323F] text-[#1A1A1A] dark:text-white text-xs font-bold rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] flex items-center space-x-1 shrink-0 disabled:opacity-50"
                    >
                      {isResolving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      <span>Verify</span>
                    </button>
                  </div>
                </div>

                {/* Resolved Account Badge */}
                {isResolved && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-2 text-xs text-emerald-700 dark:text-emerald-300">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span className="font-bold font-mono-num truncate">
                      Holder: {accountName}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E8E5DF] dark:border-[#2D323F]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-bold text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] dark:bg-white dark:hover:bg-gray-100 text-[#FFFFFF] dark:text-[#1A1A1A] rounded-md text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Securing...' : initialData ? 'Save Changes' : 'Initialize Vault'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
