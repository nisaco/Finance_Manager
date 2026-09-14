import React from 'react';
import { ArrowUpRight, ArrowDownRight, Repeat, Trash2, Edit2 } from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency, formatDate, getCategoryColor } from '../design/tokens';

interface ReceiptRowProps {
  transaction: Transaction;
  displayCurrency: string;
  onEdit?: (tx: Transaction) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

export const ReceiptRow: React.FC<ReceiptRowProps> = ({
  transaction,
  displayCurrency,
  onEdit,
  onDelete,
  showActions = true,
}) => {
  const isIncome = transaction.type === 'income';
  const categoryColor = getCategoryColor(transaction.category);
  const amount = formatCurrency(transaction.amount, transaction.currency || displayCurrency);

  return (
    <div className="group flex items-center justify-between gap-3 sm:gap-4 border-b border-line px-3 sm:px-4 py-3 last:border-b-0 transition-colors hover:bg-sunken min-h-[56px]">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
            isIncome
              ? 'border-line bg-pos-soft text-pos'
              : 'border-line bg-neg-soft text-neg'
          }`}
          aria-hidden="true"
        >
          {isIncome ? (
            <ArrowUpRight className="h-4 w-4" strokeWidth={1.7} />
          ) : (
            <ArrowDownRight className="h-4 w-4" strokeWidth={1.7} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: categoryColor }}
              aria-hidden="true"
            />
            <span className="t-card min-w-0 truncate text-ink font-semibold">
              {transaction.category}
            </span>
            {transaction.recurring !== 'none' && (
              <span
                title={`Recurring: ${transaction.recurring}`}
                className="lg-tag shrink-0"
              >
                <Repeat className="mr-1 h-3 w-3" strokeWidth={1.7} aria-hidden="true" />
                <span className="hidden sm:inline">{transaction.recurring}</span>
              </span>
            )}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-3">
            <span className="num shrink-0">{formatDate(transaction.date)}</span>
            {transaction.note && (
              <>
                <span className="text-ink-4 hidden sm:inline" aria-hidden="true">·</span>
                <span className="min-w-0 truncate max-w-[200px] sm:max-w-[320px] text-ink-3">
                  {transaction.note}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3 pl-2">
        <div
          className={`num text-right text-sm font-bold tracking-tight whitespace-nowrap ${
            isIncome ? 'text-pos' : 'text-ink'
          }`}
        >
          <span className="mr-0.5">{isIncome ? '+' : '−'}</span>
          <span>{amount}</span>
        </div>

        {showActions && (
          <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-80 sm:group-hover:opacity-100">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(transaction)}
                className="lg-iconbtn"
                title="Edit Entry"
                aria-label="Edit transaction"
              >
                <Edit2 className="h-3.5 w-3.5 text-ink-3 hover:text-ink" strokeWidth={1.7} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(transaction.id)}
                className="lg-iconbtn"
                title="Delete Entry"
                aria-label="Delete transaction"
              >
                <Trash2 className="h-3.5 w-3.5 text-ink-3 hover:text-neg" strokeWidth={1.7} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
