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
        <ul className="-mx-1">
          {rows.map((row, i) => {
            const share = Math.round((row.amount / total) * 100);

            return (
              <li
                key={row.category}
                className={`flex items-baseline gap-3 px-1 py-3 ${
                  i > 0 ? 'border-t border-line' : ''
                }`}
              >
                {/* Rank instead of a bar. It says the same thing — this is the
                    biggest, this is the next — in a fraction of the space. */}
                <span className="num t-meta w-[1.25rem] shrink-0 tabular-nums">{i + 1}</span>

                <span className="t-body text-ink min-w-0 flex-1 truncate">{row.category}</span>

                <span className="text-right shrink-0">
                  <span className="num block text-[0.9375rem] font-bold text-ink">
                    {formatAmount(row.amount)}
                  </span>
                  <span className="num t-meta block">{share}% of spend</span>
                </span>
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
