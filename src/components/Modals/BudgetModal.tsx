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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-xs">
      <div className="bg-white border border-[#E8E5DF] rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E5DF]">
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-[#1A1A1A]" />
            <h2 className="font-display text-lg font-bold text-[#1A1A1A]">
              {initialData ? 'Adjust Category Budget' : 'Set Monthly Budget'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F7F5F2] rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-xs font-medium focus:outline-none focus:border-[#1A1A1A]"
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
              <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                Custom Category Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Travel & Exploration"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-xs focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
              Monthly Spending Limit ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="1500.00"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 text-base font-mono-num font-bold rounded-lg border border-[#E8E5DF] focus:outline-none focus:border-[#1A1A1A]"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E8E5DF]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-bold text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F7F5F2]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] rounded-md text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Set Limit'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
