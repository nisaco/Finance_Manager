import React from 'react';
import { useLedger } from '../context/LedgerContext';
import { CardSkeleton, TicketStubSkeleton } from '../components/Skeletons';
import { BalanceHero } from '../components/overview/BalanceHero';
import { ActivityList } from '../components/overview/ActivityList';
import { CategorySpend } from '../components/overview/CategorySpend';
import { BudgetMonitor } from '../components/overview/BudgetMonitor';
import { VaultList } from '../components/overview/VaultList';
import { DebtStrip } from '../components/overview/DebtStrip';
import { Sparkles } from 'lucide-react';
import { Goal, Transaction } from '../types';

interface OverviewProps {
  onNavigateTab: (tab: string) => void;
  onOpenNewTx: () => void;
  onOpenNewBudget: () => void;
  onOpenNewGoal: () => void;
  onFundGoal: (goal: Goal) => void;
  onEditTx: (tx: Transaction) => void;
  onOpenSmartParser?: () => void;
}

/**
 * Overview.
 *
 * Same props, same context, same handlers as before — App.tsx did not change.
 * This file is composition only: every block is a component under
 * components/overview, and every colour and size comes from the foundation in
 * design/foundation.css. There are no hex literals in this screen.
 */
export const Overview: React.FC<OverviewProps> = ({
  onNavigateTab,
  onOpenNewTx,
  onOpenNewBudget,
  onOpenNewGoal,
  onFundGoal,
  onEditTx,
  onOpenSmartParser,
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
      <div className="space-y-5">
        <TicketStubSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <CardSkeleton rows={4} />
          <CardSkeleton rows={4} />
        </div>
      </div>
    );
  }

  const currency = summary?.currency || activeProfile?.displayCurrency || 'GHS';
  const recentTransactions = transactions.slice(0, 6);
  const transactionCount = summary?.transactionCount ?? transactions.length;

  /** Funding needs a vault to fund. With none, the honest action is to make one. */
  const handleFundVault = () => {
    if (goals.length > 0) {
      onFundGoal(goals[0]);
    } else {
      onOpenNewGoal();
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className="t-title">Overview</h1>
          <p className="t-meta mt-1">
            {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            {activeProfile?.name ? ` · ${activeProfile.name}` : ''}
          </p>
        </div>

        {onOpenSmartParser && (
          <button
            type="button"
            onClick={onOpenSmartParser}
            className="lg-btn lg-btn-sm flex items-center gap-2 border border-emerald-500/35 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 font-bold shadow-xs transition-all active:scale-95"
            aria-label="Launch MoMo SMS & Receipt AI Auto-Parser"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" strokeWidth={2} />
            <span>MoMo &amp; Receipt AI</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono-num font-semibold uppercase">Auto</span>
          </button>
        )}
      </header>

      {/* Prominent Quick-Scan Banner for MoMo SMS and Receipts */}
      {onOpenSmartParser && (
        <div className="lg-card p-3.5 sm:p-4 bg-gradient-to-r from-emerald-500/10 via-surface to-accent/10 border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-ink">MoMo SMS &amp; Receipt AI Auto-Parser</span>
                <span className="lg-tag text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 border-emerald-500/40">Ghana MoMo &amp; Banks</span>
              </div>
              <p className="text-[11px] text-ink-3 mt-0.5">
                Paste an MTN MoMo, Telecel Cash, or Bank SMS notification, or snap a photo of any receipt to auto-extract and log entries.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenSmartParser}
            className="lg-btn text-xs py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 shrink-0 shadow-sm transition-all active:scale-95 border border-emerald-400/25"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Scan or Paste SMS</span>
          </button>
        </div>
      )}

      <BalanceHero
        summary={summary}
        profile={activeProfile}
        onAddTransaction={onOpenNewTx}
        onFundVault={handleFundVault}
        onSetBudget={onOpenNewBudget}
        onViewReports={() => onNavigateTab('reports')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: what happened, and where it went */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <ActivityList
            transactions={recentTransactions}
            totalCount={transactionCount}
            onViewAll={() => onNavigateTab('transactions')}
            onEdit={onEditTx}
            onRecord={onOpenNewTx}
          />

          <CategorySpend
            transactions={transactions}
            currency={currency}
            onViewReport={() => onNavigateTab('reports')}
          />
        </div>

        {/* Right: what is planned, saved and owed */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <BudgetMonitor
            budgets={budgets}
            onManage={() => onNavigateTab('budgets')}
            onCreate={onOpenNewBudget}
          />

          <VaultList
            goals={goals}
            currency={currency}
            totalSaved={summary?.totalSavedInGoals ?? 0}
            onViewAll={() => onNavigateTab('goals')}
            onCreate={onOpenNewGoal}
            onFund={onFundGoal}
          />

          <DebtStrip
            owedToMe={summary?.totalOwedToMe ?? 0}
            iOwe={summary?.totalIOwe ?? 0}
            currency={currency}
            count={debts.length}
            onReview={() => onNavigateTab('debts')}
          />
        </div>
      </div>
    </div>
  );
};
