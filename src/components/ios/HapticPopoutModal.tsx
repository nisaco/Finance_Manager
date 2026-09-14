import React, { useEffect } from 'react';
import { Edit2, Copy, Trash2, Repeat, X, Check, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Transaction } from '../../types';
import { formatCurrency, formatDate, getCategoryColor } from '../../design/tokens';

interface HapticPopoutModalProps {
  transaction: Transaction | null;
  displayCurrency: string;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (tx: Transaction) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (tx: Transaction) => void;
}

export const HapticPopoutModal: React.FC<HapticPopoutModalProps> = ({
  transaction,
  displayCurrency,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !transaction) return null;

  const isIncome = transaction.type === 'income';
  const categoryColor = getCategoryColor(transaction.category);
  const amountStr = formatCurrency(transaction.amount, transaction.currency || displayCurrency);

  const handleCopy = () => {
    const text = `${transaction.category} - ${isIncome ? '+' : '-'}${amountStr} (${formatDate(
      transaction.date
    )})${transaction.note ? ` - ${transaction.note}` : ''}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-md transition-all animate-in fade-in-50 duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm flex flex-col gap-3 animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating iOS Peek Card */}
        <div className="lg-card p-5 bg-surface/95 backdrop-blur-xl border border-line-strong shadow-2xl rounded-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                  isIncome
                    ? 'border-line bg-pos-soft text-pos'
                    : 'border-line bg-neg-soft text-neg'
                }`}
              >
                {isIncome ? (
                  <ArrowUpRight className="h-6 w-6" strokeWidth={2} />
                ) : (
                  <ArrowDownRight className="h-6 w-6" strokeWidth={2} />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: categoryColor }}
                  />
                  <h3 className="t-card text-ink font-bold truncate">{transaction.category}</h3>
                </div>
                <p className="t-meta text-ink-3 mt-0.5 num">{formatDate(transaction.date)}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg-iconbtn -mt-2 -mr-2 text-ink-4 hover:text-ink active:scale-90"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-line flex items-baseline justify-between">
            <span className="t-eyebrow">Amount</span>
            <span
              className={`num text-xl font-bold tracking-tight ${
                isIncome ? 'text-pos' : 'text-ink'
              }`}
            >
              {isIncome ? '+' : '−'} {amountStr}
            </span>
          </div>

          {transaction.note && (
            <div className="mt-2.5 pt-2.5 border-t border-line/60">
              <p className="t-eyebrow">Note</p>
              <p className="t-body text-ink-2 text-xs mt-1 italic">"{transaction.note}"</p>
            </div>
          )}

          {transaction.recurring && transaction.recurring !== 'none' && (
            <div className="mt-2.5 pt-2 border-t border-line/60 flex items-center justify-between">
              <span className="t-eyebrow">Cadence</span>
              <span className="lg-tag">{transaction.recurring}</span>
            </div>
          )}
        </div>

        {/* Floating iOS Quick Actions Menu */}
        <div className="bg-surface/95 backdrop-blur-xl border border-line-strong rounded-2xl shadow-xl overflow-hidden divide-y divide-line">
          {onEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit(transaction);
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left text-sm font-semibold text-ink hover:bg-sunken active:bg-sunken/80 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Edit2 className="w-4 h-4 text-accent" strokeWidth={1.8} />
                Edit Transaction
              </span>
              <span className="t-meta text-xs">Full Details</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left text-sm font-semibold text-ink hover:bg-sunken active:bg-sunken/80 transition-colors"
          >
            <span className="flex items-center gap-2.5">
              {copied ? (
                <Check className="w-4 h-4 text-pos" strokeWidth={2} />
              ) : (
                <Copy className="w-4 h-4 text-ink-3" strokeWidth={1.8} />
              )}
              {copied ? 'Copied to Clipboard' : 'Copy Summary'}
            </span>
            <span className="t-meta text-xs">Shareable</span>
          </button>

          {onDuplicate && (
            <button
              onClick={() => {
                onClose();
                onDuplicate(transaction);
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left text-sm font-semibold text-ink hover:bg-sunken active:bg-sunken/80 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Repeat className="w-4 h-4 text-ink-3" strokeWidth={1.8} />
                Duplicate Entry
              </span>
              <span className="t-meta text-xs">New Copy</span>
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => {
                onClose();
                onDelete(transaction.id);
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left text-sm font-semibold text-neg hover:bg-neg-soft active:bg-neg-soft/80 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Trash2 className="w-4 h-4" strokeWidth={1.8} />
                Delete Entry
              </span>
              <span className="t-meta text-neg text-xs font-bold">Remove</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

