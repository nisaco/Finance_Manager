import React from 'react';
import {
  ArrowRight,
  Banknote,
  Home,
  PiggyBank,
  Receipt,
  ShoppingBag,
  Smartphone,
  Utensils,
  Car,
  Plus,
} from 'lucide-react';
import { Transaction } from '../../types';
import { formatAmount, formatDayMonth } from '../../design/tokens';
import { SectionCard } from './SectionCard';

interface ActivityListProps {
  transactions: Transaction[];
  totalCount: number;
  onViewAll: () => void;
  onEdit: (tx: Transaction) => void;
  onRecord: () => void;
}

/**
 * Recent activity.
 *
 * Deliberately a separate component from the shared ReceiptRow, which
 * Transactions and History still use unchanged — this redesign does not touch
 * their rendering. Same data, same edit handler.
 */
export const ActivityList: React.FC<ActivityListProps> = ({
  transactions,
  totalCount,
  onViewAll,
  onEdit,
  onRecord,
}) => (
  <SectionCard
    title="Recent activity"
    subtitle={
      totalCount > 0
        ? `${transactions.length} of ${totalCount} ${totalCount === 1 ? 'entry' : 'entries'}`
        : undefined
    }
    action={
      totalCount > 0
        ? { label: 'View all', onClick: onViewAll, icon: 'chevron' }
        : undefined
    }
    bodyClassName="p-0"
  >
    {transactions.length === 0 ? (
      <EmptyActivity onRecord={onRecord} />
    ) : (
      <>
        <ul className="divide-y divide-line">
          {transactions.map((tx) => (
            <ActivityRow key={tx.id} tx={tx} onEdit={onEdit} />
          ))}
        </ul>
        <div className="border-t border-line px-5 py-3.5 text-center">
          <button
            onClick={onRecord}
            className="inline-flex items-center gap-1.5 text-[0.875rem] font-bold text-accent hover:text-accent-hover transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded"
          >
            <Plus className="w-4 h-4 stroke-[1.7]" />
            Record a new entry
          </button>
        </div>
      </>
    )}
  </SectionCard>
);

const ActivityRow: React.FC<{
  tx: Transaction;
  onEdit: (tx: Transaction) => void;
}> = ({ tx, onEdit }) => {
  const isIncome = tx.type === 'income';
  const Icon = iconForCategory(tx.category);
  const label = tx.description?.trim() || tx.note?.trim() || tx.category;

  return (
    <li>
      <button
        type="button"
        onClick={() => onEdit(tx)}
        className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left hover:bg-sunken transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <span
          aria-hidden="true"
          className="w-9 h-9 rounded-[10px] border border-line bg-sunken flex items-center justify-center text-ink-3 shrink-0"
        >
          <Icon className="w-[17px] h-[17px] stroke-[1.7]" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block t-card truncate">{label}</span>
          <span className="mt-1 flex items-center gap-2 min-w-0">
            <span className="t-meta truncate">{tx.category}</span>
            <i aria-hidden="true" className="w-1 h-1 rounded-full bg-ink-4 shrink-0" />
            <span className="t-meta num shrink-0">{formatDayMonth(tx.date)}</span>
            {tx.recurring && tx.recurring !== 'none' ? (
              <span className="lg-tag">{tx.recurring}</span>
            ) : null}
          </span>
        </span>

        <span
          className={`num text-[1.0625rem] font-bold shrink-0 tracking-[-0.01em] ${
            isIncome ? 'text-pos' : 'text-ink'
          }`}
        >
          {isIncome ? '+' : '−'} {formatAmount(tx.amount)}
        </span>
      </button>
    </li>
  );
};

const EmptyActivity: React.FC<{ onRecord: () => void }> = ({ onRecord }) => (
  <div className="px-6 py-14 text-center">
    <span
      aria-hidden="true"
      className="mx-auto w-11 h-11 rounded-xl border border-line bg-sunken flex items-center justify-center text-ink-4"
    >
      <Receipt className="w-5 h-5 stroke-[1.7]" />
    </span>
    <p className="t-card mt-4">Nothing recorded yet</p>
    <p className="t-meta mt-1.5 max-w-[34ch] mx-auto">
      Your income and spending will appear here as soon as you add the first
      entry.
    </p>
    <button
      onClick={onRecord}
      className="mt-5 inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-solid hover:bg-solid-hover text-on-solid text-[0.875rem] font-bold transition-colors"
    >
      <Plus className="w-4 h-4 stroke-[1.7]" />
      Record entry
      <ArrowRight className="w-4 h-4 stroke-[1.7]" />
    </button>
  </div>
);

/** One icon set, one stroke weight, never filled, never decorative. */
function iconForCategory(category: string) {
  const c = (category || '').toLowerCase();
  if (/rent|hous|util|mortgage/.test(c)) return Home;
  if (/food|dining|restaurant|leisure|groc/.test(c)) return /groc/.test(c) ? ShoppingBag : Utensils;
  if (/transport|fuel|car|uber|travel/.test(c)) return Car;
  if (/tech|software|subscription|phone|airtime|data/.test(c)) return Smartphone;
  if (/saving|vault|goal|invest/.test(c)) return PiggyBank;
  if (/salary|income|consult|retainer|sale|revenue/.test(c)) return Banknote;
  return Receipt;
}
