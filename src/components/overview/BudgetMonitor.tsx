import React from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { Budget } from '../../types';
import { formatAmount } from '../../design/tokens';
import { SectionCard } from './SectionCard';

interface BudgetMonitorProps {
  budgets: Budget[];
  onManage: () => void;
  onCreate: () => void;
}

/**
 * Budget monitor.
 *
 * Inputs are unchanged — b.spent, b.limit, b.percentage straight from the
 * server. What changed is that the row leads with the number you actually act
 * on: what is left. A bar makes you estimate a remainder the app already knows,
 * so the remainder is printed instead. State is carried in words as well as
 * colour, so it survives a colour-blind reader and a monochrome print.
 */
export const BudgetMonitor: React.FC<BudgetMonitorProps> = ({ budgets, onManage, onCreate }) => {
  const shown = budgets.slice(0, 4);

  return (
    <SectionCard
      title="Budgets"
      subtitle={
        budgets.length > 0
          ? `${shown.length} of ${budgets.length} ${budgets.length === 1 ? 'category' : 'categories'}`
          : undefined
      }
      action={budgets.length > 0 ? { label: 'Manage', onClick: onManage } : undefined}
      bodyClassName="p-0"
    >
      {budgets.length === 0 ? (
        <div className="py-6 px-5 text-center">
          <p className="t-body text-ink">No budgets set</p>
          <p className="t-meta mt-1.5">A budget is what turns spending into a limit.</p>
          <button
            onClick={onCreate}
            className="mt-4 inline-flex items-center gap-1.5 text-[0.875rem] font-bold text-accent hover:text-accent-hover transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[1.7]" />
            Set a budget
          </button>
        </div>
      ) : (
        <ul>
          {shown.map((b, i) => {
            const spent = b.spent ?? 0;
            const pct = b.percentage ?? 0;
            const isOver = pct >= 100;
            const isNear = pct >= 80 && !isOver;
            const remaining = b.limit - spent;

            return (
              <li
                key={b.id}
                className={`px-4 sm:px-5 py-3.5 hover:bg-sunken/60 transition-colors ${i > 0 ? 'border-t border-line' : ''}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="t-body text-ink font-semibold truncate min-w-0">
                    {b.category}
                  </span>
                  <span className="num t-meta shrink-0 whitespace-nowrap">
                    <span className="text-ink font-bold">{formatAmount(spent)}</span>
                    <span className="text-ink-4"> of {formatAmount(b.limit)}</span>
                  </span>
                </div>

                <div className="mt-1.5 flex items-center justify-between gap-3">
                  {isOver ? (
                    <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-neg min-w-0">
                      <AlertTriangle className="w-3.5 h-3.5 stroke-[1.8] shrink-0" />
                      <span className="num">{formatAmount(Math.abs(remaining))}</span> over
                    </span>
                  ) : (
                    <span
                      className={`text-[0.8125rem] font-semibold min-w-0 ${
                        isNear ? 'text-warn' : 'text-ink-3'
                      }`}
                    >
                      <span className="num">{formatAmount(remaining)}</span> left
                      {isNear ? ' · close to the limit' : ''}
                    </span>
                  )}

                  <span
                    className="num text-[0.8125rem] font-bold shrink-0"
                    style={{
                      color: isOver
                        ? 'var(--lg-neg)'
                        : isNear
                          ? 'var(--lg-warn)'
                          : 'var(--lg-ink-4)',
                    }}
                  >
                    {pct}%
                  </span>
                </div>

                {/* Subtle progress track */}
                <div className="mt-2 h-1 w-full bg-line/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      backgroundColor: isOver ? 'var(--lg-neg)' : isNear ? 'var(--lg-warn)' : 'var(--lg-accent)',
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
};
