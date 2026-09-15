import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Transaction } from '../../types';
import { useLedger } from '../../context/LedgerContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import {
  queueOfflineMutation,
  loadOfflineLedgerData,
  saveOfflineLedgerData,
} from '../../services/offlineSync';

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
  const { user } = useAuth();

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
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

      if (isOffline) {
        if (initialData) {
          queueOfflineMutation(user?.id || 'anonymous', activeProfile.id, 'UPDATE_TRANSACTION', {
            id: initialData.id,
            type,
            amount: numAmount,
            currency,
            category,
            date,
            note,
            recurring,
          });
          notify('Transaction updated locally · Will sync when reconnected');
        } else {
          const tempId = `offline_${Date.now()}`;
          const newTxPayload = {
            profileId: activeProfile.id,
            type,
            amount: numAmount,
            currency,
            category,
            date,
            note,
            recurring,
          };
          queueOfflineMutation(user?.id || 'anonymous', activeProfile.id, 'CREATE_TRANSACTION', newTxPayload);

          if (user?.id) {
            const cached = loadOfflineLedgerData(user.id, activeProfile.id);
            if (cached) {
              const optimisticTx: Transaction = {
                id: tempId,
                ...newTxPayload,
                createdAt: new Date().toISOString(),
                pendingSync: true,
              };
              cached.transactions = [optimisticTx, ...cached.transactions];
              saveOfflineLedgerData(user.id, activeProfile.id, cached);
            }
          }
          notify('Transaction recorded offline · Will sync when reconnected');
        }
        await refreshData();
        onClose();
        return;
      }

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
      // If network failure occurred in-flight, fallback to offline queue
      const isNetworkErr = err?.message?.toLowerCase().includes('fetch') || err?.message?.toLowerCase().includes('network');
      if (isNetworkErr) {
        const tempId = `offline_${Date.now()}`;
        const newTxPayload = {
          profileId: activeProfile.id,
          type,
          amount: numAmount,
          currency,
          category,
          date,
          note,
          recurring,
        };
        queueOfflineMutation(user?.id || 'anonymous', activeProfile.id, 'CREATE_TRANSACTION', newTxPayload);
        if (user?.id) {
          const cached = loadOfflineLedgerData(user.id, activeProfile.id);
          if (cached) {
            const optimisticTx: Transaction = {
              id: tempId,
              ...newTxPayload,
              createdAt: new Date().toISOString(),
              pendingSync: true,
            };
            cached.transactions = [optimisticTx, ...cached.transactions];
            saveOfflineLedgerData(user.id, activeProfile.id, cached);
          }
        }
        notify('Network dropped. Transaction queued offline · Will sync when reconnected');
        await refreshData();
        onClose();
      } else {
        notify(err.message || 'Failed to save transaction', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const categoryList = type === 'income' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/60 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="lg-card relative z-10 w-full max-w-lg rounded-t-[24px] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] border border-line bg-surface p-0 pt-[max(env(safe-area-inset-top,0px),0.25rem)] sm:pt-0 animate-in fade-in-50 slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        {/* iOS Drag Handle on mobile */}
        <div className="w-10 h-1 rounded-full bg-ink-4/35 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" aria-hidden="true" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="lg-row-icon !w-8 !h-8 !rounded-lg shrink-0"
              aria-hidden="true"
              style={{
                background: type === 'income' ? 'var(--lg-pos-soft)' : 'var(--lg-neg-soft)',
                color: type === 'income' ? 'var(--lg-pos)' : 'var(--lg-neg)',
              }}
            >
              {type === 'expense' ? (
                <ArrowDownRight className="w-4 h-4" strokeWidth={2} />
              ) : (
                <ArrowUpRight className="w-4 h-4" strokeWidth={2} />
              )}
            </span>
            <div className="min-w-0">
              <h2 id="tx-modal-title" className="t-card font-bold truncate">
                {initialData ? 'Edit Ledger Entry' : 'Record Transaction'}
              </h2>
              <p className="t-meta text-[11px] truncate">
                {type === 'expense' ? 'Record money spent / outflow' : 'Record money received / inflow'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="lg-iconbtn shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" strokeWidth={1.7} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain touch-pan-y">
          {/* Income vs Expense Toggle */}
          <div className="lg-seg" role="tablist" aria-label="Transaction Type">
            <button
              type="button"
              role="tab"
              aria-selected={type === 'expense'}
              onClick={() => handleTypeChange('expense')}
              className={`lg-seg-btn flex items-center justify-center gap-2 ${
                type === 'expense' ? 'active !text-neg font-semibold' : ''
              }`}
            >
              <ArrowDownRight className="w-4 h-4" strokeWidth={2} />
              <span>Expense (Money out)</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={type === 'income'}
              onClick={() => handleTypeChange('income')}
              className={`lg-seg-btn flex items-center justify-center gap-2 ${
                type === 'income' ? 'active !text-pos font-semibold' : ''
              }`}
            >
              <ArrowUpRight className="w-4 h-4" strokeWidth={2} />
              <span>Income (Money in)</span>
            </button>
          </div>

          {/* Amount & Currency */}
          <div>
            <label className="lg-label" htmlFor="tx-amount-input">
              Amount &amp; Currency
            </label>
            <div className="flex items-stretch rounded-xl border border-line focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10 bg-sunken transition-all overflow-hidden">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-surface text-ink px-3 py-2.5 text-xs font-mono-num font-bold border-r border-line focus:outline-none cursor-pointer"
                aria-label="Select currency"
              >
                <option value="GHS">GHS (GH₵)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="NGN">NGN (₦)</option>
              </select>
              <div className="relative flex-1 flex items-center">
                <input
                  id="tx-amount-input"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent text-ink px-3.5 py-2.5 text-xl font-bold font-mono-num num tracking-tight focus:outline-none placeholder:text-ink-4"
                  autoFocus
                />
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="lg-label" htmlFor="tx-category-select">
              Category
            </label>
            <select
              id="tx-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="lg-select w-full text-xs font-medium"
            >
              {categoryList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="lg-label" htmlFor="tx-date-input">
                Date
              </label>
              <input
                id="tx-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="lg-input w-full text-xs font-mono-num num"
                required
              />
            </div>

            <div>
              <label className="lg-label" htmlFor="tx-recurring-select">
                Schedule
              </label>
              <select
                id="tx-recurring-select"
                value={recurring}
                onChange={(e) => setRecurring(e.target.value as any)}
                className="lg-select w-full text-xs font-medium"
              >
                <option value="none">One-off entry</option>
                <option value="weekly">Repeats weekly</option>
                <option value="monthly">Repeats monthly</option>
              </select>
            </div>
          </div>

          {/* Description / Note */}
          <div>
            <label className="lg-label" htmlFor="tx-note-input">
              Description / Receipt Note <span className="text-ink-4 font-normal">(Optional)</span>
            </label>
            <input
              id="tx-note-input"
              type="text"
              placeholder="e.g. Monthly utility bill or client invoice"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="lg-input w-full text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 pb-[max(env(safe-area-inset-bottom,0px),0.5rem)] border-t border-line shrink-0">
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
