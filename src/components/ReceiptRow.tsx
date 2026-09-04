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

  return (
    <div className="group flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#F7F5F2] transition-colors border-b border-[#E8E5DF] last:border-b-0">
      
      {/* Left Details: Category Dot, Note / Category, Date */}
      <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
        <div
          className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
            isIncome ? 'bg-[#15803D]/10 text-[#15803D]' : 'bg-[#B91C1C]/10 text-[#B91C1C]'
          }`}
        >
          {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: categoryColor }}
            />
            <span className="font-semibold text-xs sm:text-sm text-[#1A1A1A] truncate">
              {transaction.category}
            </span>
            {transaction.recurring !== 'none' && (
              <span
                title={`Recurring: ${transaction.recurring}`}
                className="inline-flex items-center text-[10px] px-1.5 py-0.2 rounded bg-[#F7F5F2] text-[#6B7280] font-mono-num border border-[#E8E5DF] shrink-0"
              >
                <Repeat className="w-2.5 h-2.5 mr-0.5" />
                <span className="hidden xs:inline">{transaction.recurring}</span>
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-1.5 text-[11px] text-[#6B7280] mt-0.5 pl-3.5">
            <span className="md:hidden font-mono-num text-[10px] shrink-0">{formatDate(transaction.date)}</span>
            {transaction.note && <span className="md:hidden text-[10px] shrink-0">•</span>}
            {transaction.note && (
              <span className="truncate">
                {transaction.note}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Signature Receipt Dotted Leader Line */}
      <div className="receipt-leader hidden sm:block opacity-60" />

      {/* Right Details: Date, Amount & Actions */}
      <div className="flex items-center space-x-2 sm:space-x-4 shrink-0 pl-1 sm:pl-2">
        <span className="hidden md:inline-block text-[11px] font-mono-num text-[#6B7280]">
          {formatDate(transaction.date)}
        </span>

        <div
          className={`text-right font-mono-num text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap ${
            isIncome ? 'text-[#15803D]' : 'text-[#1A1A1A]'
          }`}
        >
          {isIncome ? '+' : '-'} {formatCurrency(transaction.amount, transaction.currency)}
        </div>

        {showActions && (
          <div className="flex items-center space-x-0.5 sm:space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={() => onEdit(transaction)}
                className="p-1.5 sm:p-1 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#E8E5DF] rounded transition-colors"
                title="Edit Entry"
                aria-label="Edit transaction"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(transaction.id)}
                className="p-1.5 sm:p-1 text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded transition-colors"
                title="Delete Entry"
                aria-label="Delete transaction"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
