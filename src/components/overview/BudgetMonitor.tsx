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
 * Budget monitor. Identical inputs to before — b.spent, b.limit, b.percentage
 * straight from the server. Only the presentation of over/near/under changed,
 * and the state is now stated in words as well as colour so it survives a
 * colour-blind reader and a black-and-white print.
 */
export const BudgetMonitor: React.FC<BudgetMonitorProps> = ({
  budgets,
  onManage,
  onCreate,
}) => {
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
    >
      {budgets.length === 0 ? (
        <div className="py-6 text-center">
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
        <ul className="space-y-4">
          {shown.map((b) => {
            const spent = b.spent ?? 0;
            const pct = b.percentage ?? 0;
            const isOver = pct >= 100;
            const isNear = pct >= 80 && !isOver;
            const over = Math.max(0, spent - b.limit);

            const barColor = isOver
              ? 'var(--lg-neg)'
              : isNear
              ? 'var(--lg-warn)'
              : 'var(--lg-ink)';

            return (
              <li key={b.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="t-body text-ink font-semibold truncate">{b.category}</span>
                  <span className="num t-meta shrink-0">
                    <span className="text-ink font-bold">{formatAmount(spent)}</span>
                    <span className="text-ink-4"> / {formatAmount(b.limit)}</span>
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2.5">
                  <span
                    className="lg-track flex-1"
                    role="img"
                    aria-label={`${b.category}: ${pct}% of budget used`}
                  >
                    <span style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                  </span>
                  <span
                    className="num text-[0.8125rem] font-bold shrink-0 w-[42px] text-right"
                    style={{ color: barColor }}
                  >
                    {pct}%
                  </span>
                </div>

                {isOver ? (
                  <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-neg-soft px-2.5 py-1.5 text-[0.8125rem] font-semibold text-neg">
                    <AlertTriangle className="w-3.5 h-3.5 stroke-[1.8] shrink-0" />
                    <span className="num">{formatAmount(over)}</span> over budget
                  </p>
                ) : isNear ? (
                  <p className="mt-2 text-[0.8125rem] font-semibold text-warn">
                    Close to the limit
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
};
