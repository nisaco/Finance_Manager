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
  ArrowDownLeft,
  Lock,
  Wallet,
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
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <PiggyBank className="w-5 h-5 text-[#1A1A1A] dark:text-white" />
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#1A1A1A] dark:text-white">
              Savings Vaults
            </h1>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mt-0.5">
            {activeProfile?.name} • Deposit and save anytime • Set an end date to withdraw at 2% or anytime with penalty
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Prominent Withdraw Action Button */}
          <button
            onClick={handlePrimaryWithdraw}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center space-x-1.5 active:scale-95"
            title="Initiate a withdrawal payout from your savings vaults"
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Withdraw Funds</span>
          </button>

          <button
            onClick={handleOpenWithdrawalsHistory}
            className="px-3.5 py-2 bg-white dark:bg-[#1E2128] hover:bg-[#F7F5F2] dark:hover:bg-[#252830] text-[#1A1A1A] dark:text-white border border-[#E8E5DF] dark:border-[#2D323F] rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center justify-center space-x-1.5"
            title="View status of all pending and approved payouts"
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Withdrawal Requests</span>
          </button>

          <button
            onClick={() => setIsTermsOpen(true)}
            className="px-3 py-2 bg-white dark:bg-[#1E2128] hover:bg-[#F7F5F2] dark:hover:bg-[#252830] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-white border border-[#E8E5DF] dark:border-[#2D323F] rounded-lg text-xs font-medium shadow-xs transition-all flex items-center justify-center space-x-1"
            title="View 2% standard fee and 10% early withdrawal penalty policy"
          >
            <span>Fee &amp; Custody Policy</span>
          </button>

          <button
            onClick={onOpenNewGoal}
            className="px-3.5 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] dark:bg-white dark:text-[#1A1A1A] rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Savings Vault</span>
          </button>
        </div>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#9CA3AF] text-xs">
            <span>Total Vault Reserves</span>
            <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-mono-num font-bold text-[#1A1A1A] dark:text-white">
            {formatCurrency(totalSaved, currency)}
          </div>
          <div className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] font-mono-num">
            Total Target: {formatCurrency(totalTarget, currency)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#9CA3AF] text-xs">
            <span>Available to Withdraw</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-mono-num font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(availableToWithdraw, currency)}
          </div>
          <div className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">
            {fundedGoals.length} vaults with active balance
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#9CA3AF] text-xs">
            <span>Disbursement Fee</span>
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-lg sm:text-xl font-mono-num font-bold text-[#1A1A1A] dark:text-white">
            2% Standard
          </div>
          <div className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">
            Applies on or after set end date
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#9CA3AF] text-xs">
            <span>Early Withdrawal Rule</span>
            <Lock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-mono-num font-bold text-amber-600 dark:text-amber-400">
            10% Penalty Fee
          </div>
          <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
            Applies if withdrawn before set date
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            filterType === 'all'
              ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs'
              : 'text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F7F5F2] dark:hover:bg-[#252830]'
          }`}
        >
          All Vaults ({goals.length})
        </button>
        <button
          onClick={() => setFilterType('active')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            filterType === 'active'
              ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs'
              : 'text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F7F5F2] dark:hover:bg-[#252830]'
          }`}
        >
          Active Funds ({fundedGoals.length})
        </button>
        <button
          onClick={() => setFilterType('matured')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            filterType === 'matured'
              ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs'
              : 'text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F7F5F2] dark:hover:bg-[#252830]'
          }`}
        >
          Ready for Maturity Payout ({maturedCount})
        </button>
        {pendingCount > 0 && (
          <button
            onClick={() => setFilterType('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              filterType === 'pending'
                ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs'
                : 'text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F7F5F2] dark:hover:bg-[#252830]'
            }`}
          >
            Pending Review ({pendingCount})
          </button>
        )}
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {filteredGoals.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl p-8 sm:p-12 text-center text-[#6B7280] dark:text-[#9CA3AF] space-y-2 shadow-sm">
            <PiggyBank className="w-10 h-10 text-[#D5D0C7] dark:text-[#3A404F] mx-auto" />
            <p className="text-sm font-medium">No savings vaults found matching this filter.</p>
            <button
              onClick={onOpenNewGoal}
              className="mt-2 text-xs text-[#1A1A1A] dark:text-white hover:underline font-bold inline-block"
            >
              Create a New Savings Vault
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
                className="bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between hover:border-[#D5D0C7] dark:hover:border-[#3A404F] transition-all"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-display text-base font-bold text-[#1A1A1A] dark:text-white truncate">
                          {g.name}
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-num font-bold bg-[#F7F5F2] dark:bg-[#15181E] text-[#6B7280] dark:text-[#9CA3AF] border border-[#E8E5DF] dark:border-[#2D323F] shrink-0">
                          Savings Vault
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 mt-1.5 flex-wrap gap-y-1">
                        {/* Target Date Pill */}
                        {g.deadline ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-num font-bold ${
                              isMatured
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            }`}
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            {isMatured
                              ? 'Set Date Reached (2% standard fee)'
                              : `Set Date: ${formatDate(g.deadline)} (${daysRemaining !== null ? `${daysRemaining}d left` : ''}) • 10% Early Fee`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-num bg-[#F7F5F2] dark:bg-[#15181E] text-[#6B7280] dark:text-[#9CA3AF] border border-[#E8E5DF] dark:border-[#2D323F]">
                            Flexible Date • 2% Payout Fee
                          </span>
                        )}

                        {g.status === 'pending_withdrawal' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-num bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold">
                            <Clock className="w-3 h-3 mr-1" />
                            Payout Pending Admin Approval
                          </span>
                        ) : null}

                        {isPaystack ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono-num bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold truncate max-w-full">
                            <ShieldCheck className="w-3 h-3 mr-1 shrink-0" />
                            <span className="truncate">Paystack • {g.paystackDestination.bankName} (•••• {g.paystackDestination.accountLast4})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono-num bg-[#F7F5F2] dark:bg-[#15181E] text-[#6B7280] dark:text-[#9CA3AF] border border-[#E8E5DF] dark:border-[#2D323F] font-medium">
                            Manual Vault
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => onEditGoal(g)}
                        className="p-1.5 sm:p-1 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-white hover:bg-[#F7F5F2] dark:hover:bg-[#252830] rounded transition-colors"
                        title="Edit Goal"
                        aria-label="Edit goal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(g.id)}
                        className="p-1.5 sm:p-1 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEE2E2] dark:hover:bg-red-950/40 rounded transition-colors"
                        title="Delete Goal"
                        aria-label="Delete goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Balance & Target Figures */}
                  <div className="mt-3.5 p-3 bg-[#FDFCFB] dark:bg-[#15181E] rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Current Saved Balance:</span>
                      <span className="text-base sm:text-lg font-mono-num font-bold text-[#1A1A1A] dark:text-white">
                        {formatCurrency(g.current, g.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-mono-num text-[#6B7280] dark:text-[#9CA3AF] pt-1 border-t border-[#E8E5DF] dark:border-[#2D323F]">
                      <span>Target Goal: {formatCurrency(g.target, g.currency)}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Remaining: {formatCurrency(remaining, g.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 mt-3">
                    <div className="w-full bg-[#F7F5F2] dark:bg-[#15181E] rounded-full h-2.5 overflow-hidden border border-[#E8E5DF] dark:border-[#2D323F]">
                      <div
                        className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-mono-num text-[#6B7280] dark:text-[#9CA3AF]">
                      <span className="font-semibold">{pct}% saved</span>
                      {g.deadline && (
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-[#6B7280] dark:text-[#9CA3AF]" />
                          <span>Set Date: {formatDate(g.deadline)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Row */}
                <div className="pt-3 border-t border-[#E8E5DF] dark:border-[#2D323F] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <button
                    onClick={() => handleViewTransfers(g)}
                    className="text-xs text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-white flex items-center justify-center sm:justify-start space-x-1 font-semibold transition-colors py-1 sm:py-0"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Deposits &amp; Paystack Logs</span>
                  </button>

                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    {/* Withdraw Funds Button */}
                    <button
                      onClick={() => {
                        if ((g.current || 0) <= 0) {
                          notify('This vault has 0 balance to withdraw. Make a deposit first.', 'info');
                        } else {
                          setSelectedGoalForWithdrawal(g);
                        }
                      }}
                      disabled={g.status === 'pending_withdrawal'}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center space-x-1 active:scale-95 flex-1 sm:flex-initial border ${
                        g.status === 'pending_withdrawal'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 cursor-not-allowed'
                          : (g.current || 0) > 0
                          ? 'bg-white dark:bg-[#1E2128] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/70'
                          : 'bg-white dark:bg-[#1E2128] hover:bg-[#F7F5F2] dark:hover:bg-[#252830] text-[#6B7280] dark:text-[#9CA3AF] border-[#E8E5DF] dark:border-[#2D323F]'
                      }`}
                      title={
                        g.status === 'pending_withdrawal'
                          ? 'Payout request is currently under review'
                          : (g.current || 0) > 0
                          ? 'Withdraw available funds from this vault'
                          : 'Deposit funds to unlock withdrawal'
                      }
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>{g.status === 'pending_withdrawal' ? 'Payout Pending' : 'Withdraw Funds'}</span>
                    </button>

                    {/* Deposit Funds Button - Deposit anytime as many times as you like! */}
                    <button
                      onClick={() => onFundGoal(g)}
                      disabled={g.status === 'pending_withdrawal'}
                      className="px-3.5 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] dark:bg-white dark:text-[#1A1A1A] rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-40 flex-1 sm:flex-initial"
                      title="Deposit money into this savings vault"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Deposit Funds</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Goal Transfer History Drawer / Modal */}
      {selectedGoalForTransfers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1A1D24] border border-[#E8E5DF] dark:border-[#2D323F] rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-[#E8E5DF] dark:border-[#2D323F] pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-[#1A1A1A] dark:text-white">
                  Deposit History: {selectedGoalForTransfers.name}
                </h3>
                <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF] font-mono-num">
                  Paystack deposits and settlements log
                </span>
              </div>
              <button
                onClick={() => setSelectedGoalForTransfers(null)}
                className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-white px-2 py-1 hover:bg-[#F7F5F2] dark:hover:bg-[#252830] rounded-lg"
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
                <div className="py-8 text-center text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  No deposits recorded yet for this vault.
                </div>
              ) : (
                transfers.map((txf) => (
                  <div
                    key={txf.id}
                    className="p-3 bg-[#FDFCFB] dark:bg-[#121418] rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] space-y-1.5 text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono-num font-bold text-[#1A1A1A] dark:text-white">
                        +{formatCurrency(txf.amount, txf.currency)}
                      </span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono-num font-bold ${
                          txf.status === 'success'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : txf.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
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
                    <div className="flex justify-between items-center text-[10px] font-mono-num text-[#6B7280] dark:text-[#9CA3AF]">
                      <span className="truncate max-w-[200px]">Ref: {txf.paystackReference}</span>
                      <span>{new Date(txf.createdAt).toLocaleString()}</span>
                    </div>
                    {txf.gatewayResponse && (
                      <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] italic pt-0.5">
                        {txf.gatewayResponse}
                      </p>
                    )}
                    {txf.status === 'pending' && (
                      <div className="pt-1 text-right">
                        <button
                          onClick={() => handleVerifySingleTransfer(txf.paystackReference)}
                          className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1A1D24] border border-[#E8E5DF] dark:border-[#2D323F] rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-[#E8E5DF] dark:border-[#2D323F] pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-[#1A1A1A] dark:text-white flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span>My Vault Payout Requests</span>
                </h3>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                  Track your submitted withdrawal requests, fees, and administrator approval status.
                </p>
              </div>
              <button
                onClick={() => setShowWithdrawalsList(false)}
                className="text-[#6B7280] hover:text-[#1A1A1A] dark:hover:text-white p-1 rounded-lg hover:bg-[#F7F5F2] dark:hover:bg-[#252830]"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {loadingWithdrawals ? (
                <div className="py-8 text-center text-xs text-[#6B7280]">
                  Loading withdrawal records...
                </div>
              ) : myWithdrawals.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <PiggyBank className="w-10 h-10 text-[#D5D0C7] mx-auto" />
                  <p className="text-sm font-medium text-[#6B7280] dark:text-[#9CA3AF]">
                    No withdrawal requests submitted yet.
                  </p>
                  <p className="text-xs text-[#9CA3AF]">
                    When your savings vault matures or you request a payout, requests appear here.
                  </p>
                </div>
              ) : (
                myWithdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="p-3.5 bg-[#FDFCFB] dark:bg-[#121418] rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-[#1A1A1A] dark:text-white text-sm">
                          {w.goalName}
                        </span>
                        <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mt-0.5">
                          Requested: {new Date(w.createdAt).toLocaleDateString()} at {new Date(w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          w.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : w.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {w.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E8E5DF] dark:border-[#2D323F] font-mono-num text-[11px]">
                      <div>
                        <span className="text-[#6B7280] block text-[10px]">Requested:</span>
                        <span className="font-semibold text-[#1A1A1A] dark:text-white">
                          {formatCurrency(w.requestedAmount, w.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#6B7280] block text-[10px]">Total Fees ({w.isEarlyWithdrawal ? '12%' : '2%'}):</span>
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          -{formatCurrency(w.feeAmount, w.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#6B7280] block text-[10px]">Net Payout:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(w.netPayoutAmount, w.currency)}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] bg-white dark:bg-[#1E2128] p-2 rounded border border-[#E8E5DF] dark:border-[#2D323F]/60">
                      Destination: <span className="font-semibold text-[#1A1A1A] dark:text-white">{w.accountName}</span> ({w.bankName} • {w.accountNumber})
                    </div>

                    {w.rejectionReason && (
                      <div className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded border border-rose-200 dark:border-rose-900/60">
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
