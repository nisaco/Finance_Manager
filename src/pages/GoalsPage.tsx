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
  ArrowDownLeft,
  Lock,
  Wallet,
  X,
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { Goal, FundTransfer, WithdrawalRequest } from '../types';
import { formatCurrency, formatDate } from '../design/tokens';
import { api } from '../api/client';
import { VaultWithdrawalModal } from '../components/Modals/VaultWithdrawalModal';
import { TermsModal } from '../components/TermsModal';

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
  const [selectedGoalForWithdrawal, setSelectedGoalForWithdrawal] = useState<Goal | null>(null);
  const [showWithdrawalsList, setShowWithdrawalsList] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [myWithdrawals, setMyWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [transfers, setTransfers] = useState<FundTransfer[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'active' | 'matured' | 'pending'>('all');

  const currency = activeProfile?.displayCurrency || 'GHS';

  // Portfolio calculations
  const totalSaved = goals.reduce((acc, g) => acc + (g.current || 0), 0);
  const totalTarget = goals.reduce((acc, g) => acc + (g.target || 0), 0);
  const availableToWithdraw = goals
    .filter((g) => g.status !== 'pending_withdrawal')
    .reduce((acc, g) => acc + (g.current || 0), 0);
  const fundedGoals = goals.filter(
    (g) => (g.current || 0) > 0 && g.status !== 'pending_withdrawal'
  );

  const isGoalMatured = (g: Goal): boolean => {
    if (!g.deadline) return false;
    const diffMs = new Date(g.deadline).getTime() - Date.now();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) <= 0;
  };

  const getDaysRemaining = (g: Goal): number | null => {
    if (!g.deadline) return null;
    const diffMs = new Date(g.deadline).getTime() - Date.now();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const maturedCount = goals.filter(isGoalMatured).length;
  const pendingCount = goals.filter((g) => g.status === 'pending_withdrawal').length;

  const filteredGoals = goals.filter((g) => {
    if (filterType === 'matured') return isGoalMatured(g);
    if (filterType === 'pending') return g.status === 'pending_withdrawal';
    if (filterType === 'active') return (g.current || 0) > 0 && g.status !== 'pending_withdrawal';
    return true;
  });

  const handlePrimaryWithdraw = () => {
    if (fundedGoals.length === 0) {
      notify('You have no available vault funds to withdraw. Deposit money first to use the withdrawal feature.', 'info');
      return;
    }
    // Open withdrawal modal for the first funded goal
    setSelectedGoalForWithdrawal(fundedGoals[0]);
  };

  const handleOpenWithdrawalsHistory = async () => {
    setShowWithdrawalsList(true);
    setLoadingWithdrawals(true);
    try {
      const data = await api.getWithdrawals();
      setMyWithdrawals(data);
    } catch (err) {
      console.error('Failed to load withdrawals:', err);
    } finally {
      setLoadingWithdrawals(false);
    }
  };

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
      notify(`Transfer status: ${updated.status}`);
      if (selectedGoalForTransfers) {
        handleViewTransfers(selectedGoalForTransfers);
      }
      await refreshData();
    } catch (err: any) {
      notify(err.message || 'Verification check failed', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="t-title text-ink font-bold">Savings Vaults &amp; Goals</h1>
          </div>
          <p className="t-meta text-ink-3 mt-1">
            {activeProfile?.name ? `${activeProfile.name} · ` : ''}
            Deposit anytime · Set a maturity date for 2% payout or withdraw early with standard penalty
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrimaryWithdraw}
            className="lg-btn lg-btn-quiet text-xs text-pos font-semibold"
            title="Initiate a withdrawal payout from your savings vaults"
          >
            <ArrowDownLeft className="w-4 h-4 text-pos" strokeWidth={1.7} />
            <span>Withdraw Funds</span>
          </button>

          <button
            type="button"
            onClick={handleOpenWithdrawalsHistory}
            className="lg-btn lg-btn-quiet text-xs"
            title="View status of all pending and approved payouts"
          >
            <Clock className="w-4 h-4 text-warn" strokeWidth={1.7} />
            <span>Payout History</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTermsOpen(true)}
            className="lg-btn lg-btn-ghost text-xs text-ink-3"
            title="View standard fee and early withdrawal penalty policy"
          >
            <span>Custody Policy</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewGoal}
            className="lg-btn lg-btn-solid text-xs"
          >
            <Plus className="w-4 h-4" strokeWidth={1.7} />
            <span>New Savings Vault</span>
          </button>
        </div>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="lg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-ink-3 text-xs">
            <span>Total Vault Reserves</span>
            <Wallet className="w-4 h-4 text-pos" strokeWidth={1.7} />
          </div>
          <div className="text-lg sm:text-xl num font-bold text-ink">
            {formatCurrency(totalSaved, currency)}
          </div>
          <div className="text-xs text-ink-3 num">
            Target: {formatCurrency(totalTarget, currency)}
          </div>
        </div>

        <div className="lg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-ink-3 text-xs">
            <span>Available to Withdraw</span>
            <ArrowDownLeft className="w-4 h-4 text-pos" strokeWidth={1.7} />
          </div>
          <div className="text-lg sm:text-xl num font-bold text-pos">
            {formatCurrency(availableToWithdraw, currency)}
          </div>
          <div className="text-xs text-ink-3">
            {fundedGoals.length} {fundedGoals.length === 1 ? 'vault' : 'vaults'} with balance
          </div>
        </div>

        <div className="lg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-ink-3 text-xs">
            <span>Disbursement Fee</span>
            <ShieldCheck className="w-4 h-4 text-accent" strokeWidth={1.7} />
          </div>
          <div className="text-lg sm:text-xl num font-bold text-ink">
            2% Standard
          </div>
          <div className="text-xs text-ink-3">
            On or after maturity date
          </div>
        </div>

        <div className="lg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-ink-3 text-xs">
            <span>Early Withdrawal</span>
            <Lock className="w-4 h-4 text-warn" strokeWidth={1.7} />
          </div>
          <div className="text-lg sm:text-xl num font-bold text-warn">
            10% Penalty
          </div>
          <div className="text-xs text-ink-3">
            If withdrawn before date
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <div className="lg-seg">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`lg-seg-btn ${filterType === 'all' ? 'active' : ''}`}
          >
            All Vaults ({goals.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('active')}
            className={`lg-seg-btn ${filterType === 'active' ? 'active' : ''}`}
          >
            Active Funds ({fundedGoals.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('matured')}
            className={`lg-seg-btn ${filterType === 'matured' ? 'active' : ''}`}
          >
            Ready for Maturity ({maturedCount})
          </button>
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('pending')}
              className={`lg-seg-btn ${filterType === 'pending' ? 'active' : ''}`}
            >
              Pending Review ({pendingCount})
            </button>
          )}
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {filteredGoals.length === 0 ? (
          <div className="col-span-full lg-card p-8 sm:p-12 text-center text-ink-3 space-y-3">
            <PiggyBank className="w-10 h-10 text-ink-4 mx-auto" strokeWidth={1.7} />
            <div className="space-y-1">
              <p className="t-card text-ink font-semibold">No savings vaults found</p>
              <p className="text-xs text-ink-3">Create a dedicated savings vault to start saving toward your target.</p>
            </div>
            <button
              type="button"
              onClick={onOpenNewGoal}
              className="lg-btn lg-btn-solid text-xs mx-auto"
            >
              <Plus className="w-4 h-4 mr-1" strokeWidth={1.7} />
              <span>Create a Savings Vault</span>
            </button>
          </div>
        ) : (
          filteredGoals.map((g) => {
            const pct = Math.min(100, Math.round(((g.current || 0) / (g.target || 1)) * 100));
            const isPaystack = g.paystackDestination?.type === 'paystack_recipient';
            const remaining = Math.max(0, (g.target || 0) - (g.current || 0));

            const isMatured = isGoalMatured(g);
            const daysRemaining = getDaysRemaining(g);

            return (
              <div
                key={g.id}
                className="lg-card lg-card-interactive p-4 sm:p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="t-card font-bold text-ink truncate">
                          {g.name}
                        </h3>
                        <span className="lg-tag shrink-0">
                          Vault
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {/* Target Date Pill */}
                        {g.deadline ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs num font-semibold ${
                              isMatured
                                ? 'bg-pos-soft text-pos border border-line'
                                : 'bg-warn-soft text-warn border border-line'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5 mr-1" strokeWidth={1.7} />
                            {isMatured
                              ? 'Maturity Reached (2% fee)'
                              : `Matures: ${formatDate(g.deadline)} (${daysRemaining !== null ? `${daysRemaining}d left` : ''})`}
                          </span>
                        ) : (
                          <span className="lg-tag">
                            Flexible Date · 2% Payout Fee
                          </span>
                        )}

                        {g.status === 'pending_withdrawal' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs num font-semibold bg-warn-soft text-warn border border-line">
                            <Clock className="w-3.5 h-3.5 mr-1" strokeWidth={1.7} />
                            Payout Review In Progress
                          </span>
                        ) : null}

                        {isPaystack ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs num font-semibold bg-accent-soft text-accent border border-line truncate max-w-full">
                            <ShieldCheck className="w-3.5 h-3.5 mr-1 shrink-0" strokeWidth={1.7} />
                            <span className="truncate">Paystack · {g.paystackDestination.bankName} (•••• {g.paystackDestination.accountLast4})</span>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditGoal(g)}
                        className="lg-iconbtn"
                        title="Edit Goal"
                        aria-label="Edit goal"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-ink-3 hover:text-ink" strokeWidth={1.7} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(g.id)}
                        className="lg-iconbtn"
                        title="Delete Goal"
                        aria-label="Delete goal"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-ink-3 hover:text-neg" strokeWidth={1.7} />
                      </button>
                    </div>
                  </div>

                  {/* Financial Figures — No progress bars, explicit text figures */}
                  <div className="mt-4 p-3.5 bg-sunken rounded-xl border border-line space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-ink-3 font-medium">Current Balance</span>
                      <span className="text-lg num font-bold text-ink">
                        {formatCurrency(g.current, g.currency)}
                      </span>
                    </div>
                    <div className="flex flex-wrap justify-between items-center text-xs num text-ink-3 pt-2 border-t border-line gap-2">
                      <span>Target: <strong className="text-ink font-semibold">{formatCurrency(g.target, g.currency)}</strong></span>
                      <span className="text-pos font-semibold">{pct}% funded</span>
                      <span>Remaining: <strong className="text-ink font-semibold">{formatCurrency(remaining, g.currency)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Row */}
                <div className="pt-3 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleViewTransfers(g)}
                    className="text-xs text-ink-3 hover:text-ink flex items-center justify-center sm:justify-start gap-1 font-semibold transition-colors py-1 min-h-[36px]"
                  >
                    <History className="w-3.5 h-3.5 text-ink-3" strokeWidth={1.7} />
                    <span>Deposits &amp; Log</span>
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        if ((g.current || 0) <= 0) {
                          notify('This vault has 0 balance to withdraw. Make a deposit first.', 'info');
                        } else {
                          setSelectedGoalForWithdrawal(g);
                        }
                      }}
                      disabled={g.status === 'pending_withdrawal'}
                      className="lg-btn lg-btn-quiet text-xs flex-1 sm:flex-initial"
                      title={
                        g.status === 'pending_withdrawal'
                          ? 'Payout request is currently under review'
                          : (g.current || 0) > 0
                          ? 'Withdraw available funds from this vault'
                          : 'Deposit funds to unlock withdrawal'
                      }
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" strokeWidth={1.7} />
                      <span>{g.status === 'pending_withdrawal' ? 'Payout Pending' : 'Withdraw'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onFundGoal(g)}
                      disabled={g.status === 'pending_withdrawal'}
                      className="lg-btn lg-btn-solid text-xs flex-1 sm:flex-initial disabled:opacity-40"
                      title="Deposit money into this savings vault"
                    >
                      <Send className="w-3.5 h-3.5" strokeWidth={1.7} />
                      <span>Deposit</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Goal Transfer History Modal */}
      {selectedGoalForTransfers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="lg-card w-full max-w-lg p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col shadow-lg">
            <div className="flex justify-between items-center border-b border-line pb-3">
              <div>
                <h3 className="t-card font-bold text-ink">
                  Deposit History: {selectedGoalForTransfers.name}
                </h3>
                <span className="text-xs text-ink-3 num">
                  Paystack deposits and settlements log
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGoalForTransfers(null)}
                className="lg-iconbtn"
                aria-label="Close deposit history"
              >
                <X className="w-4 h-4 text-ink-3" strokeWidth={1.7} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
              {loadingTransfers ? (
                <div className="py-8 text-center text-xs text-ink-3">
                  Loading transfer history...
                </div>
              ) : transfers.length === 0 ? (
                <div className="py-8 text-center text-xs text-ink-3">
                  No deposits recorded yet for this vault.
                </div>
              ) : (
                transfers.map((txf) => (
                  <div
                    key={txf.id}
                    className="p-3 bg-sunken rounded-xl border border-line space-y-1.5 text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="num font-bold text-ink">
                        +{formatCurrency(txf.amount, txf.currency)}
                      </span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs num font-semibold ${
                          txf.status === 'success'
                            ? 'bg-pos-soft text-pos border border-line'
                            : txf.status === 'pending'
                            ? 'bg-warn-soft text-warn border border-line'
                            : 'bg-neg-soft text-neg border border-line'
                        }`}
                      >
                        {txf.status === 'success' ? (
                          <CheckCircle2 className="w-3 h-3 mr-1" strokeWidth={1.7} />
                        ) : txf.status === 'pending' ? (
                          <Clock className="w-3 h-3 mr-1" strokeWidth={1.7} />
                        ) : (
                          <AlertTriangle className="w-3 h-3 mr-1" strokeWidth={1.7} />
                        )}
                        {txf.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs num text-ink-3">
                      <span className="truncate max-w-[200px]">Ref: {txf.paystackReference}</span>
                      <span>{new Date(txf.createdAt).toLocaleString()}</span>
                    </div>
                    {txf.gatewayResponse && (
                      <p className="text-xs text-ink-3 italic pt-0.5">
                        {txf.gatewayResponse}
                      </p>
                    )}
                    {txf.status === 'pending' && (
                      <div className="pt-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleVerifySingleTransfer(txf.paystackReference)}
                          className="text-xs text-pos hover:underline font-semibold"
                        >
                          Verify Payment Status
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

      {/* Vault Withdrawal Request Modal */}
      {selectedGoalForWithdrawal && (
        <VaultWithdrawalModal
          isOpen={!!selectedGoalForWithdrawal}
          goal={selectedGoalForWithdrawal}
          onClose={() => setSelectedGoalForWithdrawal(null)}
          onSuccess={async () => {
            await refreshData();
            notify('Withdrawal request submitted for Admin review and payout disbursement', 'success');
          }}
        />
      )}

      {/* User's Withdrawal Requests History Modal */}
      {showWithdrawalsList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="lg-card w-full max-w-xl p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col shadow-lg">
            <div className="flex justify-between items-center border-b border-line pb-3">
              <div>
                <h3 className="t-card font-bold text-ink flex items-center gap-2">
                  <Clock className="w-4 h-4 text-warn" strokeWidth={1.7} />
                  <span>My Vault Payout Requests</span>
                </h3>
                <p className="text-xs text-ink-3 mt-0.5">
                  Track your submitted withdrawal requests, fees, and approval status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWithdrawalsList(false)}
                className="lg-iconbtn"
                aria-label="Close payout requests"
              >
                <X className="w-4 h-4 text-ink-3" strokeWidth={1.7} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {loadingWithdrawals ? (
                <div className="py-8 text-center text-xs text-ink-3">
                  Loading withdrawal records...
                </div>
              ) : myWithdrawals.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <PiggyBank className="w-10 h-10 text-ink-4 mx-auto" strokeWidth={1.7} />
                  <p className="text-sm font-semibold text-ink">
                    No withdrawal requests submitted yet.
                  </p>
                  <p className="text-xs text-ink-3">
                    When your savings vault matures or you request a payout, requests appear here.
                  </p>
                </div>
              ) : (
                myWithdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="p-3.5 bg-sunken rounded-xl border border-line space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-ink text-sm">
                          {w.goalName}
                        </span>
                        <div className="text-xs text-ink-3 num mt-0.5">
                          Requested: {new Date(w.createdAt).toLocaleDateString()} at {new Date(w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs num font-semibold ${
                          w.status === 'approved'
                            ? 'bg-pos-soft text-pos'
                            : w.status === 'rejected'
                            ? 'bg-neg-soft text-neg'
                            : 'bg-warn-soft text-warn'
                        }`}
                      >
                        {w.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line num text-xs">
                      <div>
                        <span className="text-ink-3 block">Requested:</span>
                        <span className="font-semibold text-ink">
                          {formatCurrency(w.requestedAmount || w.vaultAmount, w.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-3 block">Fees ({w.isEarlyWithdrawal ? '12%' : '2%'}):</span>
                        <span className="font-semibold text-neg">
                          -{formatCurrency(w.feeAmount, w.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-3 block">Net Payout:</span>
                        <span className="font-bold text-pos">
                          {formatCurrency(w.netPayoutAmount, w.currency)}
                        </span>
                      </div>
                    </div>

                    {w.remainingVaultBalance !== undefined && w.remainingVaultBalance > 0 && (
                      <div className="text-xs text-ink-3 num flex justify-between items-center pt-1 border-t border-line">
                        <span>Remaining in Vault:</span>
                        <span className="font-semibold text-ink">
                          {formatCurrency(w.remainingVaultBalance, w.currency)}
                        </span>
                      </div>
                    )}

                    <div className="text-xs text-ink-3 bg-surface p-2 rounded-lg border border-line">
                      Destination: <span className="font-semibold text-ink">{w.accountName}</span> ({w.bankName} · {w.accountNumber})
                    </div>

                    {w.rejectionReason && (
                      <div className="text-xs text-neg bg-neg-soft p-2 rounded-lg border border-line">
                        Admin Note: {w.rejectionReason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Terms and Conditions Legal Modal */}
      {isTermsOpen && (
        <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      )}
    </div>
  );
};
