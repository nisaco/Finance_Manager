import React, { useState, useEffect } from 'react';
import { X, Scale } from 'lucide-react';
import { Budget } from '../../types';
import { useLedger } from '../../context/LedgerContext';
import { api } from '../../api/client';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Budget | null;
}

const COMMON_EXPENSE_CATEGORIES = [
  'Housing & Utilities',
  'Groceries & Household',
  'Transport & Fuel',
  'Dining & Leisure',
  'Health & Wellness',
  'Tech & Software',
  'Savings & Investments',
  'General Expense',
];

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  initialData,
}) => {
  const { activeProfile, refreshData, notify } = useLedger();

  const [category, setCategory] = useState(COMMON_EXPENSE_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setCategory(initialData.category);
      setLimit(initialData.limit.toString());
      setCurrency(initialData.currency);
    } else {
      setCategory(COMMON_EXPENSE_CATEGORIES[0]);
      setCustomCategory('');
      setLimit('');
      setCurrency(activeProfile?.displayCurrency || 'GHS');
    }
  }, [initialData, isOpen, activeProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    const finalCategory = customCategory.trim() || category;
    const numLimit = parseFloat(limit);
    if (!numLimit || numLimit <= 0) {
      notify('Please enter a valid monthly spending limit', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.upsertBudget({
        profileId: activeProfile.id,
        category: finalCategory,
        limit: numLimit,
        currency,
      });
      notify('Monthly budget limit configured');
      await refreshData();
      onClose();
    } catch (err: any) {
      notify(err.message || 'Failed to save budget', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/60 backdrop-blur-sm transition-opacity">
      <div className="lg-card w-full max-w-md rounded-t-[24px] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in-50 slide-in-from-bottom-6 sm:zoom-in-95 duration-200 p-0 border-line">
        {/* iOS Drag Handle on mobile */}
        <div className="w-10 h-1 rounded-full bg-ink-4/40 mx-auto mt-2.5 -mb-1 sm:hidden" aria-hidden="true" />

        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-ink" />
            <h2 className="font-display text-base font-bold text-ink">
              {initialData ? 'Adjust Category Budget' : 'Set Monthly Budget'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-sunken active:scale-90 transition-all"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full lg-select text-xs"
            >
              {COMMON_EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="custom">-- Custom Category --</option>
            </select>
          </div>

          {category === 'custom' && (
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
                Custom Category Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Travel & Exploration"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full lg-input text-xs"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
              Monthly Spending Limit ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="1500.00"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-full lg-input text-base font-mono-num num font-bold"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="lg-btn-quiet text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="lg-btn-solid text-xs"
            >
              {isSubmitting ? 'Saving...' : 'Set Limit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
