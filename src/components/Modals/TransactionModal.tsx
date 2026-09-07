import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Tag, Calendar, FileText, Repeat } from 'lucide-react';
import { Transaction } from '../../types';
import { useLedger } from '../../context/LedgerContext';
import { api } from '../../api/client';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Transaction | null;
}

const DEFAULT_INCOME_CATEGORIES = [
  'Consulting & Retainer',
  'Salary & Wages',
  'Side Project Sales',
  'Investments & Dividends',
  'Other Income',
];

const DEFAULT_EXPENSE_CATEGORIES = [
  'Housing & Utilities',
  'Groceries & Household',
  'Transport & Fuel',
  'Dining & Leisure',
  'Health & Wellness',
  'Tech & Software',
  'Savings & Investments',
  'Debt Repayments',
  'General Expense',
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  initialData,
}) => {
  const { activeProfile, refreshData, notify } = useLedger();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(DEFAULT_EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [recurring, setRecurring] = useState<'none' | 'weekly' | 'monthly'>('none');
  const [currency, setCurrency] = useState('GHS');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setAmount(initialData.amount.toString());
      setCategory(initialData.category);
      setDate(initialData.date);
      setNote(initialData.note);
      setRecurring(initialData.recurring);
      setCurrency(initialData.currency);
    } else {
      setType('expense');
      setAmount('');
      setCategory(DEFAULT_EXPENSE_CATEGORIES[0]);
      setDate(new Date().toISOString().split('T')[0]);
      setNote('');
      setRecurring('none');
      setCurrency(activeProfile?.displayCurrency || 'GHS');
    }
  }, [initialData, isOpen, activeProfile]);

  const handleTypeChange = (newType: 'expense' | 'income') => {
    setType(newType);
    setCategory(newType === 'income' ? DEFAULT_INCOME_CATEGORIES[0] : DEFAULT_EXPENSE_CATEGORIES[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      notify('Please enter a valid amount', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (initialData) {
        const res: any = await api.updateTransaction(initialData.id, {
          type,
          amount: numAmount,
          currency,
          category,
          date,
          note,
          recurring,
        });
        if (res?.budgetExceededAlert?.message) {
          notify(res.budgetExceededAlert.message, 'error');
        } else {
          notify('Transaction updated successfully');
        }
      } else {
        const res: any = await api.createTransaction({
          profileId: activeProfile.id,
          type,
          amount: numAmount,
          currency,
          category,
          date,
          note,
          recurring,
        });
        if (res?.budgetExceededAlert?.message) {
          notify(res.budgetExceededAlert.message, 'error');
        } else {
          notify('Transaction added to ledger');
        }
      }
      await refreshData();
      onClose();
    } catch (err: any) {
      notify(err.message || 'Failed to save transaction', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const categoryList = type === 'income' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A1A1A]/40 backdrop-blur-xs">
      <div className="bg-white border border-[#E8E5DF] rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#E8E5DF] shrink-0">
          <h2 className="font-display text-base sm:text-lg font-bold text-[#1A1A1A]">
            {initialData ? 'Edit Ledger Entry' : 'Record Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-1 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F7F5F2] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Income vs Expense Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#F7F5F2] rounded-lg border border-[#E8E5DF]">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`flex items-center justify-center space-x-2 py-2 rounded text-xs font-bold transition-all ${
                type === 'expense'
                  ? 'bg-[#DC2626] text-white shadow-sm'
                  : 'text-[#6B7280] hover:text-[#1A1A1A]'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Expense (Outflow)</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`flex items-center justify-center space-x-2 py-2 rounded text-xs font-bold transition-all ${
                type === 'income'
                  ? 'bg-[#15803D] text-white shadow-sm'
                  : 'text-[#6B7280] hover:text-[#1A1A1A]'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Income (Inflow)</span>
            </button>
          </div>

          {/* Amount & Currency */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
              Amount & Currency
            </label>
            <div className="flex rounded-lg overflow-hidden border border-[#E8E5DF] focus-within:border-[#1A1A1A]">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-[#F7F5F2] text-[#1A1A1A] px-3 py-2 text-xs font-mono-num font-bold border-r border-[#E8E5DF] focus:outline-none"
              >
                <option value="GHS">GHS (GH₵)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="NGN">NGN (₦)</option>
              </select>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 text-base font-mono-num font-bold focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-xs font-medium focus:outline-none focus:border-[#1A1A1A]"
            >
              {categoryList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Recurring */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-xs font-mono-num focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                Recurring
              </label>
              <select
                value={recurring}
                onChange={(e) => setRecurring(e.target.value as any)}
                className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-xs focus:outline-none focus:border-[#1A1A1A]"
              >
                <option value="none">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {/* Note / Description */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
              Description / Receipt Note
            </label>
            <input
              type="text"
              placeholder="e.g. Fiber internet bill or client invoice"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-xs focus:outline-none focus:border-[#1A1A1A]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E8E5DF]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-bold text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F7F5F2] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] rounded-md text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Entry' : 'Post to Ledger'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
