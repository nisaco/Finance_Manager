import React, { useState } from 'react';
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

const PROVIDERS = [
  'MTN Mobile Money',
  'Telecel Cash (Vodafone)',
  'AirtelTigo Money',
  'GCB Bank',
  'Ecobank Ghana',
  'Stanbic Bank',
  'Zenith Bank',
  'Absa Bank',
  'Fidelity Bank',
  'Access Bank',
  'CalBank',
  'Standard Chartered',
  'Other Commercial Bank',
];

export const VaultWithdrawalModal: React.FC<VaultWithdrawalModalProps> = ({
  isOpen,
  onClose,
  goal,
  onSuccess,
}) => {
  const { showNotification, loadData } = useLedger();

  const [bankOrProvider, setBankOrProvider] = useState('MTN Mobile Money');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !goal) return null;

  const currency = goal.currency || 'GHS';
  const vaultAmount = Number(goal.current || 0);

  // Check maturity status
  const now = new Date();
  const deadline = goal.deadline ? new Date(goal.deadline) : null;
  const isEarly = Boolean(deadline && now < deadline);

  const standardFeePercent = 2; // 2%
  const earlyPenaltyPercent = isEarly ? 10 : 0; // 10% penalty if broken early
  const totalFeePercent = standardFeePercent + earlyPenaltyPercent; // 2% or 12%

  const standardFeeAmount = Number(((vaultAmount * standardFeePercent) / 100).toFixed(2));
  const earlyPenaltyAmount = Number(((vaultAmount * earlyPenaltyPercent) / 100).toFixed(2));
  const totalFeeAmount = Number((standardFeeAmount + earlyPenaltyAmount).toFixed(2));
  const netPayoutAmount = Number((vaultAmount - totalFeeAmount).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim() || !accountName.trim()) {
      setError('Please provide your payout account number and account holder name');
      return;
    }

    if (vaultAmount <= 0) {
      setError('This savings vault has no funds available to withdraw');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.requestVaultWithdrawal(goal.id, {
        bankOrProvider,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
      });

      showNotification(
        `Withdrawal request submitted! Net payout of ${currency} ${netPayoutAmount.toLocaleString()} queued for admin approval.`,
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
                {goal.name} • Target: {currency} {goal.target.toLocaleString()}
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
                are withdrawing before the scheduled maturity date, a{' '}
                <strong>10% early withdrawal penalty</strong> plus the standard{' '}
                <strong>2% processing fee</strong> (total <strong>12%</strong>) will be deducted.
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
                transfer and platform fee applies.
              </p>
            </div>
          )}

          {/* Transparent Fee & Exact Payout Breakdown */}
          <div className="bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              <span>Vault Total Saved:</span>
              <span className="font-mono-num font-semibold text-[#1A1A1A] dark:text-white">
                {currency} {vaultAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
          </div>

          {/* Account Details */}
          <div className="space-y-3.5 pt-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
              Payout Destination Information
            </h3>

            <div>
              <label className="block text-xs font-medium mb-1">
                Bank / Mobile Money Provider
              </label>
              <select
                value={bankOrProvider}
                onChange={(e) => setBankOrProvider(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#1A1A1A] dark:focus:border-white transition-colors"
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Account / Mobile Money Number
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 0244123456 or 1234567890"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#1A1A1A] dark:focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Account Holder Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#1A1A1A] dark:focus:border-white transition-colors"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#F7F5F2] dark:bg-[#15171C] border border-[#E8E5DF] dark:border-[#2D323F] text-[11px] text-[#6B7280] dark:text-[#9CA3AF] leading-normal space-y-1">
            <div>
              <strong>Custodial Rail Settlement:</strong> Payouts are settled securely through licensed Payment Service Providers (Paystack and partner clearing banks/telecom networks).
            </div>
            <div>
              The net amount of <strong className="text-[#1A1A1A] dark:text-white">{currency} {netPayoutAmount.toLocaleString()}</strong> will be disbursed directly to your account with zero hidden fees.
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
              disabled={isSubmitting || vaultAmount <= 0}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-50 flex items-center space-x-1.5 shadow-sm shadow-emerald-600/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <span>Request Payout</span>
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
