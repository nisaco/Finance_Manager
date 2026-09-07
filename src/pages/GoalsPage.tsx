import React, { useState } from 'react';
import {
  PiggyBank,
  Plus,
  Send,
  ShieldCheck,
  Calendar,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  History,
  RefreshCw,
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { Goal, FundTransfer } from '../types';
import { formatCurrency, formatDate } from '../design/tokens';
import { api } from '../api/client';

interface GoalsPageProps {
  onOpenNewGoal: () => void;
  onEditGoal: (goal: Goal) => void;
  onFundGoal: (goal: Goal) => void;
}

export const GoalsPage: React.FC<GoalsPageProps> = ({
  onOpenNewGoal,
  onEditGoal,
  onFundGoal,
}) => {
  const { activeProfile, goals, refreshData, notify } = useLedger();
  const [selectedGoalForTransfers, setSelectedGoalForTransfers] = useState<Goal | null>(null);
  const [transfers, setTransfers] = useState<FundTransfer[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);

  const currency = activeProfile?.displayCurrency || 'GHS';

  const handleDelete = async (id: string) => {
    if (confirm('Delete this savings vault? Past recorded transactions will remain in your ledger.')) {
      try {
        await api.deleteGoal(id);
        notify('Savings vault deleted');
        await refreshData();
      } catch (err: any) {
        notify(err.message || 'Delete failed', 'error');
      }
    }
  };

  const handleViewTransfers = async (goal: Goal) => {
    setSelectedGoalForTransfers(goal);
    setLoadingTransfers(true);
    try {
      const data = await api.getGoalTransfers(goal.id);
      setTransfers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTransfers(false);
    }
  };

  const handleVerifySingleTransfer = async (reference: string) => {
    try {
      const updated = await api.verifyTransfer(reference);
      notify(`Transfer verified: ${updated.status}`);
      if (selectedGoalForTransfers) {
        handleViewTransfers(selectedGoalForTransfers);
      }
      await refreshData();
    } catch (err: any) {
      notify(err.message || 'Verification check failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <PiggyBank className="w-5 h-5 text-[#1A1A1A]" />
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#1A1A1A]">
              Savings Vaults & Real Money Goals
            </h1>
          </div>
          <p className="text-xs text-[#6B7280] font-mono-num mt-0.5">
            {activeProfile?.name} • Target savings and automated reserve tracking
          </p>
        </div>

        <button
          onClick={onOpenNewGoal}
          className="px-3.5 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center space-x-1.5 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Savings Vault</span>
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {goals.length === 0 ? (
          <div className="col-span-full bg-white border border-[#E8E5DF] rounded-xl p-8 sm:p-12 text-center text-[#6B7280] space-y-2 shadow-sm">
            <PiggyBank className="w-8 h-8 text-[#D5D0C7] mx-auto" />
            <p className="text-sm font-medium">No savings goals established yet.</p>
            <button
              onClick={onOpenNewGoal}
              className="mt-2 text-xs text-[#1A1A1A] hover:underline font-bold inline-block"
            >
              Create Your First Savings Goal
            </button>
          </div>
        ) : (
          goals.map((g) => {
            const pct = Math.min(100, Math.round((g.current / g.target) * 100));
            const isPaystack = g.paystackDestination?.type === 'paystack_recipient';
            const remaining = Math.max(0, g.target - g.current);

            return (
              <div
                key={g.id}
                className="bg-white border border-[#E8E5DF] rounded-xl p-4 sm:p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-base font-bold text-[#1A1A1A] truncate">
                        {g.name}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        {isPaystack ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono-num bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/20 font-semibold truncate max-w-full">
                            <ShieldCheck className="w-3 h-3 mr-1 shrink-0" />
                            <span className="truncate">Paystack • {g.paystackDestination.bankName} (•••• {g.paystackDestination.accountLast4})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono-num bg-[#F7F5F2] text-[#6B7280] border border-[#E8E5DF] font-medium">
                            Manual Ledger Goal
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => onEditGoal(g)}
                        className="p-1.5 sm:p-1 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F7F5F2] rounded transition-colors"
                        title="Edit Goal"
                        aria-label="Edit goal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(g.id)}
                        className="p-1.5 sm:p-1 text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded transition-colors"
                        title="Delete Goal"
                        aria-label="Delete goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Balance & Target Figures */}
                  <div className="mt-4 p-3 bg-[#FDFCFB] rounded-lg border border-[#E8E5DF] space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-[#6B7280]">Current Saved:</span>
                      <span className="text-base sm:text-lg font-mono-num font-bold text-[#1A1A1A]">
                        {formatCurrency(g.current, g.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-mono-num text-[#6B7280] pt-1 border-t border-[#E8E5DF]">
                      <span>Target: {formatCurrency(g.target, g.currency)}</span>
                      <span className="text-[#15803D] font-semibold">
                        Remaining: {formatCurrency(remaining, g.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 mt-3">
                    <div className="w-full bg-[#F7F5F2] rounded-full h-2.5 overflow-hidden border border-[#E8E5DF]">
                      <div
                        className="bg-[#15803D] h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-mono-num text-[#6B7280]">
                      <span className="font-semibold">{pct}% funded</span>
                      {g.deadline && (
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-[#6B7280]" />
                          <span>Due {formatDate(g.deadline)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Row */}
                <div className="pt-3 border-t border-[#E8E5DF] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <button
                    onClick={() => handleViewTransfers(g)}
                    className="text-xs text-[#6B7280] hover:text-[#1A1A1A] flex items-center justify-center sm:justify-start space-x-1 font-semibold transition-colors py-1 sm:py-0"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View Transfer History</span>
                  </button>

                  <button
                    onClick={() => onFundGoal(g)}
                    className="px-3.5 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] rounded text-xs font-bold shadow-sm transition-all flex items-center justify-center space-x-1.5 active:scale-95 w-full sm:w-auto"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isPaystack ? 'Transfer via Paystack' : 'Add Funds'}</span>
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Goal Transfer History Drawer / Modal */}
      {selectedGoalForTransfers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E8E5DF] rounded-xl w-full max-w-lg shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-[#E8E5DF] pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-[#1A1A1A]">
                  Transfer History: {selectedGoalForTransfers.name}
                </h3>
                <span className="text-xs text-[#6B7280] font-mono-num">
                  Electronic deposit and transfer history
                </span>
              </div>
              <button
                onClick={() => setSelectedGoalForTransfers(null)}
                className="text-xs font-semibold text-[#6B7280] hover:text-[#1A1A1A] px-2 py-1 hover:bg-[#F7F5F2] rounded"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5">
              {loadingTransfers ? (
                <div className="py-8 text-center text-xs text-[#6B7280]">
                  Loading transfer history...
                </div>
              ) : transfers.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#6B7280]">
                  No deposits or transfers recorded yet for this vault.
                </div>
              ) : (
                transfers.map((txf) => (
                  <div
                    key={txf.id}
                    className="p-3 bg-[#FDFCFB] rounded-lg border border-[#E8E5DF] space-y-1.5 text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono-num font-bold text-[#1A1A1A]">
                        +{formatCurrency(txf.amount, txf.currency)}
                      </span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono-num font-bold ${
                          txf.status === 'success'
                            ? 'bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/20'
                            : txf.status === 'pending'
                            ? 'bg-[#EA580C]/10 text-[#EA580C] border border-[#EA580C]/20'
                            : 'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20'
                        }`}
                      >
                        {txf.status === 'success' ? (
                          <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                        ) : txf.status === 'pending' ? (
                          <Clock className="w-2.5 h-2.5 mr-1" />
                        ) : (
                          <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                        )}
                        {txf.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono-num text-[#6B7280]">
                      <span className="truncate max-w-[200px]">Ref: {txf.paystackReference}</span>
                      <span>{new Date(txf.createdAt).toLocaleString()}</span>
                    </div>
                    {txf.gatewayResponse && (
                      <p className="text-[10px] text-[#6B7280] italic pt-0.5">
                        {txf.gatewayResponse}
                      </p>
                    )}
                    {txf.status === 'pending' && (
                      <div className="pt-1 text-right">
                        <button
                          onClick={() => handleVerifySingleTransfer(txf.paystackReference)}
                          className="text-[10px] text-[#1A1A1A] hover:underline font-bold"
                        >
                          Verify Transfer Status
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
