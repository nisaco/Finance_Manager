import React from 'react';
import { Scale, Plus, AlertCircle, CheckCircle, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { Budget } from '../types';
import { formatCurrency } from '../design/tokens';
import { api } from '../api/client';

interface BudgetsPageProps {
  onOpenNewBudget: () => void;
  onEditBudget: (budget: Budget) => void;
}

export const BudgetsPage: React.FC<BudgetsPageProps> = ({
  onOpenNewBudget,
  onEditBudget,
}) => {
  const { activeProfile, budgets, refreshData, notify } = useLedger();
  const currency = activeProfile?.displayCurrency || 'GHS';

  const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalBudgetSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const overallPercentage = totalBudgetLimit > 0 ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100) : 0;

  const handleDelete = async (id: string) => {
    if (confirm('Delete this budget limit?')) {
      try {
        await api.deleteBudget(id);
        notify('Budget removed');
        await refreshData();
      } catch (err: any) {
        notify(err.message || 'Failed to remove budget', 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-[#1A1A1A]" />
            <h1 className="font-display text-2xl font-bold text-[#1A1A1A]">
              Monthly Category Budgets
            </h1>
          </div>
          <p className="text-xs text-[#6B7280] font-mono-num mt-0.5">
            {activeProfile?.name} • Automated monthly expense tracking against planned limits
          </p>
        </div>

        <button
          onClick={onOpenNewBudget}
          className="px-3.5 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center space-x-1.5 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Budget</span>
        </button>
      </div>

      {/* Global Budget Meter Card */}
      <div className="bg-white border border-[#E8E5DF] rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num font-semibold">
              Consolidated Monthly Budget Utilization
            </span>
            <div className="text-base sm:text-lg font-mono-num font-bold text-[#1A1A1A] mt-0.5">
              {formatCurrency(totalBudgetSpent, currency)} / {formatCurrency(totalBudgetLimit, currency)}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="font-mono-num font-bold text-xs sm:text-sm text-[#1A1A1A]">
              {overallPercentage}% Utilized
            </span>
            <span className="text-[11px] text-[#6B7280] block font-mono-num">
              {formatCurrency(Math.max(0, totalBudgetLimit - totalBudgetSpent), currency)} remaining
            </span>
          </div>
        </div>

        <div className="w-full bg-[#F7F5F2] rounded-full h-3 overflow-hidden border border-[#E8E5DF]">
          <div
            className={`h-full rounded-full transition-all ${
              overallPercentage >= 100
                ? 'bg-[#DC2626]'
                : overallPercentage >= 80
                ? 'bg-[#EA580C]'
                : 'bg-[#1A1A1A]'
            }`}
            style={{ width: `${Math.min(overallPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {budgets.length === 0 ? (
          <div className="col-span-full bg-white border border-[#E8E5DF] rounded-xl p-8 sm:p-12 text-center text-[#6B7280] space-y-2 shadow-sm">
            <Scale className="w-8 h-8 text-[#D5D0C7] mx-auto" />
            <p className="text-sm font-medium">No category budgets established yet.</p>
            <button
              onClick={onOpenNewBudget}
              className="mt-2 text-xs text-[#1A1A1A] hover:underline font-bold inline-block"
            >
              Add Your First Budget Limit
            </button>
          </div>
        ) : (
          budgets.map((b) => {
            const spent = b.spent || 0;
            const pct = b.percentage || 0;
            const isFrozen = b.status === 'exceeded_locked' || b.isExceeded;
            const isOver = pct >= 100 || isFrozen;
            const isNear = pct >= 80 && !isOver;

            return (
              <div
                key={b.id}
                className={`bg-white dark:bg-[#1E2128] border rounded-xl p-4 sm:p-5 shadow-sm space-y-3.5 transition-all ${
                  isFrozen
                    ? 'border-[#DC2626] ring-1 ring-[#DC2626]/20'
                    : isOver
                    ? 'border-[#DC2626]'
                    : isNear
                    ? 'border-[#EA580C]'
                    : 'border-[#E8E5DF] dark:border-[#2D323F]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white">{b.category}</h3>
                    <div className="flex items-center space-x-1.5 mt-1 flex-wrap gap-y-1">
                      {isFrozen ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-num bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold">
                          <ShieldAlert className="w-3 h-3 mr-1" />
                          105% Hard Stop (Frozen)
                        </span>
                      ) : isOver ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono-num bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20 font-bold">
                          <ShieldAlert className="w-2.5 h-2.5 mr-1" />
                          Exceeded Limit
                        </span>
                      ) : isNear ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono-num bg-[#EA580C]/10 text-[#EA580C] border border-[#EA580C]/20 font-bold">
                          <AlertCircle className="w-2.5 h-2.5 mr-1" />
                          Near Threshold (80%+)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono-num bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/20 font-bold">
                          <CheckCircle className="w-2.5 h-2.5 mr-1" />
                          Within Limit
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onEditBudget(b)}
                      className="p-1 text-[#6B7280] hover:text-[#1A1A1A] dark:hover:text-white hover:bg-[#F7F5F2] dark:hover:bg-[#2D323F] rounded transition-colors"
                      title="Edit Budget"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-1 text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEE2E2] dark:hover:bg-red-950/40 rounded transition-colors"
                      title="Delete Budget"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isFrozen && (
                  <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-[11px] text-red-800 dark:text-red-300">
                    <p className="font-semibold flex items-center">
                      <ShieldAlert className="w-3.5 h-3.5 mr-1 shrink-0 text-red-600 dark:text-red-400" />
                      Budget Exceeded & Frozen (105% Capped)
                    </p>
                    <p className="text-[10px] text-red-700 dark:text-red-400 mt-0.5">
                      Subsequent expenditures in {b.category} are disregarded from this budget's calculations.
                    </p>
                  </div>
                )}

                {/* Numbers */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono-num">
                    <span className="text-[#6B7280] dark:text-[#9CA3AF]">
                      {isFrozen ? 'Capped Spent (105%):' : 'Spent:'}
                    </span>
                    <span className="font-bold text-[#1A1A1A] dark:text-white">
                      {formatCurrency(spent, b.currency)}
                    </span>
                  </div>
                  {isFrozen && b.rawSpent && b.rawSpent > spent && (
                    <div className="flex justify-between text-[11px] font-mono-num text-[#9CA3AF]">
                      <span>Total Real Outflow:</span>
                      <span className="line-through">{formatCurrency(b.rawSpent, b.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-mono-num">
                    <span className="text-[#6B7280] dark:text-[#9CA3AF]">Limit:</span>
                    <span className="text-[#6B7280] dark:text-[#9CA3AF]">
                      {formatCurrency(b.limit, b.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-mono-num pt-1 border-t border-[#E8E5DF] dark:border-[#2D323F]">
                    <span className="text-[#6B7280] dark:text-[#9CA3AF]">Remaining:</span>
                    <span className={`font-bold ${isOver ? 'text-[#DC2626]' : 'text-[#15803D]'}`}>
                      {formatCurrency(Math.max(0, b.limit - spent), b.currency)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-[#F7F5F2] dark:bg-[#121418] rounded-full h-2 overflow-hidden border border-[#E8E5DF] dark:border-[#2D323F]">
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
                  <div className="text-right text-[10px] font-mono-num text-[#6B7280] dark:text-[#9CA3AF]">
                    {pct}% of monthly allocation
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
