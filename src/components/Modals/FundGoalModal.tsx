import React, { useState } from 'react';
import {
  X,
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Lock,
  CreditCard,
  Smartphone,
  ExternalLink,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { Goal } from '../../types';
import { useLedger } from '../../context/LedgerContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { formatCurrency } from '../../design/tokens';

interface FundGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
}

export const FundGoalModal: React.FC<FundGoalModalProps> = ({
  isOpen,
  onClose,
  goal,
}) => {
  const { refreshData, notify } = useLedger();
  const { user } = useAuth();

  const [method, setMethod] = useState<'paystack' | 'manual'>('paystack');
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const [depositResult, setDepositResult] = useState<{
    reference?: string;
    authorizationUrl?: string;
    simulated?: boolean;
    status: 'pending' | 'success' | 'failed';
    message?: string;
  } | null>(null);

  if (!isOpen || !goal) return null;

  const remaining = Math.max(0, goal.target - goal.current);

  const presetAmounts = [100, 250, 500, 1000, 2500, 5000].filter(
    (amt) => amt <= Math.max(1000, goal.target)
  );

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      notify('Please enter a valid deposit amount', 'error');
      return;
    }

    setIsProcessing(true);
    setDepositResult(null);

    try {
      if (method === 'paystack') {
        // Direct Paystack Deposit Checkout flow
        const init = await api.initializeDeposit({
          amount: numAmount,
          currency: goal.currency,
          goalId: goal.id,
          profileId: goal.profileId,
          email: email || user?.email || 'saver@ledgerapp.io',
        });

        setDepositResult({
          reference: init.reference,
          authorizationUrl: init.authorizationUrl,
          simulated: init.simulated,
          status: 'pending',
          message: init.simulated
            ? 'Deposit initialized via Paystack Sandbox rail. Click below to verify and confirm instant settlement.'
            : 'Paystack authorization token generated. Complete the checkout or verify payment settlement.',
        });

        // Auto verify for smooth sandbox / simulation experience
        if (init.simulated) {
          setTimeout(async () => {
            try {
              const verified = await api.verifyDeposit(init.reference);
              if (verified.status === 'success') {
                setDepositResult({
                  reference: init.reference,
                  authorizationUrl: init.authorizationUrl,
                  simulated: true,
                  status: 'success',
                  message: `Deposit confirmed: ${formatCurrency(numAmount, goal.currency)} credited to ${goal.name}`,
                });
                await refreshData();
              }
            } catch (err) {
              console.warn('Auto verification pending:', err);
            }
          }, 1500);
        }
      } else {
        // Manual ledger credit flow
        const res = await api.fundGoal(goal.id, numAmount, goal.currency);
        notify(res.message || 'Deposit credited to vault balance');
        await refreshData();
        onClose();
      }
    } catch (err: any) {
      notify(err.message || 'Deposit initiation failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualVerify = async () => {
    if (!depositResult?.reference) return;
    setIsCheckingStatus(true);
    try {
      const res = await api.verifyDeposit(depositResult.reference);
      setDepositResult({
        ...depositResult,
        status: res.status,
        message: res.message || 'Paystack payment status updated',
      });
      if (res.status === 'success') {
        notify('Paystack payment confirmed and vault balance credited!');
        await refreshData();
      }
    } catch (err: any) {
      notify(err.message || 'Verification check failed', 'error');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A1A1A]/40 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#E8E5DF] dark:border-[#2D323F] shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-display text-base sm:text-lg font-bold text-[#1A1A1A] dark:text-white">
                Deposit to Savings Vault
              </h2>
              {goal.deadline && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <Calendar className="w-2.5 h-2.5 mr-1" />
                  Target Date: {goal.deadline}
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mt-0.5">
              {goal.name} • {formatCurrency(goal.current, goal.currency)} of {formatCurrency(goal.target, goal.currency)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-1 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-white hover:bg-[#F7F5F2] dark:hover:bg-[#252830] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transfer Confirmation & In-Flight State */}
        {depositResult ? (
          <div className="p-5 sm:p-6 space-y-4 text-center overflow-y-auto flex-1">
            {depositResult.status === 'success' ? (
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto animate-in zoom-in">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            ) : depositResult.status === 'pending' ? (
              <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
            )}

            <div>
              <h3 className="font-display text-base font-bold text-[#1A1A1A] dark:text-white">
                {depositResult.status === 'success'
                  ? 'Deposit Successfully Credited!'
                  : depositResult.status === 'pending'
                  ? 'Paystack Settlement In Progress'
                  : 'Deposit Settlement Failed'}
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mt-1">
                Ref: {depositResult.reference}
              </p>
              {depositResult.message && (
                <p className="text-xs text-[#1A1A1A] dark:text-gray-200 mt-2 bg-[#F7F5F2] dark:bg-[#252830] p-3 rounded-lg border border-[#E8E5DF] dark:border-[#2D323F]">
                  {depositResult.message}
                </p>
              )}
            </div>

            {depositResult.status === 'pending' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg text-left text-xs space-y-1">
                <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Paystack Gateway Verification</span>
                </div>
                <p className="text-blue-800 dark:text-blue-300/90 text-[11px]">
                  Funds are secured and settled through Paystack channels. If you tested in sandbox mode, click &quot;Verify Payment Now&quot; to finalize instant balance update.
                </p>
              </div>
            )}

            <div className="pt-3 flex flex-wrap items-center justify-center gap-2.5">
              {depositResult.status === 'pending' && depositResult.authorizationUrl && (
                <a
                  href={depositResult.authorizationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#1A1A1A] text-xs font-bold rounded-lg flex items-center space-x-1.5 shadow-sm"
                >
                  <span>Open Paystack Checkout</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {depositResult.status === 'pending' && (
                <button
                  type="button"
                  onClick={handleManualVerify}
                  disabled={isCheckingStatus}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                  <span>Verify Payment Now</span>
                </button>
              )}
              {depositResult.status === 'success' && (
                <button
                  type="button"
                  onClick={() => {
                    setDepositResult(null);
                    setAmount('');
                  }}
                  className="px-5 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white dark:bg-white dark:text-[#0F172A] text-xs font-bold rounded-lg shadow-xs transition-all flex items-center space-x-1.5"
                >
                  <span>+ Deposit Again</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-[#F7F5F2] hover:bg-[#E8E5DF] dark:bg-[#252830] dark:hover:bg-[#2D323F] text-[#1A1A1A] dark:text-white text-xs font-bold rounded-lg shadow-xs transition-all border border-[#E8E5DF] dark:border-[#2D323F]"
              >
                {depositResult.status === 'success' ? 'Done' : 'Close'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleDeposit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
            
            {/* Method Selection Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F7F5F2] dark:bg-[#14161C] rounded-lg border border-[#E8E5DF] dark:border-[#2D323F]">
              <button
                type="button"
                onClick={() => setMethod('paystack')}
                className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-md text-xs font-bold transition-all ${
                  method === 'paystack'
                    ? 'bg-white dark:bg-[#1E2128] text-[#1A1A1A] dark:text-white shadow-xs'
                    : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Paystack (MoMo / Card)</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod('manual')}
                className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-md text-xs font-bold transition-all ${
                  method === 'manual'
                    ? 'bg-white dark:bg-[#1E2128] text-[#1A1A1A] dark:text-white shadow-xs'
                    : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A]'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Manual Ledger Entry</span>
              </button>
            </div>

            {/* Vault Summary Card */}
            <div className="p-3.5 rounded-lg bg-[#FDFCFB] dark:bg-[#181A20] border border-[#E8E5DF] dark:border-[#2D323F] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B7280] dark:text-[#9CA3AF]">Savings Vault:</span>
                <span className="font-bold text-[#1A1A1A] dark:text-white">
                  {goal.name}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E8E5DF] dark:border-[#2D323F] font-mono-num">
                <span className="text-[#6B7280] dark:text-[#9CA3AF]">Current Balance:</span>
                <span className="font-bold text-[#1A1A1A] dark:text-white">
                  {formatCurrency(goal.current, goal.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E8E5DF] dark:border-[#2D323F] font-mono-num">
                <span className="text-[#6B7280] dark:text-[#9CA3AF]">Target Goal:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(goal.target, goal.currency)}
                </span>
              </div>

              {goal.deadline && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E8E5DF] dark:border-[#2D323F] font-mono-num">
                  <span className="text-[#6B7280] dark:text-[#9CA3AF]">Target End Date:</span>
                  <span className="text-[#1A1A1A] dark:text-white font-medium">
                    {goal.deadline}
                  </span>
                </div>
              )}

              <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] pt-1 leading-relaxed">
                Tip: You can deposit funds into this vault at any time as you save. Each deposit adds directly to your saved balance.
              </p>
            </div>

            {/* Paystack Channel Logos & Info */}
            {method === 'paystack' && (
              <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 space-y-1.5">
                <div className="font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Supported Paystack Payment Rails</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="px-2 py-0.5 rounded bg-white dark:bg-[#1E2128] border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                    MTN Mobile Money
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white dark:bg-[#1E2128] border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                    Telecel Cash
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white dark:bg-[#1E2128] border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                    AirtelTigo Money
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white dark:bg-[#1E2128] border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                    Visa / Mastercard
                  </span>
                </div>
              </div>
            )}

            {/* Email Field for Paystack */}
            {method === 'paystack' && (
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mb-1 font-bold">
                  Receipt Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#FDFCFB] dark:bg-[#15181E] text-[#1A1A1A] dark:text-white px-3 py-2 rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] text-xs font-mono-num focus:outline-none focus:border-[#1A1A1A] dark:focus:border-white"
                />
              </div>
            )}

            {/* Amount Field */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mb-1 font-bold">
                Deposit Amount ({goal.currency})
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="500.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#FDFCFB] dark:bg-[#15181E] text-[#1A1A1A] dark:text-white px-3 py-2.5 rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] text-lg font-mono-num font-bold focus:outline-none focus:border-[#1A1A1A] dark:focus:border-white"
                autoFocus
              />
            </div>

            {/* Quick Amount Chips */}
            {presetAmounts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {presetAmounts.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset.toString())}
                    className="px-2.5 py-1 rounded-md bg-[#F7F5F2] hover:bg-[#E8E5DF] dark:bg-[#1E2128] dark:hover:bg-[#282C37] text-xs font-mono-num text-[#1A1A1A] dark:text-white font-bold border border-[#E8E5DF] dark:border-[#2D323F] transition-colors"
                  >
                    +{formatCurrency(preset, goal.currency)}
                  </button>
                ))}
              </div>
            )}

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
                disabled={isProcessing}
                className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-[#333333] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#1A1A1A] rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>
                  {method === 'paystack'
                    ? 'Pay via Paystack'
                    : 'Record Manual Deposit'}
                </span>
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};
