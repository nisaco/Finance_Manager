import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Building2,
  ArrowRight,
  ShieldAlert,
  Loader2,
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

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    api.getPaystackBanks('ghana')
      .then((banks) => {
        if (!isMounted || !Array.isArray(banks) || banks.length === 0) return;
        const codeSet = new Set<string>();
        const merged: BankItem[] = [];
        for (const p of DEFAULT_PROVIDERS) {
          if (!codeSet.has(p.code)) {
            codeSet.add(p.code);
            merged.push(p);
          }
        }
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
          setResolveError(err?.message || 'Could not auto-verify account name');
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

  const now = new Date();
  const deadline = goal.deadline ? new Date(goal.deadline) : null;
  const isEarly = Boolean(deadline && now < deadline);

  const standardFeePercent = 2;
  const earlyPenaltyPercent = isEarly ? 10 : 0;
  const totalFeePercent = standardFeePercent + earlyPenaltyPercent;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg lg-card p-0 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-pos/15 flex items-center justify-center text-pos border border-pos/30">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-ink">Savings Vault Withdrawal</h2>
              <p className="text-[11px] text-ink-muted font-mono-num num">
                {goal.name} • Available: {currency} {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-sunken transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-neg/10 border border-neg/30 flex items-start space-x-2.5 text-xs text-neg">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-neg" />
              <span>{error}</span>
            </div>
          )}

          {/* Maturity Status Alert */}
          {isEarly ? (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
              <div className="flex items-center space-x-2 text-amber-600 font-semibold text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Early Withdrawal Notice ({totalFeePercent}% Deduction)</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                This vault maturity date is set for <strong className="font-mono-num num text-ink">{deadline?.toLocaleDateString()}</strong>. A <strong>10% early break penalty</strong> plus the standard <strong>2% processing fee</strong> applies.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-pos/10 border border-pos/30 space-y-1">
              <div className="flex items-center space-x-2 text-pos font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4 text-pos" />
                <span>Matured Savings Vault (2% Standard Processing Fee)</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Target maturity date reached. Only the standard 2% administrative transfer fee applies.
              </p>
            </div>
          )}

          {/* Amount to Withdraw Card */}
          <div className="lg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="vault-withdraw-amount" className="text-xs font-bold uppercase tracking-wider text-ink font-mono-num">
                Amount to Withdraw
              </label>
              <div className="text-[11px] text-ink-muted">
                Available:{' '}
                <span className="font-mono-num num font-bold text-pos">
                  {currency} {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-xs font-bold text-ink-muted pointer-events-none font-mono-num">
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
                className={`w-full pl-14 pr-16 lg-input text-sm font-mono-num num font-bold ${
                  isAmountExceeded ? 'border-neg text-neg' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => handleQuickPercent(100)}
                className="absolute right-2 px-2.5 py-1 text-[10px] font-bold rounded-lg bg-sunken border border-line text-ink hover:border-ink/30 transition-colors"
              >
                ALL
              </button>
            </div>

            {/* Quick Percentage Presets */}
            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((pct) => {
                const targetVal = pct === 100 ? availableBalance : Number(((availableBalance * pct) / 100).toFixed(2));
                const isSelected = Math.abs(numericAmount - targetVal) < 0.01 && numericAmount > 0;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleQuickPercent(pct)}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      isSelected
                        ? 'bg-ink text-canvas border-ink shadow-xs'
                        : 'bg-sunken text-ink-muted border-line hover:text-ink'
                    }`}
                  >
                    {pct === 100 ? '100%' : `${pct}%`}
                  </button>
                );
              })}
            </div>

            {isPartialWithdrawal && !isAmountExceeded && (
              <div className="p-2.5 rounded-xl bg-sunken border border-line flex items-center justify-between text-xs text-ink-muted">
                <span>Partial withdrawal</span>
                <span className="font-mono-num num">
                  Remaining in Vault: <strong className="font-bold text-ink">{currency} {remainingVaultBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Fee & Exact Payout Breakdown */}
          <div className="p-4 rounded-xl bg-sunken border border-line space-y-2 text-xs">
            <div className="flex items-center justify-between text-ink-muted">
              <span>Requested Withdrawal Amount:</span>
              <span className="font-mono-num num font-semibold text-ink">
                {currency} {numericAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between text-ink-muted">
              <span>Standard Processing Fee ({standardFeePercent}%):</span>
              <span className="font-mono-num num text-neg">
                -{currency} {standardFeeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {isEarly && (
              <div className="flex items-center justify-between text-amber-600">
                <span>Early Break Penalty ({earlyPenaltyPercent}%):</span>
                <span className="font-mono-num num">
                  -{currency} {earlyPenaltyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-line flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block text-ink">
                  Exact Payout To Receive:
                </span>
                <span className="text-[10px] text-ink-muted">
                  Directly credited to your account
                </span>
              </div>
              <span className="text-base font-bold font-mono-num num text-pos">
                {currency} {netPayoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Account Details */}
          <div className="space-y-3 pt-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Payout Destination Information
            </h3>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Bank / Mobile Money Provider
              </label>
              <select
                value={selectedBankCode}
                onChange={(e) => handleBankChange(e.target.value)}
                className="w-full lg-select text-xs"
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

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Account / Mobile Money Number
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  placeholder="e.g. 0244123456 or Account No."
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value);
                    setIsResolved(false);
                  }}
                  className="w-full lg-input text-xs font-mono-num num pr-24"
                />

                <div className="absolute right-2 flex items-center space-x-1">
                  {isResolving ? (
                    <span className="text-[10px] text-ink-muted flex items-center gap-1 font-mono-num">
                      <Loader2 className="w-3 h-3 animate-spin text-accent" />
                      Fetching...
                    </span>
                  ) : isResolved ? (
                    <span className="lg-pill lg-pill-pos text-[9px] py-0 px-1.5">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verified
                    </span>
                  ) : accountNumber.replace(/\s+/g, '').length >= 9 ? (
                    <button
                      type="button"
                      onClick={handleManualResolve}
                      className="lg-btn-quiet text-[10px] py-0.5 px-2"
                    >
                      Verify
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Account Holder Full Name
              </label>
              <input
                type="text"
                required
                placeholder={isResolving ? 'Resolving account holder name...' : 'Full name on account'}
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full lg-input text-xs"
              />

              {resolveError && !isResolved && (
                <p className="mt-1 text-[11px] text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{resolveError}. You can type your name manually.</span>
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end space-x-2 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="lg-btn-quiet text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || availableBalance <= 0 || isAmountInvalid || isAmountExceeded}
              className="lg-btn-solid text-xs flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
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
