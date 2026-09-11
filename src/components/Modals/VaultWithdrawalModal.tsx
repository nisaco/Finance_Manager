import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Calendar,
  Lock,
  ArrowRight,
  ShieldAlert,
  Loader2,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { Goal } from '../../types';
import { api } from '../../api/client';
import { useLedger } from '../../context/LedgerContext';

interface VaultWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  onSuccess?: () => void;
}

interface BankItem {
  name: string;
  code: string;
  type: 'mobile_money' | 'bank';
}

const DEFAULT_PROVIDERS: BankItem[] = [
  { name: 'MTN Mobile Money', code: 'MTN', type: 'mobile_money' },
  { name: 'Telecel Cash (Vodafone)', code: 'VOD', type: 'mobile_money' },
  { name: 'AirtelTigo Money', code: 'ATL', type: 'mobile_money' },
  { name: 'GCB Bank Limited', code: '040100', type: 'bank' },
  { name: 'Ecobank Ghana', code: '130100', type: 'bank' },
  { name: 'Absa Bank Ghana', code: '030100', type: 'bank' },
  { name: 'Stanbic Bank Ghana', code: '190100', type: 'bank' },
  { name: 'Fidelity Bank Ghana', code: '240100', type: 'bank' },
  { name: 'Zenith Bank Ghana', code: '120100', type: 'bank' },
  { name: 'CalBank Limited', code: '140100', type: 'bank' },
  { name: 'Access Bank Ghana', code: '280100', type: 'bank' },
  { name: 'Standard Chartered Bank', code: '020100', type: 'bank' },
];

