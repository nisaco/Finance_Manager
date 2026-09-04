import React, { useState } from 'react';
import { X, Send, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Loader2, ArrowUpRight } from 'lucide-react';
import { Goal, FundTransfer } from '../../types';
import { useLedger } from '../../context/LedgerContext';
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

  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transferResult, setTransferResult] = useState<{
    reference?: string;
    simulated?: boolean;
    status: 'pending' | 'success' | 'failed';
    message?: string;
  } | null>(null);

  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  if (!isOpen || !goal) return null;

  const isPaystackLinked = goal.paystackDestination?.type === 'paystack_recipient';
  const remaining = Math.max(0, goal.target - goal.current);

  const presetAmounts = [500, 1000, 2500, 5000].filter((amt) => amt <= goal.target);

  const handleFund = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      notify('Please enter a valid contribution amount', 'error');
      return;
    }

    setIsProcessing(true);
    setTransferResult(null);

    try {
      const res = await api.fundGoal(goal.id, numAmount, goal.currency);
      
      if (res.mode === 'manual') {
        notify(res.message);
        await refreshData();
        onClose();
      } else {
        // Paystack Transfer
        setTransferResult({
          reference: res.reference,
          simulated: res.simulated,
          status: 'pending',
          message: res.message,
        });

        // Automatically verify/settle status after a short delay for smooth UX
        setTimeout(async () => {
          if (res.reference) {
            try {
              const verified = await api.verifyTransfer(res.reference);
              setTransferResult({
                reference: res.reference,
                simulated: res.simulated,
                status: verified.status,
                message: `Transfer verified: ${verified.gatewayResponse || 'Funds confirmed'}`,
              });
              await refreshData();
            } catch (err) {
              console.warn('Auto verification poll pending');
            }
          }
        }, 1800);
      }
    } catch (err: any) {
      notify(err.message || 'Transfer initiation failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualVerify = async () => {
    if (!transferResult?.reference) return;
    setIsCheckingStatus(true);
    try {
      const res = await api.verifyTransfer(transferResult.reference);
      setTransferResult({
        ...transferResult,
        status: res.status,
        message: res.gatewayResponse || 'Status updated from Paystack rail',
      });
      if (res.status === 'success') {
        notify('Paystack transfer confirmed and goal balance credited!');
        await refreshData();
      }
    } catch (err: any) {
      notify(err.message || 'Status check failed', 'error');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A1A1A]/40 backdrop-blur-xs">
      <div className="bg-white border border-[#E8E5DF] rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#E8E5DF] shrink-0">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-[#1A1A1A]">
              Add Funds to Vault
            </h2>
            <p className="text-xs text-[#6B7280] font-mono-num mt-0.5">
              {goal.name} ({formatCurrency(goal.current, goal.currency)} / {formatCurrency(goal.target, goal.currency)})
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-1 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F7F5F2] rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transfer Confirmation & In-Flight State */}
        {transferResult ? (
          <div className="p-4 sm:p-6 space-y-4 text-center overflow-y-auto flex-1">
            {transferResult.status === 'success' ? (
              <div className="w-12 h-12 rounded-full bg-[#15803D]/15 border border-[#15803D]/40 text-[#15803D] flex items-center justify-center mx-auto animate-in zoom-in">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            ) : transferResult.status === 'pending' ? (
              <div className="w-12 h-12 rounded-full bg-[#1A1A1A]/10 border border-[#1A1A1A]/20 text-[#1A1A1A] flex items-center justify-center mx-auto">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#DC2626]/15 border border-[#DC2626]/40 text-[#DC2626] flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
            )}

            <div>
              <h3 className="font-display text-base font-bold text-[#1A1A1A]">
                {transferResult.status === 'success'
                  ? 'Transfer Successfully Settled'
                  : transferResult.status === 'pending'
                  ? 'Paystack Transfer in Flight'
                  : 'Transfer Could Not Be Completed'}
              </h3>
              <p className="text-xs text-[#6B7280] font-mono-num mt-1">
                Ref: {transferResult.reference}
              </p>
              {transferResult.message && (
                <p className="text-xs text-[#1A1A1A] mt-2 bg-[#F7F5F2] p-2.5 rounded border border-[#E8E5DF]">
                  {transferResult.message}
                </p>
              )}
            </div>

            <div className="pt-3 flex items-center justify-center space-x-3">
              {transferResult.status === 'pending' && (
                <button
                  type="button"
                  onClick={handleManualVerify}
                  disabled={isCheckingStatus}
                  className="px-3 py-2 bg-[#F7F5F2] hover:bg-[#E8E5DF] text-[#1A1A1A] text-xs font-bold rounded border border-[#E8E5DF] flex items-center space-x-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                  <span>Verify Status</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] text-xs font-bold rounded shadow-sm transition-all"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleFund} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
            
            {/* Vault Destination Info Card */}
            <div className="p-3.5 rounded-lg bg-[#FDFCFB] border border-[#E8E5DF] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B7280]">Destination Rail:</span>
                <span className="font-bold text-[#1A1A1A]">
                  {isPaystackLinked
                    ? goal.paystackDestination.bankName || 'Paystack Bank / MoMo Vault'
                    : 'Manual Goal Ledger'}
                </span>
              </div>
              {isPaystackLinked && (
                <div className="flex items-center justify-between text-xs font-mono-num">
                  <span className="text-[#6B7280]">Recipient Account:</span>
                  <span className="text-[#1A1A1A] font-bold">
                    •••• {goal.paystackDestination.accountLast4 || 'XXXX'} ({goal.paystackDestination.accountName})
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E8E5DF] font-mono-num">
                <span className="text-[#6B7280]">Remaining to Target:</span>
                <span className="text-[#15803D] font-bold">
                  {formatCurrency(remaining, goal.currency)}
                </span>
              </div>
            </div>

            {/* Amount Field */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                Deposit Amount ({goal.currency})
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="1000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2.5 rounded-lg border border-[#E8E5DF] text-lg font-mono-num font-bold focus:outline-none focus:border-[#1A1A1A]"
                autoFocus
              />
            </div>

            {/* Quick Amount Chips */}
            {presetAmounts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {presetAmounts.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset.toString())}
                    className="px-2.5 py-1 rounded bg-[#F7F5F2] hover:bg-[#E8E5DF] text-xs font-mono-num text-[#1A1A1A] font-bold border border-[#E8E5DF] transition-colors"
                  >
                    +{formatCurrency(preset, goal.currency)}
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E8E5DF]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md text-xs font-bold text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F7F5F2]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] rounded-md text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{isPaystackLinked ? 'Transfer Real Money via Paystack' : 'Credit Goal Balance'}</span>
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};
