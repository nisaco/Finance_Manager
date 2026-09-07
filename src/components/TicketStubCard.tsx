import React from 'react';
import { ArrowUpRight, ArrowDownRight, ShieldCheck, Sparkles, TrendingUp, DollarSign } from 'lucide-react';
import { SummaryReport, Profile } from '../types';
import { formatCurrency } from '../design/tokens';

interface TicketStubCardProps {
  summary: SummaryReport | null;
  profile: Profile | null;
  onAddTransaction: () => void;
  onManageBudgets: () => void;
}

export const TicketStubCard: React.FC<TicketStubCardProps> = ({
  summary,
  profile,
  onAddTransaction,
  onManageBudgets,
}) => {
  const currency = profile?.displayCurrency || 'GHS';
  const netBalance = summary?.netBalance ?? 0;
  const monthIncome = summary?.monthIncome ?? 0;
  const monthExpense = summary?.monthExpense ?? 0;
  const savingsRate = summary?.savingsRate ?? 0;
  const totalSavedInGoals = summary?.totalSavedInGoals ?? 0;

  const isPositive = netBalance >= 0;

  return (
    <div className="ticket-stub rounded-xl p-4 sm:p-6 shadow-sm relative overflow-hidden bg-white border border-[#E8E5DF]">
      {/* Decorative top ledger rule */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#1A1A1A]" />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
        
        {/* Left: Net Balance Display */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-widest text-[#6B7280] font-mono-num font-semibold">
              Consolidated Net Ledger Balance
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-num bg-[#F7F5F2] text-[#1A1A1A] border border-[#E8E5DF] font-semibold">
              {profile?.name} • {currency}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-mono-num font-bold tracking-tight text-[#1A1A1A] break-words">
              {formatCurrency(netBalance, currency)}
            </h1>
            <span
              className={`inline-flex items-center text-xs font-mono-num font-bold px-2 py-0.5 rounded ${
                isPositive ? 'text-[#15803D] bg-[#15803D]/10' : 'text-[#B91C1C] bg-[#B91C1C]/10'
              }`}
            >
              {isPositive ? '+' : ''}
              {formatCurrency(summary?.monthNet || 0, currency)} this month
            </span>
          </div>

          <p className="text-xs text-[#6B7280] max-w-md pt-0.5">
            Automated double-entry reconciliation across all accounts, Paystack vaults, and debt ledgers.
          </p>
        </div>

        {/* Right: Key Performance Metrics & Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          
          {/* Monthly Inflow */}
          <div className="bg-[#FDFCFB] rounded-lg p-2.5 sm:p-3 border border-[#E8E5DF]">
            <div className="flex items-center space-x-1 text-[#15803D] text-[11px] sm:text-xs font-semibold mb-1">
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Inflow (Month)</span>
            </div>
            <div className="text-xs sm:text-sm md:text-base font-mono-num font-bold text-[#1A1A1A] truncate">
              {formatCurrency(monthIncome, currency)}
            </div>
          </div>

          {/* Monthly Outflow */}
          <div className="bg-[#FDFCFB] rounded-lg p-2.5 sm:p-3 border border-[#E8E5DF]">
            <div className="flex items-center space-x-1 text-[#B91C1C] text-[11px] sm:text-xs font-semibold mb-1">
              <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Outflow (Month)</span>
            </div>
            <div className="text-xs sm:text-sm md:text-base font-mono-num font-bold text-[#1A1A1A] truncate">
              {formatCurrency(monthExpense, currency)}
            </div>
          </div>

          {/* Savings Vaults */}
          <div className="col-span-2 sm:col-span-1 bg-[#FDFCFB] rounded-lg p-2.5 sm:p-3 border border-[#E8E5DF]">
            <div className="flex items-center space-x-1 text-[#1A1A1A] text-[11px] sm:text-xs font-semibold mb-1">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Savings Vaults</span>
            </div>
            <div className="text-xs sm:text-sm md:text-base font-mono-num font-bold text-[#1A1A1A] truncate">
              {formatCurrency(totalSavedInGoals, currency)}
            </div>
          </div>

        </div>

      </div>

      {/* Bottom quick status bar */}
      <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-[#E8E5DF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#6B7280]">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#15803D] shrink-0" />
            <span className="font-mono-num font-medium text-[#1A1A1A]">Ledger Synchronized</span>
          </div>
          <div className="hidden sm:inline-block text-[#E8E5DF]">|</div>
          <div className="flex items-center space-x-1.5">
            <span>Savings Rate:</span>
            <span className="font-mono-num font-bold text-[#1A1A1A]">{savingsRate}%</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={onAddTransaction}
            className="flex-1 sm:flex-initial text-center px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] rounded border border-[#1A1A1A] font-semibold transition-colors"
          >
            Record Entry
          </button>
          <button
            onClick={onManageBudgets}
            className="flex-1 sm:flex-initial text-center px-3 py-1.5 bg-[#F7F5F2] hover:bg-[#E8E5DF] text-[#1A1A1A] rounded border border-[#E8E5DF] font-semibold transition-colors"
          >
            Review Budgets
          </button>
        </div>
      </div>
    </div>
  );
};
