import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/60 backdrop-blur-sm transition-opacity">
      <div className="lg-card w-full max-w-md rounded-t-[24px] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in-50 slide-in-from-bottom-6 sm:zoom-in-95 duration-200 p-0 border-line">
        {/* iOS Drag Handle on mobile */}
        <div className="w-10 h-1 rounded-full bg-ink-4/40 mx-auto mt-2.5 -mb-1 sm:hidden" aria-hidden="true" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <h2 className="font-display text-base font-bold text-ink">
            {initialData ? 'Edit Ledger Entry' : 'Record Transaction'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-sunken active:scale-90 transition-all"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Income vs Expense Toggle */}
          <div className="lg-seg">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`lg-seg-btn flex items-center justify-center space-x-1.5 ${
                type === 'expense' ? 'active text-neg' : ''
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Expense (Outflow)</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`lg-seg-btn flex items-center justify-center space-x-1.5 ${
                type === 'income' ? 'active text-pos' : ''
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Income (Inflow)</span>
            </button>
          </div>

          {/* Amount & Currency */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
              Amount &amp; Currency
            </label>
            <div className="flex rounded-xl overflow-hidden border border-line focus-within:border-ink/40 bg-sunken">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-surface text-ink px-3 py-2 text-xs font-mono-num font-bold border-r border-line focus:outline-none"
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
                className="w-full bg-transparent text-ink px-3 py-2 text-base font-mono-num num font-bold focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full lg-select text-xs"
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
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full lg-input text-xs font-mono-num num"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
                Recurring
              </label>
              <select
                value={recurring}
                onChange={(e) => setRecurring(e.target.value as any)}
                className="w-full lg-select text-xs"
              >
                <option value="none">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {/* Note / Description */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
              Description / Receipt Note
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly utility bill or client invoice"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full lg-input text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="lg-btn lg-btn-quiet text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="lg-btn lg-btn-solid text-xs"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Entry' : 'Post to Ledger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
