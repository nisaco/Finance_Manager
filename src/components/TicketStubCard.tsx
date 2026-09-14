import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Plus, PieChart, History } from 'lucide-react';
import { SummaryReport, Profile } from '../types';
import { formatCurrency } from '../design/tokens';

interface TicketStubCardProps {
  summary: SummaryReport | null;
  profile: Profile | null;
  onAddTransaction: () => void;
  onManageBudgets: () => void;
  onNavigateToHistory?: () => void;
}

export const TicketStubCard: React.FC<TicketStubCardProps> = ({
  summary,
  profile,
  onAddTransaction,
  onManageBudgets,
  onNavigateToHistory,
}) => {
  const currency = profile?.displayCurrency || 'GHS';
  const netBalance = summary?.netBalance ?? 0;
  const monthIncome = summary?.monthIncome ?? 0;
  const monthExpense = summary?.monthExpense ?? 0;
  const savingsRate = summary?.savingsRate ?? 0;
  const totalSavedInGoals = summary?.totalSavedInGoals ?? 0;

  const isPositive = netBalance >= 0;

  return (
    <div className="lg-card p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
        {/* Left: Net Balance Display */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="t-eyebrow text-ink-3">
              {summary?.isMonthlyResetActive !== false ? 'Active Cycle Net Balance' : 'Total Net Balance'}
            </span>
            <span className="lg-tag">
              {summary?.cycleMonth || 'Active Month'} · {currency}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
            <h1 className="t-hero num text-ink font-bold tracking-tight">
              {formatCurrency(netBalance, currency)}
            </h1>
            <span
              className={`inline-flex items-center text-xs num font-semibold px-2 py-0.5 rounded-full ${
                isPositive
                  ? 'text-pos bg-pos-soft'
                  : 'text-neg bg-neg-soft'
              }`}
            >
              {isPositive ? '+' : ''}
              {formatCurrency(summary?.monthNet || 0, currency)} this month
            </span>
          </div>

          {summary?.allTimeNetBalance !== undefined && summary?.isMonthlyResetActive !== false && (
            <div className="text-xs text-ink-3 num">
              Cumulative All-Time:{' '}
              <strong className="text-ink font-semibold">{formatCurrency(summary.allTimeNetBalance, currency)}</strong>
            </div>
          )}
        </div>

        {/* Right: Key Performance Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Monthly Inflow */}
          <div className="bg-sunken rounded-xl p-3 border border-line">
            <div className="flex items-center gap-1 text-pos text-xs font-semibold mb-1">
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.7} />
              <span className="truncate">Monthly Income</span>
            </div>
            <div className="text-xs sm:text-sm md:text-base num font-bold text-ink truncate">
              {formatCurrency(monthIncome, currency)}
            </div>
          </div>

          {/* Monthly Outflow */}
          <div className="bg-sunken rounded-xl p-3 border border-line">
            <div className="flex items-center gap-1 text-neg text-xs font-semibold mb-1">
              <ArrowDownRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.7} />
              <span className="truncate">Monthly Spending</span>
            </div>
            <div className="text-xs sm:text-sm md:text-base num font-bold text-ink truncate">
              {formatCurrency(monthExpense, currency)}
            </div>
          </div>

          {/* Savings Vaults */}
          <div className="col-span-2 sm:col-span-1 bg-sunken rounded-xl p-3 border border-line">
            <div className="flex items-center gap-1 text-accent text-xs font-semibold mb-1">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" strokeWidth={1.7} />
              <span className="truncate">Vault Savings</span>
            </div>
            <div className="text-xs sm:text-sm md:text-base num font-bold text-ink truncate">
              {formatCurrency(totalSavedInGoals, currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom quick status and actions bar */}
      <div className="pt-3 sm:pt-4 border-t border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-ink-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pos shrink-0" />
            <span className="font-semibold text-ink">Active Cycle</span>
          </div>
          <span className="hidden sm:inline-block text-ink-4" aria-hidden="true">·</span>
          <div className="flex items-center gap-1">
            <span>Savings Rate:</span>
            <span className="num font-bold text-ink">{savingsRate}%</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onAddTransaction}
            className="lg-btn lg-btn-solid text-xs flex-1 sm:flex-initial"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.7} />
            <span>Add Transaction</span>
          </button>
          <button
            type="button"
            onClick={onManageBudgets}
            className="lg-btn lg-btn-quiet text-xs flex-1 sm:flex-initial"
          >
            <PieChart className="w-3.5 h-3.5" strokeWidth={1.7} />
            <span>Budgets</span>
          </button>
          {onNavigateToHistory && (
            <button
              type="button"
              onClick={onNavigateToHistory}
              className="lg-btn lg-btn-quiet text-xs flex-1 sm:flex-initial"
            >
              <History className="w-3.5 h-3.5" strokeWidth={1.7} />
              <span>Monthly History</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
