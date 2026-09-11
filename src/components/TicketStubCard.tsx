import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Plus, PieChart, History } from 'lucide-react';
import { SummaryReport, Profile } from '../types';
import { formatCurrency } from '../design/tokens';
import { useTheme } from '../context/ThemeContext';

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
  const { uiStyle } = useTheme();
  const currency = profile?.displayCurrency || 'GHS';
  const netBalance = summary?.netBalance ?? 0;
  const monthIncome = summary?.monthIncome ?? 0;
  const monthExpense = summary?.monthExpense ?? 0;
  const savingsRate = summary?.savingsRate ?? 0;
  const totalSavedInGoals = summary?.totalSavedInGoals ?? 0;

  const isPositive = netBalance >= 0;
  const isEditorial = uiStyle === 'editorial';

  return (
    <div
      className={`p-4 sm:p-6 relative overflow-hidden transition-all card-3d-hover ${
        isEditorial
          ? 'ticket-stub rounded-xl bg-white dark:bg-[#1A1D24] border border-[#E8E5DF] dark:border-[#2D323F] shadow-sm'
          : 'rounded-2xl bg-white dark:bg-[#1A1D24] border border-[#E2E8F0] dark:border-[#262F40] shadow-xs'
      }`}
    >
      {/* Ambient 3D lighting glows */}
      <div className="absolute -top-16 -right-16 w-52 h-52 bg-emerald-500/10 dark:bg-emerald-400/15 rounded-full blur-3xl pointer-events-none animate-pulse-aura" />
      <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-blue-500/10 dark:bg-blue-400/15 rounded-full blur-3xl pointer-events-none animate-pulse-aura" />

      {/* Decorative top ledger line only for editorial style */}
      {isEditorial && <div className="absolute top-0 left-0 right-0 h-1 bg-[#1A1A1A] dark:bg-white" />}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
        {/* Left: Net Balance Display */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] font-bold">
              {summary?.isMonthlyResetActive !== false ? 'Active Cycle Net Balance' : 'Total Net Balance'}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#F1F5F9] dark:bg-[#20293A] text-[#0F172A] dark:text-[#F1F5F9] border border-[#E2E8F0] dark:border-[#334155]">
              {summary?.cycleMonth || 'Active Month'} • {currency}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-mono-num font-bold tracking-tight text-[#0F172A] dark:text-white break-words">
              {formatCurrency(netBalance, currency)}
            </h1>
            <span
              className={`inline-flex items-center text-xs font-mono-num font-bold px-2 py-0.5 rounded-full ${
                isPositive
                  ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300'
              }`}
            >
              {isPositive ? '+' : ''}
              {formatCurrency(summary?.monthNet || 0, currency)} this month
            </span>
          </div>

          {summary?.allTimeNetBalance !== undefined && summary?.isMonthlyResetActive !== false && (
            <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-mono-num">
              Cumulative All-Time: <strong className="text-[#0F172A] dark:text-white">{formatCurrency(summary.allTimeNetBalance, currency)}</strong>
            </div>
          )}
        </div>

        {/* Right: Key Performance Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Monthly Inflow */}
          <div className="bg-[#F8FAFC] dark:bg-[#141B26] rounded-xl p-3 border border-[#E2E8F0] dark:border-[#232F42]">
            <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-1">
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Monthly Income</span>
            </div>
            <div className="text-xs sm:text-sm md:text-base font-mono-num font-bold text-[#0F172A] dark:text-white truncate">
              {formatCurrency(monthIncome, currency)}
            </div>
          </div>

          {/* Monthly Outflow */}
          <div className="bg-[#F8FAFC] dark:bg-[#141B26] rounded-xl p-3 border border-[#E2E8F0] dark:border-[#232F42]">
            <div className="flex items-center space-x-1 text-rose-600 dark:text-rose-400 text-xs font-semibold mb-1">
              <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Monthly Spending</span>
            </div>
            <div className="text-xs sm:text-sm md:text-base font-mono-num font-bold text-[#0F172A] dark:text-white truncate">
              {formatCurrency(monthExpense, currency)}
            </div>
          </div>

          {/* Savings Vaults */}
          <div className="col-span-2 sm:col-span-1 bg-[#F8FAFC] dark:bg-[#141B26] rounded-xl p-3 border border-[#E2E8F0] dark:border-[#232F42]">
            <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-1">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Vault Savings</span>
            </div>
            <div className="text-xs sm:text-sm md:text-base font-mono-num font-bold text-[#0F172A] dark:text-white truncate">
              {formatCurrency(totalSavedInGoals, currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom quick status and actions bar */}
      <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-[#E2E8F0] dark:border-[#262F40] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-semibold text-[#0F172A] dark:text-white">Active Cycle</span>
          </div>
          <span className="hidden sm:inline-block text-[#CBD5E1] dark:text-[#334155]">•</span>
          <div className="flex items-center space-x-1.5">
            <span>Savings Rate:</span>
            <span className="font-mono-num font-bold text-[#0F172A] dark:text-white">{savingsRate}%</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={onAddTransaction}
            className="flex-1 sm:flex-initial text-center px-3.5 py-1.5 bg-[#0F172A] hover:bg-[#1E293B] text-white dark:bg-white dark:text-[#0F172A] rounded-lg font-bold transition-all shadow-xs flex items-center justify-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Transaction</span>
          </button>
          <button
            onClick={onManageBudgets}
            className="flex-1 sm:flex-initial text-center px-3 py-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] dark:bg-[#1E293B] dark:hover:bg-[#2D3B4F] text-[#0F172A] dark:text-white rounded-lg font-semibold transition-all border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-center space-x-1"
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Budgets</span>
          </button>
          {onNavigateToHistory && (
            <button
              onClick={onNavigateToHistory}
              className="flex-1 sm:flex-initial text-center px-3 py-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] dark:bg-[#1E293B] dark:hover:bg-[#2D3B4F] text-[#0F172A] dark:text-white rounded-lg font-semibold transition-all border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-center space-x-1"
            >
              <History className="w-3.5 h-3.5" />
              <span>Monthly History</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
