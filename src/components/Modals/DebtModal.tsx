import React, { useState, useEffect } from 'react';
import { X, Layers, ArrowDownLeft, ArrowUpRight, DollarSign } from 'lucide-react';
import { Debt } from '../../types';
import { useLedger } from '../../context/LedgerContext';
import { api } from '../../api/client';
import { formatCurrency } from '../../design/tokens';

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Debt | null;
  mode?: 'create' | 'edit' | 'payment';
}

export const DebtModal: React.FC<DebtModalProps> = ({
  isOpen,
  onClose,
  initialData,
  mode = 'create',
}) => {
  const { activeProfile, refreshData, notify } = useLedger();

  const [direction, setDirection] = useState<'i_owe' | 'owed_to_me'>('owed_to_me');
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setDirection(initialData.direction);
      setPerson(initialData.person);
      setAmount(initialData.amount.toString());
      setCurrency(initialData.currency);
      setDueDate(initialData.dueDate || '');
      setNote(initialData.note || '');
      setPaymentAmount('');
    } else {
      setDirection('owed_to_me');
      setPerson('');
      setAmount('');
      setCurrency(activeProfile?.displayCurrency || 'GHS');
      setDueDate('');
      setNote('');
      setPaymentAmount('');
    }
  }, [initialData, isOpen, activeProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;

    setIsSubmitting(true);
    try {
      if (mode === 'payment' && initialData) {
        const payNum = parseFloat(paymentAmount);
        if (!payNum || payNum <= 0) {
          notify('Please enter a valid payment amount', 'error');
          setIsSubmitting(false);
          return;
        }
        await api.recordDebtPayment(initialData.id, payNum);
        notify(`Payment of ${formatCurrency(payNum, initialData.currency)} recorded`);
      } else if (initialData) {
        await api.updateDebt(initialData.id, {
          direction,
          person,
          amount: parseFloat(amount),
          currency,
          dueDate: dueDate || undefined,
          note,
        });
        notify('Debt entry updated');
      } else {
        const numAmt = parseFloat(amount);
        if (!numAmt || numAmt <= 0) {
          notify('Please enter a valid total amount', 'error');
          setIsSubmitting(false);
          return;
        }
        await api.createDebt({
          profileId: activeProfile.id,
          direction,
          person,
          amount: numAmt,
          currency,
          dueDate: dueDate || undefined,
          note,
          paid: 0,
        });
        notify('Debt tracking item created');
      }
      await refreshData();
      onClose();
    } catch (err: any) {
      notify(err.message || 'Action failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isPaymentMode = mode === 'payment' && initialData;
  const remaining = initialData ? Math.max(0, initialData.amount - (initialData.paid || 0)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-xs">
      <div className="bg-white border border-[#E8E5DF] rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E5DF]">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#1A1A1A]" />
            <h2 className="font-display text-lg font-bold text-[#1A1A1A]">
              {isPaymentMode
                ? 'Record Debt Payment'
                : initialData
                ? 'Edit Debt Record'
                : 'Track Debt / Credit'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F7F5F2] rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {isPaymentMode ? (
            <div className="space-y-4">
              <div className="p-3 bg-[#FDFCFB] rounded-lg border border-[#E8E5DF] space-y-1 text-xs">
                <div className="flex justify-between text-[#6B7280]">
                  <span>Person / Entity:</span>
                  <span className="font-bold text-[#1A1A1A]">{initialData.person}</span>
                </div>
                <div className="flex justify-between text-[#6B7280]">
                  <span>Type:</span>
                  <span className={initialData.direction === 'i_owe' ? 'text-[#DC2626] font-bold' : 'text-[#15803D] font-bold'}>
                    {initialData.direction === 'i_owe' ? 'I Owe (Payable)' : 'Owed to Me (Receivable)'}
                  </span>
                </div>
                <div className="flex justify-between text-[#6B7280] pt-1 border-t border-[#E8E5DF] font-mono-num">
                  <span>Remaining Balance:</span>
                  <span className="font-bold text-[#1A1A1A]">
                    {formatCurrency(remaining, initialData.currency)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                  Payment Installment ({initialData.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={remaining}
                  placeholder={remaining.toString()}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 text-base font-mono-num font-bold rounded-lg border border-[#E8E5DF] focus:outline-none focus:border-[#1A1A1A]"
                  autoFocus
                />
              </div>
            </div>
          ) : (
            <>
              {/* Direction Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#F7F5F2] rounded-lg border border-[#E8E5DF]">
                <button
                  type="button"
                  onClick={() => setDirection('owed_to_me')}
                  className={`flex items-center justify-center space-x-1.5 py-2 rounded text-xs font-bold transition-all ${
                    direction === 'owed_to_me'
                      ? 'bg-[#15803D] text-white shadow-sm'
                      : 'text-[#6B7280] hover:text-[#1A1A1A]'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Owed to Me</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDirection('i_owe')}
                  className={`flex items-center justify-center space-x-1.5 py-2 rounded text-xs font-bold transition-all ${
                    direction === 'i_owe'
                      ? 'bg-[#DC2626] text-white shadow-sm'
                      : 'text-[#6B7280] hover:text-[#1A1A1A]'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>I Owe</span>
                </button>
              </div>

              {/* Person */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                  Counterparty / Person Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kwame Mensah, Tech Supplier Ltd"
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                  className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-xs focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              {/* Total Amount & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                    Total Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="3000.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-xs font-mono-num font-bold focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-xs font-mono-num focus:outline-none focus:border-[#1A1A1A]"
                  >
                    <option value="GHS">GHS (GH₵)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="NGN">NGN (₦)</option>
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                  Expected Repayment Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-xs font-mono-num focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                  Reason / Contract Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Milestone 2 project invoice balance"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-xs focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>
            </>
          )}

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
              {isSubmitting
                ? 'Processing...'
                : isPaymentMode
                ? 'Confirm Payment'
                : initialData
                ? 'Save Changes'
                : 'Track Debt'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
