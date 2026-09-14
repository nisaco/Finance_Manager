import React from 'react';
import { useLedger } from '../context/LedgerContext';
import { CardSkeleton, TicketStubSkeleton } from '../components/Skeletons';
import { BalanceHero } from '../components/overview/BalanceHero';
import { ActivityList } from '../components/overview/ActivityList';
import { CategorySpend } from '../components/overview/CategorySpend';
import { BudgetMonitor } from '../components/overview/BudgetMonitor';
import { VaultList } from '../components/overview/VaultList';
import { DebtStrip } from '../components/overview/DebtStrip';
import { Goal, Transaction } from '../types';

interface OverviewProps {
  onNavigateTab: (tab: string) => void;
  onOpenNewTx: () => void;
  onOpenNewBudget: () => void;
  onOpenNewGoal: () => void;
  onFundGoal: (goal: Goal) => void;
  onEditTx: (tx: Transaction) => void;
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
      </header>

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
