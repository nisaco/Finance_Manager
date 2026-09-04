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
            const isOver = pct >= 100;
            const isNear = pct >= 80 && !isOver;

            return (
              <div
                key={b.id}
                className={`bg-white border rounded-xl p-4 sm:p-5 shadow-sm space-y-4 transition-all ${
                  isOver ? 'border-[#DC2626]' : isNear ? 'border-[#EA580C]' : 'border-[#E8E5DF]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[#1A1A1A]">{b.category}</h3>
                    <div className="flex items-center space-x-1.5 mt-1">
                      {isOver ? (
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
                      className="p-1 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F7F5F2] rounded transition-colors"
                      title="Edit Budget"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-1 text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded transition-colors"
                      title="Delete Budget"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Numbers */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono-num">
                    <span className="text-[#6B7280]">Spent:</span>
                    <span className="font-bold text-[#1A1A1A]">
                      {formatCurrency(spent, b.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-mono-num">
                    <span className="text-[#6B7280]">Limit:</span>
                    <span className="text-[#6B7280]">
                      {formatCurrency(b.limit, b.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-mono-num pt-1 border-t border-[#E8E5DF]">
                    <span className="text-[#6B7280]">Remaining:</span>
                    <span className={`font-bold ${isOver ? 'text-[#DC2626]' : 'text-[#15803D]'}`}>
                      {formatCurrency(Math.max(0, b.limit - spent), b.currency)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-[#F7F5F2] rounded-full h-2 overflow-hidden border border-[#E8E5DF]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOver
                          ? 'bg-[#DC2626]'
                          : isNear
                          ? 'bg-[#EA580C]'
                          : 'bg-[#1A1A1A]'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="text-right text-[10px] font-mono-num text-[#6B7280]">
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
