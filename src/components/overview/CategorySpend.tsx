import React from 'react';
import { Transaction } from '../../types';
import { currencySymbol, formatAmount } from '../../design/tokens';
import { SectionCard } from './SectionCard';

interface CategorySpendProps {
  transactions: Transaction[];
  currency: string;
  onViewReport: () => void;
}

const MAX_ROWS = 6;

/**
 * Where this month's money went.
 *
 * Derived entirely on the client from the transactions already in context —
 * no new endpoint, no extra request, nothing added to the server. If the
 * numbers here disagree with Reports, the transactions list is the cause.
 */
export const CategorySpend: React.FC<CategorySpendProps> = ({
  transactions,
  currency,
  onViewReport,
}) => {
  const { rows, total, monthLabel, categoryCount } = React.useMemo(
    () => summarise(transactions),
    [transactions]
  );

  const symbol = currencySymbol(currency);

  return (
    <SectionCard
      title="Where the money went"
      subtitle={
        total > 0
          ? `${monthLabel} · ${symbol} ${formatAmount(total)} across ${categoryCount} ${
              categoryCount === 1 ? 'category' : 'categories'
            }`
          : monthLabel
      }
      action={total > 0 ? { label: 'Full report', onClick: onViewReport, icon: 'chevron' } : undefined}
    >
      {total === 0 ? (
        <p className="t-meta py-6 text-center">
          No spending recorded this month.
        </p>
      ) : (
        <ul className="space-y-3.5">
          {rows.map((row) => {
            const share = Math.round((row.amount / total) * 100);
            const relative = Math.max(2, Math.round((row.amount / rows[0].amount) * 100));

            return (
              <li key={row.category} className="flex items-center gap-3">
                <span className="t-body text-ink flex items-center gap-2.5 min-w-0 w-[38%]">
                  <i
                    aria-hidden="true"
                    className="w-[7px] h-[7px] rounded-full shrink-0"
                    style={{ background: row.isRest ? 'var(--lg-ink-4)' : 'var(--lg-ink)' }}
                  />
                  <span className="truncate">{row.category}</span>
                </span>

                <span className="flex-1 min-w-0">
                  <span className="lg-track" role="img" aria-label={`${row.category}: ${share}% of spending`}>
                    <span
                      style={{
                        width: `${relative}%`,
                        background: row.isRest ? 'var(--lg-line-strong)' : 'var(--lg-ink)',
                      }}
                    />
                  </span>
                </span>

                <span className="num text-[0.9375rem] font-bold text-ink shrink-0 w-[92px] text-right">
                  {formatAmount(row.amount)}
                </span>
                <span className="num t-meta shrink-0 w-[34px] text-right">{share}%</span>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
};

interface Row {
  category: string;
  amount: number;
  isRest?: boolean;
}

function summarise(transactions: Transaction[]): {
  rows: Row[];
  total: number;
  monthLabel: string;
  categoryCount: number;
} {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const monthLabel = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const totals = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const date = new Date(tx.date);
    if (Number.isNaN(date.getTime())) continue;
    if (date.getMonth() !== month || date.getFullYear() !== year) continue;

    const key = tx.category?.trim() || 'Uncategorised';
    totals.set(key, (totals.get(key) || 0) + Math.abs(tx.amount || 0));
  }

  const sorted = [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const total = sorted.reduce((sum, r) => sum + r.amount, 0);

  let rows: Row[] = sorted.slice(0, MAX_ROWS);
  const rest = sorted.slice(MAX_ROWS);
  if (rest.length > 0) {
    rows = [
      ...rows,
      {
        category: `Everything else (${rest.length})`,
        amount: rest.reduce((sum, r) => sum + r.amount, 0),
        isRest: true,
      },
    ];
  }

  return { rows, total, monthLabel, categoryCount: sorted.length };
}