export const VaultWithdrawalModal: React.FC<VaultWithdrawalModalProps> = ({
  isOpen,
  onClose,
  goal,
  onSuccess,
}) => {
  const { showNotification, loadData } = useLedger();

  const [providers, setProviders] = useState<BankItem[]>(DEFAULT_PROVIDERS);
  const [selectedBankCode, setSelectedBankCode] = useState('MTN');
  const [bankOrProvider, setBankOrProvider] = useState('MTN Mobile Money');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [isResolving, setIsResolving] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch full live bank and mobile money provider directory from Paystack
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    api.getPaystackBanks('ghana')
      .then((banks) => {
        if (!isMounted || !Array.isArray(banks) || banks.length === 0) return;
        const codeSet = new Set<string>();
        const merged: BankItem[] = [];
        // Keep top Ghana mobile money networks first
        for (const p of DEFAULT_PROVIDERS) {
          if (!codeSet.has(p.code)) {
            codeSet.add(p.code);
            merged.push(p);
          }
        }
        // Append all banks from Paystack API
        for (const b of banks) {
          if (!codeSet.has(b.code)) {
            codeSet.add(b.code);
            merged.push({
              name: b.name,
              code: b.code,
              type: b.type === 'mobile_money' ? 'mobile_money' : 'bank',
            });
          }
        }
        setProviders(merged);
      })
      .catch((e) => console.warn('Could not fetch live banks list:', e));

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Prepopulate if goal already has a configured payout destination
  useEffect(() => {
    if (!isOpen || !goal) return;
    const currentBal = Number(goal.current || 0);
    setWithdrawAmount(currentBal > 0 ? String(currentBal) : '');

    const dest = goal.paystackDestination;
    if (dest && dest.type === 'paystack_recipient' && dest.accountNumber) {
      if (dest.bankCode) setSelectedBankCode(dest.bankCode);
      if (dest.bankName) setBankOrProvider(dest.bankName);
      setAccountNumber(dest.accountNumber);
      if (dest.accountName) {
        setAccountName(dest.accountName);
        setIsResolved(true);
      }
    } else {
      setSelectedBankCode('MTN');
      setBankOrProvider('MTN Mobile Money');
      setAccountNumber('');
      setAccountName('');
      setIsResolved(false);
      setResolveError(null);
    }
  }, [isOpen, goal]);

  // AUTOMATIC ACCOUNT NAME FETCHING:
  // When user enters account number and selects network/bank, automatically query Paystack
  useEffect(() => {
    const cleanNum = accountNumber.replace(/\s+/g, '');
    if (cleanNum.length < 9) {
      setIsResolved(false);
      setResolveError(null);
      return;
    }

    let isCurrent = true;
    const timer = setTimeout(async () => {
      setIsResolving(true);
      setResolveError(null);
      try {
        const res = await api.resolveAccount(cleanNum, selectedBankCode);
        if (isCurrent) {
          setAccountName(res.accountName);
          setIsResolved(true);
          setResolveError(null);
        }
      } catch (err: any) {
        if (isCurrent) {
          console.warn('Account resolution error:', err);
          setIsResolved(false);
          setResolveError(err?.message || 'Could not auto-verify account name with network');
        }
      } finally {
        if (isCurrent) {
          setIsResolving(false);
        }
      }
    }, 450);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [accountNumber, selectedBankCode]);

  const handleBankChange = (code: string) => {
    setSelectedBankCode(code);
    const found = providers.find((p) => p.code === code);
    if (found) {
      setBankOrProvider(found.name);
    }
    setIsResolved(false);
  };

  const handleManualResolve = async () => {
    const cleanNum = accountNumber.replace(/\s+/g, '');
    if (cleanNum.length < 9) {
      setResolveError('Please enter at least 9 or 10 digits');
      return;
    }
    setIsResolving(true);
    setResolveError(null);
    try {
      const res = await api.resolveAccount(cleanNum, selectedBankCode);
      setAccountName(res.accountName);
      setIsResolved(true);
      setResolveError(null);
    } catch (err: any) {
      setIsResolved(false);
      setResolveError(err?.message || 'Could not resolve account name');
    } finally {
      setIsResolving(false);
    }
  };

  if (!isOpen || !goal) return null;

  const currency = goal.currency || 'GHS';
  const availableBalance = Number(goal.current || 0);
  const parsedWithdrawAmount = parseFloat(withdrawAmount);
  const numericAmount = isNaN(parsedWithdrawAmount) ? 0 : parsedWithdrawAmount;

  // Check maturity status
  const now = new Date();
  const deadline = goal.deadline ? new Date(goal.deadline) : null;
  const isEarly = Boolean(deadline && now < deadline);

  const standardFeePercent = 2; // 2%
  const earlyPenaltyPercent = isEarly ? 10 : 0; // 10% penalty if broken early
  const totalFeePercent = standardFeePercent + earlyPenaltyPercent; // 2% or 12%

  const standardFeeAmount = Number(((numericAmount * standardFeePercent) / 100).toFixed(2));
  const earlyPenaltyAmount = Number(((numericAmount * earlyPenaltyPercent) / 100).toFixed(2));
  const totalFeeAmount = Number((standardFeeAmount + earlyPenaltyAmount).toFixed(2));
  const netPayoutAmount = Number(Math.max(0, numericAmount - totalFeeAmount).toFixed(2));
  const remainingVaultBalance = Number(Math.max(0, availableBalance - numericAmount).toFixed(2));

  const isAmountExceeded = numericAmount > availableBalance;
  const isAmountInvalid = numericAmount <= 0;
  const isPartialWithdrawal = numericAmount > 0 && numericAmount < availableBalance;

  const handleQuickPercent = (pct: number) => {
    if (availableBalance <= 0) return;
    if (pct === 100) {
      setWithdrawAmount(String(availableBalance));
    } else {
      const val = Number(((availableBalance * pct) / 100).toFixed(2));
      setWithdrawAmount(String(val));
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (availableBalance <= 0) {
      setError('This savings vault has no funds available to withdraw');
      return;
    }

    if (isAmountInvalid) {
      setError('Please enter a valid withdrawal amount greater than 0');
      return;
    }

    if (isAmountExceeded) {
      setError(`Withdrawal amount cannot exceed your available vault balance of ${currency} ${availableBalance.toLocaleString()}`);
      return;
    }

    if (!accountNumber.trim() || !accountName.trim()) {
      setError('Please provide your payout account number and account holder name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.requestVaultWithdrawal(goal.id, {
        amount: numericAmount,
        bankOrProvider,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
      });

      showNotification(
        `Withdrawal request submitted! Net payout of ${currency} ${netPayoutAmount.toLocaleString()} queued for approval.${
          isPartialWithdrawal ? ` Remaining in vault: ${currency} ${remainingVaultBalance.toLocaleString()}` : ''
        }`,
        'success'
      );
      await loadData();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Withdrawal failed:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to submit withdrawal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#FDFCFB] dark:bg-[#181A20] rounded-2xl border border-[#E8E5DF] dark:border-[#2D323F] shadow-2xl overflow-hidden text-[#1A1A1A] dark:text-[#F3F4F6] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#15171C]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base">Savings Vault Withdrawal</h2>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] font-mono-num">
                {goal.name} • Available: {currency} {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#1A1A1A] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#252830] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-start space-x-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Maturity Status Alert */}
          {isEarly ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 space-y-2">
              <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Early Withdrawal Fee Notice (12% Deduction)</span>
              </div>
              <p className="text-[11px] text-amber-900/80 dark:text-amber-200/70 leading-relaxed">
                This vault target date is set for{' '}
                <strong className="font-mono-num">{deadline?.toLocaleDateString()}</strong>. Because you
                are withdrawing before scheduled maturity, a{' '}
                <strong>10% early withdrawal penalty</strong> plus the standard{' '}
                <strong>2% processing fee</strong> (total <strong>12%</strong>) will be deducted on the withdrawn amount.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 space-y-1">
              <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Matured Savings Vault (2% Standard Processing Fee)</span>
              </div>
              <p className="text-[11px] text-emerald-900/80 dark:text-emerald-200/70 leading-relaxed">
                This vault has reached its target maturity date. Only the standard 2% administrative
                transfer and network fee applies.
              </p>
            </div>
          )}

          {/* Amount to Withdraw Card with Presets */}
          <div className="bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <label htmlFor="vault-withdraw-amount" className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A] dark:text-white">
                Amount to Withdraw
              </label>
              <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                Available:{' '}
                <span className="font-mono-num font-bold text-emerald-600 dark:text-emerald-400">
                  {currency} {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-xs font-bold text-[#6B7280] dark:text-[#9CA3AF] pointer-events-none font-mono">
                {currency}
              </span>
              <input
                id="vault-withdraw-amount"
                type="number"
                step="any"
                min="0.01"
                max={availableBalance}
                required
                value={withdrawAmount}
                onChange={(e) => {
                  setWithdrawAmount(e.target.value);
                  setError(null);
                }}
                placeholder="0.00"
                className={`w-full pl-14 pr-16 py-2.5 bg-[#FAF9F6] dark:bg-[#15171C] border rounded-xl text-sm font-mono font-bold focus:outline-hidden transition-colors ${
                  isAmountExceeded
                    ? 'border-rose-500 text-rose-600 dark:border-rose-500 dark:text-rose-400 focus:border-rose-600'
                    : 'border-[#E8E5DF] dark:border-[#2D323F] focus:border-[#1A1A1A] dark:focus:border-white'
                }`}
              />
              <button
                type="button"
                onClick={() => handleQuickPercent(100)}
                className="absolute right-2 px-2.5 py-1 text-[10px] font-bold rounded-lg bg-[#E8E5DF] hover:bg-[#D5D0C7] dark:bg-[#2D323F] dark:hover:bg-[#3E4556] text-[#1A1A1A] dark:text-white transition-colors"
              >
                ALL
              </button>
            </div>

            {/* Quick Percentage Presets */}
            <div className="flex items-center space-x-2">
              {[25, 50, 75, 100].map((pct) => {
                const targetVal = pct === 100 ? availableBalance : Number(((availableBalance * pct) / 100).toFixed(2));
                const isSelected = Math.abs(numericAmount - targetVal) < 0.01 && numericAmount > 0;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleQuickPercent(pct)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                      isSelected
                        ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] dark:bg-white dark:text-[#1A1A1A] dark:border-white shadow-xs'
                        : 'bg-[#F7F5F2] dark:bg-[#252830] text-[#6B7280] dark:text-[#9CA3AF] border-transparent hover:border-[#D1D5DB] dark:hover:border-[#374151]'
                    }`}
                  >
                    {pct === 100 ? 'All (100%)' : `${pct}%`}
                  </button>
                );
              })}
            </div>

            {/* Dynamic Alerts based on entered amount */}
            {isAmountExceeded && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Amount exceeds available vault balance of {currency} {availableBalance.toLocaleString()}</span>
              </p>
            )}

            {isPartialWithdrawal && !isAmountExceeded && (
              <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300">
                <span className="font-medium">Partial withdrawal</span>
                <span className="font-mono-num">
                  Remaining in Vault:{' '}
                  <strong className="font-bold text-[#1A1A1A] dark:text-white">
                    {currency} {remainingVaultBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Transparent Fee & Exact Payout Breakdown */}
          <div className="bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              <span>Requested Withdrawal Amount:</span>
              <span className="font-mono-num font-semibold text-[#1A1A1A] dark:text-white">
                {currency} {numericAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              <span>Standard Administrative Fee ({standardFeePercent}%):</span>
              <span className="font-mono-num text-rose-600 dark:text-rose-400">
                -{currency} {standardFeeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {isEarly && (
              <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
                <span>Early Break Penalty ({earlyPenaltyPercent}%):</span>
                <span className="font-mono-num">
                  -{currency} {earlyPenaltyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="pt-2.5 border-t border-[#E8E5DF] dark:border-[#2D323F] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block text-[#1A1A1A] dark:text-white">
                  Exact Payout To Receive:
                </span>
                <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">
                  Directly credited to your account
                </span>
              </div>
              <span className="text-lg font-bold font-mono-num text-emerald-600 dark:text-emerald-400">
                {currency} {netPayoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {isPartialWithdrawal && (
              <div className="pt-2 border-t border-dashed border-[#E8E5DF] dark:border-[#2D323F] flex items-center justify-between text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                <span>Remaining in Vault After Payout:</span>
                <span className="font-mono-num font-semibold text-[#1A1A1A] dark:text-white">
                  {currency} {remainingVaultBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {/* Account Details */}
          <div className="space-y-3.5 pt-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
              Payout Destination Information
            </h3>

            {/* Bank / MoMo Selector */}
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center justify-between">
                <span>Bank / Mobile Money Provider</span>
                <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">
                  Ghana MoMo &amp; Commercial Banks
                </span>
              </label>
              <select
                value={selectedBankCode}
                onChange={(e) => handleBankChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#1A1A1A] dark:focus:border-white transition-colors"
              >
                <optgroup label="Mobile Money Networks (Ghana)">
                  {providers
                    .filter((p) => p.type === 'mobile_money')
                    .map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Commercial Banking Institutions">
                  {providers
                    .filter((p) => p.type !== 'mobile_money')
                    .map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            {/* Account / Mobile Money Number with Live Auto-Fetch Status */}
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center justify-between">
                <span>Account / Mobile Money Number</span>
                <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">
                  e.g. 0244000000 or Account No.
                </span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  placeholder="e.g. 0244123456 or 1234567890"
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value);
                    setIsResolved(false);
                  }}
                  className="w-full pl-3.5 pr-28 py-2.5 bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#1A1A1A] dark:focus:border-white transition-colors"
                />

                <div className="absolute right-2 flex items-center space-x-1.5">
                  {isResolving ? (
                    <div className="flex items-center space-x-1 px-2 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 rounded-lg text-[10px] font-medium border border-amber-200 dark:border-amber-800 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                      <span>Fetching...</span>
                    </div>
                  ) : isResolved ? (
                    <div className="flex items-center space-x-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Verified</span>
                    </div>
                  ) : accountNumber.replace(/\s+/g, '').length >= 9 ? (
                    <button
                      type="button"
                      onClick={handleManualResolve}
                      className="px-2 py-1 bg-[#F7F5F2] dark:bg-[#252830] hover:bg-[#E8E5DF] text-[#1A1A1A] dark:text-white rounded-lg text-[10px] font-semibold border border-[#E8E5DF] dark:border-[#2D323F] transition-colors"
                    >
                      Fetch Name
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Account Holder Full Name (Auto-Populated) */}
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center justify-between">
                <span>Account Holder Full Name</span>
                {isResolved && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified by Network
                  </span>
                )}
              </label>

              <input
                type="text"
                required
                placeholder={isResolving ? 'Querying Paystack network...' : 'Full name as registered on account'}
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#1A1A1A] dark:focus:border-white transition-colors"
              />

              {/* Status Banner */}
              {isResolving && (
                <p className="mt-1 text-[11px] text-[#6B7280] dark:text-[#9CA3AF] flex items-center gap-1.5 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin text-[#1A1A1A] dark:text-white" />
                  <span>Connecting to {bankOrProvider} to verify account holder name...</span>
                </p>
              )}

              {isResolved && accountName && (
                <div className="mt-1.5 p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-150">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold">{accountName}</span>
                  </div>
                  <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-mono-num">
                    {bankOrProvider}
                  </span>
                </div>
              )}

              {resolveError && !isResolved && (
                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{resolveError}. You can type your name manually.</span>
                </p>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#F7F5F2] dark:bg-[#15171C] border border-[#E8E5DF] dark:border-[#2D323F] text-[11px] text-[#6B7280] dark:text-[#9CA3AF] leading-normal space-y-1">
            <div>
              <strong>Custodial Rail Settlement:</strong> Payouts are settled securely through licensed Payment Service Providers (Paystack and partner clearing banks/telecom networks).
            </div>
            <div>
              The net amount of <strong className="text-[#1A1A1A] dark:text-white">{currency} {netPayoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> will be disbursed directly to your account with zero hidden fees.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] hover:bg-[#F3F4F6] dark:hover:bg-[#252830] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || availableBalance <= 0 || isAmountInvalid || isAmountExceeded}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-50 flex items-center space-x-1.5 shadow-sm shadow-emerald-600/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <span>Request Payout ({currency} {netPayoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
