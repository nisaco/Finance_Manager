import React, { useState } from 'react';
import {
  X,
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  CreditCard,
  Smartphone,
  ExternalLink,
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
        const returnCallbackUrl = `${window.location.origin}${window.location.pathname}?paystack_deposit_ref=${goal.id}`;

        const init = await api.initializeDeposit({
          amount: numAmount,
          currency: goal.currency,
          goalId: goal.id,
          profileId: goal.profileId,
          email: email || user?.email || 'saver@ledgerapp.io',
          callbackUrl: returnCallbackUrl,
        });

        if (init.authorizationUrl && !init.simulated) {
          try {
            sessionStorage.setItem('pending_paystack_deposit', JSON.stringify({
              reference: init.reference,
              goalId: goal.id,
              goalName: goal.name,
              amount: numAmount,
              currency: goal.currency,
              timestamp: Date.now(),
            }));
          } catch (e) {
            console.warn('Could not cache pending deposit session:', e);
          }

          notify('Redirecting to Paystack secure checkout...', 'info');
          setTimeout(() => {
            window.location.href = init.authorizationUrl;
          }, 400);
          return;
        }

        setDepositResult({
          reference: init.reference,
          authorizationUrl: init.authorizationUrl,
          simulated: init.simulated,
          status: 'pending',
          message: init.simulated
            ? 'Deposit initialized via Sandbox rail. Click below to verify and confirm instant settlement.'
            : 'Paystack authorization token generated. Complete checkout or verify payment settlement.',
        });
      } else {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/60 backdrop-blur-xs">
      <div className="lg-card w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-display text-base sm:text-lg font-bold text-ink">
                Deposit to Savings Vault
              </h2>
              {goal.deadline && (
                <span className="lg-pill lg-pill-accent text-[10px]">
                  <Calendar className="w-2.5 h-2.5 mr-1" />
                  Target: {goal.deadline}
                </span>
              )}
            </div>
            <p className="text-xs text-ink-muted font-mono-num num mt-0.5">
              {goal.name} • {formatCurrency(goal.current, goal.currency)} of {formatCurrency(goal.target, goal.currency)}
            </p>
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

        {/* Transfer Confirmation & In-Flight State */}
        {depositResult ? (
          <div className="p-6 space-y-4 text-center overflow-y-auto flex-1">
            {depositResult.status === 'success' ? (
              <div className="w-14 h-14 rounded-full bg-pos/15 border border-pos/30 text-pos flex items-center justify-center mx-auto animate-in zoom-in">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            ) : depositResult.status === 'pending' ? (
              <div className="w-14 h-14 rounded-full bg-accent/15 border border-accent/30 text-accent flex items-center justify-center mx-auto">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-neg/15 border border-neg/30 text-neg flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
            )}

            <div>
              <h3 className="font-display text-base font-bold text-ink">
                {depositResult.status === 'success'
                  ? 'Deposit Successfully Credited!'
                  : depositResult.status === 'pending'
                  ? 'Settlement In Progress'
                  : 'Deposit Settlement Failed'}
              </h3>
              <p className="text-xs text-ink-muted font-mono-num num mt-1">
                Ref: {depositResult.reference}
              </p>
              {depositResult.message && (
                <p className="text-xs text-ink mt-2 bg-sunken p-3 rounded-xl border border-line">
                  {depositResult.message}
                </p>
              )}
            </div>

            {depositResult.status === 'pending' && (
              <div className="p-3.5 bg-accent/10 border border-accent/20 rounded-xl text-left text-xs space-y-1">
                <div className="font-bold text-ink flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  <span>Gateway Verification</span>
                </div>
                <p className="text-ink-muted text-[11px] leading-relaxed">
                  Funds are secured and settled through payment rails. Click &quot;Verify Payment Now&quot; to finalize instant balance update.
                </p>
              </div>
            )}

            <div className="pt-3 flex flex-wrap items-center justify-center gap-2.5">
              {depositResult.status === 'pending' && depositResult.authorizationUrl && (
                <a
                  href={depositResult.authorizationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lg-btn-solid text-xs flex items-center space-x-1.5"
                >
                  <span>Open Checkout</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {depositResult.status === 'pending' && (
                <button
                  type="button"
                  onClick={handleManualVerify}
                  disabled={isCheckingStatus}
                  className="lg-btn-solid text-xs flex items-center space-x-1.5 bg-pos hover:bg-pos/90 text-white"
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
                  className="lg-btn-solid text-xs"
                >
                  <span>+ Deposit Again</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="lg-btn-quiet text-xs"
              >
                {depositResult.status === 'success' ? 'Done' : 'Close'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleDeposit} className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* Method Selection Tabs */}
            <div className="lg-seg">
              <button
                type="button"
                onClick={() => setMethod('paystack')}
                className={`lg-seg-btn flex items-center justify-center space-x-1.5 ${
                  method === 'paystack' ? 'active' : ''
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-accent" />
                <span>Paystack (MoMo / Card)</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod('manual')}
                className={`lg-seg-btn flex items-center justify-center space-x-1.5 ${
                  method === 'manual' ? 'active' : ''
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Manual Ledger Entry</span>
              </button>
            </div>

            {/* Vault Summary Card */}
            <div className="p-4 rounded-xl bg-sunken border border-line space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-muted">Savings Vault:</span>
                <span className="font-bold text-ink">
                  {goal.name}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-line font-mono-num num">
                <span className="text-ink-muted">Current Balance:</span>
                <span className="font-bold text-ink">
                  {formatCurrency(goal.current, goal.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-line font-mono-num num">
                <span className="text-ink-muted">Target Goal:</span>
                <span className="font-bold text-pos">
                  {formatCurrency(goal.target, goal.currency)}
                </span>
              </div>

              {goal.deadline && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-line font-mono-num num">
                  <span className="text-ink-muted">Target Maturity Date:</span>
                  <span className="text-ink font-medium">
                    {goal.deadline}
                  </span>
                </div>
              )}
            </div>

            {/* Paystack Rails Info */}
            {method === 'paystack' && (
              <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/20 text-xs text-ink space-y-1.5">
                <div className="font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>Supported Payment Rails</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="lg-pill lg-pill-dim text-[10px]">
                    MTN Mobile Money
                  </span>
                  <span className="lg-pill lg-pill-dim text-[10px]">
                    Telecel Cash
                  </span>
                  <span className="lg-pill lg-pill-dim text-[10px]">
                    AirtelTigo Money
                  </span>
                  <span className="lg-pill lg-pill-dim text-[10px]">
                    Visa / Mastercard
                  </span>
                </div>
              </div>
            )}

            {/* Email Field for Paystack */}
            {method === 'paystack' && (
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
                  Receipt Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full lg-input text-xs font-mono-num"
                />
              </div>
            )}

            {/* Amount Field */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
                Deposit Amount ({goal.currency})
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="500.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full lg-input text-lg font-mono-num num font-bold"
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
                    className="px-2.5 py-1 rounded-lg bg-sunken hover:border-ink/30 text-xs font-mono-num num text-ink font-bold border border-line transition-colors"
                  >
                    +{formatCurrency(preset, goal.currency)}
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={onClose}
                className="lg-btn-quiet text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="lg-btn-solid text-xs flex items-center space-x-1.5"
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
