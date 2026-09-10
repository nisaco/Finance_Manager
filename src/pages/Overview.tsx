import React from 'react';
import {
  ArrowRight,
  Receipt,
  PiggyBank,
  Scale,
  Plus,
  AlertTriangle,
  Send,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { TicketStubCard } from '../components/TicketStubCard';
import { ReceiptRow } from '../components/ReceiptRow';
import { CardSkeleton, TicketStubSkeleton } from '../components/Skeletons';
import { formatCurrency, formatDate } from '../design/tokens';
import { Goal, Transaction } from '../types';

interface OverviewProps {
  onNavigateTab: (tab: string) => void;
  onOpenNewTx: () => void;
  onOpenNewBudget: () => void;
  onOpenNewGoal: () => void;
  onFundGoal: (goal: Goal) => void;
  onEditTx: (tx: Transaction) => void;
}

export const Overview: React.FC<OverviewProps> = ({
  onNavigateTab,
  onOpenNewTx,
  onOpenNewBudget,
  onOpenNewGoal,
  onFundGoal,
  onEditTx,
}) => {
  const {
    activeProfile,
    summary,
    transactions,
    budgets,
    goals,
    debts,
    isLoading,
  } = useLedger();

  if (isLoading && !activeProfile) {
    return (
      <div className="space-y-6">
        <TicketStubSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton rows={4} />
          <CardSkeleton rows={4} />
        </div>
      </div>
    );
  }

  const currency = activeProfile?.displayCurrency || 'GHS';
  const recentTransactions = transactions.slice(0, 6);

  return (
    <div className="space-y-6">
      
      {/* 1. Ticket Stub Balance Card */}
      <TicketStubCard
        summary={summary}
        profile={activeProfile}
        onAddTransaction={onOpenNewTx}
        onManageBudgets={() => onNavigateTab('budgets')}
      />

      {/* 2. Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Recent Transactions (Receipt Style) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#1A1D24] border border-[#E8E5DF] dark:border-[#2D323F] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 card-3d-hover transition-all">
          <div className="flex items-center justify-between border-b border-[#E8E5DF] dark:border-[#2D323F] pb-3">
            <div className="flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-[#1A1A1A] dark:text-[#F3F4F6]" />
              <h2 className="font-display text-base font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                Recent Ledger Transactions
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('transactions')}
              className="text-xs text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] flex items-center space-x-1 font-semibold transition-colors"
            >
              <span>View Full Ledger</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#E8E5DF] dark:divide-[#2D323F]">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                No transactions recorded yet. Tap "Record Entry" to start.
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <ReceiptRow
                  key={tx.id}
                  transaction={tx}
                  displayCurrency={currency}
                  onEdit={onEditTx}
                  showActions={false}
                />
              ))
            )}
          </div>

          {recentTransactions.length > 0 && (
            <div className="pt-2 text-center border-t border-[#E8E5DF] dark:border-[#2D323F]">
              <button
                onClick={onOpenNewTx}
                className="text-xs text-[#1A1A1A] dark:text-[#F3F4F6] hover:text-[#4B5563] dark:hover:text-white font-bold inline-flex items-center space-x-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Record New Entry</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Budgets & Savings Goals */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Monthly Budgets Monitor */}
          <div className="bg-white dark:bg-[#1A1D24] border border-[#E8E5DF] dark:border-[#2D323F] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 card-3d-hover transition-all">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] dark:border-[#2D323F] pb-3">
              <div className="flex items-center space-x-2">
                <Scale className="w-4 h-4 text-[#1A1A1A] dark:text-[#F3F4F6]" />
                <h2 className="font-display text-base font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                  Monthly Category Budgets
                </h2>
              </div>
              <button
                onClick={() => onNavigateTab('budgets')}
                className="text-xs text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] font-semibold transition-colors"
              >
                Manage
              </button>
            </div>

            <div className="space-y-3.5">
              {budgets.length === 0 ? (
                <div className="text-center py-4 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  No category budgets set.
                </div>
              ) : (
                budgets.slice(0, 4).map((b) => {
                  const spent = b.spent || 0;
                  const pct = b.percentage || 0;
                  const isOver = pct >= 100;
                  const isNear = pct >= 80 && !isOver;

                  return (
                    <div key={b.id} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">{b.category}</span>
                        <span className="font-mono-num text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                          {formatCurrency(spent, b.currency)} / {formatCurrency(b.limit, b.currency)} ({pct}%)
                        </span>
                      </div>
                      
                      <div className="w-full bg-[#F7F5F2] dark:bg-[#111317] rounded-full h-2 overflow-hidden border border-[#E8E5DF] dark:border-[#2D323F]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOver
                              ? 'bg-[#DC2626]'
                              : isNear
                              ? 'bg-[#EA580C]'
                              : 'bg-[#1A1A1A] dark:bg-white'
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Savings Vaults Preview (Paystack Powered) */}
          <div className="bg-white dark:bg-[#1A1D24] border border-[#E8E5DF] dark:border-[#2D323F] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 card-3d-hover transition-all">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] dark:border-[#2D323F] pb-3">
              <div className="flex items-center space-x-2">
                <PiggyBank className="w-4 h-4 text-[#1A1A1A] dark:text-[#F3F4F6]" />
                <h2 className="font-display text-base font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                  Savings Vaults
                </h2>
              </div>
              <button
                onClick={() => onNavigateTab('goals')}
                className="text-xs text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] font-semibold transition-colors"
              >
                All Vaults
              </button>
            </div>

            <div className="space-y-3">
              {goals.length === 0 ? (
                <div className="text-center py-4 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  No active savings goals.
                </div>
              ) : (
                goals.slice(0, 3).map((g) => {
                  const pct = Math.min(100, Math.round((g.current / g.target) * 100));
                  const isPaystack = g.paystackDestination?.type === 'paystack_recipient';

                  return (
                    <div
                      key={g.id}
                      className="p-3 bg-[#FDFCFB] dark:bg-[#121419] rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <span className="font-semibold text-[#1A1A1A] dark:text-[#F3F4F6] truncate">{g.name}</span>
                          {isPaystack && (
                            <span className="px-1.5 py-0.2 rounded bg-[#15803D]/10 text-[9px] text-[#15803D] font-mono-num border border-[#15803D]/30 shrink-0 font-semibold">
                              Paystack Vault
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => onFundGoal(g)}
                          className="px-2.5 py-1 bg-[#1A1A1A] dark:bg-white dark:text-[#111317] hover:bg-[#333333] text-[#FFFFFF] rounded-lg text-[11px] font-semibold flex items-center space-x-1 shrink-0 transition-all shadow-xs active:scale-95"
                        >
                          <Send className="w-3 h-3" />
                          <span>Fund</span>
                        </button>
                      </div>

                      <div className="w-full bg-[#E8E5DF] dark:bg-[#202533] rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#15803D] h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[11px] font-mono-num text-[#6B7280] dark:text-[#9CA3AF]">
                        <span>{formatCurrency(g.current, g.currency)}</span>
                        <span>{formatCurrency(g.target, g.currency)} ({pct}%)</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Debts Snapshot */}
          <div className="bg-white dark:bg-[#1A1D24] border border-[#E8E5DF] dark:border-[#2D323F] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs card-3d-hover transition-all">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#F7F5F2] dark:bg-[#202533] border border-[#E8E5DF] dark:border-[#2D323F] flex items-center justify-center text-[#1A1A1A] dark:text-[#F3F4F6] shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-[#1A1A1A] dark:text-[#F3F4F6] block">Debts & Credit Ledger</span>
                <span className="text-[#6B7280] dark:text-[#9CA3AF] font-mono-num text-[11px] block truncate">
                  Owed: {formatCurrency(summary?.totalOwedToMe || 0, currency)} • I Owe: {formatCurrency(summary?.totalIOwe || 0, currency)}
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('debts')}
              className="w-full sm:w-auto px-3 py-1.5 bg-[#F7F5F2] dark:bg-[#202533] hover:bg-[#E8E5DF] dark:hover:bg-[#2A3142] text-[#1A1A1A] dark:text-[#F3F4F6] rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] font-semibold text-xs transition-all text-center shrink-0"
            >
              Review
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
