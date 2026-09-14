import React from 'react';
import { Plus, Edit2, Trash2, ShieldAlert, AlertCircle, CheckCircle } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { Budget } from '../types';
import { formatCurrency } from '../design/tokens';
import { api } from '../api/client';

interface BudgetsPageProps {
  onOpenNewBudget: () => void;
  onEditBudget: (budget: Budget) => void;
}

/**
 * Budgets.
 *
 * Every figure, flag and handler is the one that was here before — b.spent,
 * b.limit, b.percentage, b.rawSpent, b.status, b.isExceeded, api.deleteBudget.
 * What changed is that the page no longer draws a bar for a number it can
 * simply print. A bar asks you to estimate a remainder; the remainder is the
 * thing you act on, so the remainder is the headline.
 */
export const BudgetsPage: React.FC<BudgetsPageProps> = ({ onOpenNewBudget, onEditBudget }) => {
  const { activeProfile, budgets, refreshData, notify } = useLedger();
  const currency = activeProfile?.displayCurrency || 'GHS';

  const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalBudgetSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const overallPercentage =
    totalBudgetLimit > 0 ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100) : 0;

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

  const remainingOverall = Math.max(0, totalBudgetLimit - totalBudgetSpent);
  const overallTone =
    overallPercentage >= 100 ? 'neg' : overallPercentage >= 80 ? 'warn' : 'ink';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ---- Page header ---- */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="t-title">Budgets</h1>
          <p className="t-meta mt-1">
            Monthly limits by category
            {activeProfile?.name ? ` · ${activeProfile.name}` : ''}
          </p>
        </div>

        <button onClick={onOpenNewBudget} className="lg-btn lg-btn-solid shrink-0">
          <Plus className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
          New budget
        </button>
      </header>

      {/* ---- The month in one card ---- */}
      <section className="lg-card p-5 sm:p-6">
        <p className="t-eyebrow">This month across all budgets</p>

        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          <span className="num text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-[-0.02em]">
            {formatCurrency(totalBudgetSpent, currency)}
          </span>
          <span className="num t-body text-ink-3">
            of {formatCurrency(totalBudgetLimit, currency)}
          </span>
        </div>

        <div className="mt-4 pt-4 border-t border-line grid grid-cols-2 gap-4">
          <div>
            <p className="t-eyebrow">Still available</p>
            <p className="num mt-1.5 text-[1.0625rem] font-bold">
              {formatCurrency(remainingOverall, currency)}
            </p>
          </div>
          <div>
            <p className="t-eyebrow">Used</p>
            <p
              className="num mt-1.5 text-[1.0625rem] font-bold"
              style={{
                color:
                  overallTone === 'neg'
                    ? 'var(--lg-neg)'
                    : overallTone === 'warn'
                      ? 'var(--lg-warn)'
                      : 'var(--lg-ink)',
              }}
            >
              {overallPercentage}%
            </p>
          </div>
        </div>
      </section>

      {/* ---- The budgets ---- */}
      {budgets.length === 0 ? (
        <section className="lg-card p-8 sm:p-12 text-center">
          <p className="t-card">No budgets yet</p>
          <p className="t-meta mt-1.5 max-w-sm mx-auto">
            A budget is what turns spending into a limit. Set one for the category you
            overspend most.
          </p>
          <button onClick={onOpenNewBudget} className="lg-btn lg-btn-accent mt-5">
            <Plus className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
            Set your first budget
          </button>
        </section>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {budgets.map((b) => {
            const spent = b.spent || 0;
            const pct = b.percentage || 0;
            const isFrozen = b.status === 'exceeded_locked' || b.isExceeded;
            const isOver = pct >= 100 || isFrozen;
            const isNear = pct >= 80 && !isOver;

            const tone = isOver ? 'neg' : isNear ? 'warn' : 'ink';
            const toneColor =
              tone === 'neg'
                ? 'var(--lg-neg)'
                : tone === 'warn'
                  ? 'var(--lg-warn)'
                  : 'var(--lg-ink)';

            const remaining = b.limit - spent;

            return (
              <article key={b.id} className="lg-card lg-card-interactive p-4 sm:p-5 flex flex-col">
                {/* Name and controls */}
                <div className="flex items-start justify-between gap-2">
                  <h2 className="t-card min-w-0 truncate">{b.category}</h2>

                  <div className="flex items-center gap-0.5 shrink-0 -mt-1.5 -mr-1.5">
                    <button
                      onClick={() => onEditBudget(b)}
                      className="lg-iconbtn"
                      title="Edit budget"
                      aria-label={`Edit the ${b.category} budget`}
                    >
                      <Edit2 className="w-[17px] h-[17px]" strokeWidth={1.7} />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="lg-iconbtn hover:text-neg"
                      title="Delete budget"
                      aria-label={`Delete the ${b.category} budget`}
                    >
                      <Trash2 className="w-[17px] h-[17px]" strokeWidth={1.7} />
                    </button>
                  </div>
                </div>

                {/* Status, in words as well as colour */}
                <div className="mt-2">
                  {isFrozen ? (
                    <span
                      className="lg-tag"
                      style={{
                        background: 'var(--lg-neg-soft)',
                        borderColor: 'transparent',
                        color: 'var(--lg-neg)',
                      }}
                    >
                      <ShieldAlert className="w-3 h-3 mr-1" strokeWidth={1.8} aria-hidden="true" />
                      Frozen at 105%
                    </span>
                  ) : isOver ? (
                    <span
                      className="lg-tag"
                      style={{
                        background: 'var(--lg-neg-soft)',
                        borderColor: 'transparent',
                        color: 'var(--lg-neg)',
                      }}
                    >
                      <ShieldAlert className="w-3 h-3 mr-1" strokeWidth={1.8} aria-hidden="true" />
                      Over the limit
                    </span>
                  ) : isNear ? (
                    <span
                      className="lg-tag"
                      style={{
                        background: 'var(--lg-warn-soft)',
                        borderColor: 'transparent',
                        color: 'var(--lg-warn)',
                      }}
                    >
                      <AlertCircle className="w-3 h-3 mr-1" strokeWidth={1.8} aria-hidden="true" />
                      Close to the limit
                    </span>
                  ) : (
                    <span className="lg-tag lg-tag-pos">
                      <CheckCircle className="w-3 h-3 mr-1" strokeWidth={1.8} aria-hidden="true" />
                      Within limit
                    </span>
                  )}
                </div>

                {/* The number you act on */}
                <div className="mt-4">
                  <p className="t-eyebrow">{isOver ? 'Over by' : 'Left to spend'}</p>
                  <p
                    className="num mt-1 text-[clamp(1.25rem,4vw,1.5rem)] font-bold tracking-[-0.02em]"
                    style={{ color: isOver ? 'var(--lg-neg)' : 'var(--lg-ink)' }}
                  >
                    {formatCurrency(Math.abs(remaining), b.currency)}
                  </p>
                </div>

                {/* The supporting figures */}
                <dl className="mt-4 pt-3.5 border-t border-line space-y-2 text-[0.8125rem]">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-3">{isFrozen ? 'Spent, capped' : 'Spent'}</dt>
                    <dd className="num font-bold">{formatCurrency(spent, b.currency)}</dd>
                  </div>

                  {isFrozen && b.rawSpent && b.rawSpent > spent && (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-4">Actual outflow</dt>
                      <dd className="num text-ink-4 line-through">
                        {formatCurrency(b.rawSpent, b.currency)}
                      </dd>
                    </div>
                  )}

                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-3">Limit</dt>
                    <dd className="num text-ink-3">{formatCurrency(b.limit, b.currency)}</dd>
                  </div>

                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-3">Used</dt>
                    <dd className="num font-bold" style={{ color: toneColor }}>
                      {pct}%
                    </dd>
                  </div>
                </dl>

                {isFrozen && (
                  <p className="t-meta mt-3.5 rounded-lg bg-neg-soft px-3 py-2.5" style={{ color: 'var(--lg-neg)' }}>
                    Further spending in {b.category} is excluded from this budget's totals.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
