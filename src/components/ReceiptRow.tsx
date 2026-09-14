import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Repeat, Trash2, Edit2 } from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency, formatDate, getCategoryColor } from '../design/tokens';
import { useHapticLongPress } from '../hooks/useHapticLongPress';
import { HapticPopoutModal } from './ios/HapticPopoutModal';

interface ReceiptRowProps {
  transaction: Transaction;
  displayCurrency: string;
  onEdit?: (tx: Transaction) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (tx: Transaction) => void;
  showActions?: boolean;
}

export const ReceiptRow: React.FC<ReceiptRowProps> = ({
  transaction,
  displayCurrency,
  onEdit,
  onDelete,
  onDuplicate,
  showActions = true,
}) => {
  const [isPopoutOpen, setIsPopoutOpen] = useState(false);

  const isIncome = transaction.type === 'income';
  const categoryColor = getCategoryColor(transaction.category);
  const amount = formatCurrency(transaction.amount, transaction.currency || displayCurrency);

  const longPressHandlers = useHapticLongPress({
    onLongPress: () => {
      setIsPopoutOpen(true);
    },
    onClick: () => {
      if (onEdit) onEdit(transaction);
    },
  });

  return (
    <>
      <div
        {...longPressHandlers}
        className="group flex items-center justify-between gap-3 sm:gap-4 border-b border-line px-3 sm:px-4 py-3 last:border-b-0 transition-all duration-150 hover:bg-sunken active:scale-[0.995] min-h-[56px] cursor-pointer select-none"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105 ${
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
            <div
              className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-80 sm:group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(transaction);
                  }}
                  className="lg-iconbtn active:scale-90 transition-transform"
                  title="Edit Entry"
                  aria-label="Edit transaction"
                >
                  <Edit2 className="h-3.5 w-3.5 text-ink-3 hover:text-ink" strokeWidth={1.7} />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(transaction.id);
                  }}
                  className="lg-iconbtn active:scale-90 transition-transform"
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

      {/* Floating iOS Peek & Pop Preview Modal */}
      <HapticPopoutModal
        transaction={transaction}
        displayCurrency={displayCurrency}
        isOpen={isPopoutOpen}
        onClose={() => setIsPopoutOpen(false)}
        onEdit={onEdit}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
      />
    </>
  );
};
