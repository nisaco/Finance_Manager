import React, { useState, useEffect } from 'react';
import { X, Layers, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/60 backdrop-blur-xs">
      <div className="lg-card w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150 p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-ink" />
            <h2 className="font-display text-base font-bold text-ink">
              {isPaymentMode
                ? 'Record Debt Payment'
                : initialData
                ? 'Edit Debt Record'
                : 'Track Debt / Credit'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-sunken transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {isPaymentMode ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-sunken rounded-xl border border-line space-y-1.5 text-xs">
                <div className="flex justify-between text-ink-muted">
                  <span>Counterparty / Entity:</span>
                  <span className="font-bold text-ink">{initialData.person}</span>
                </div>
                <div className="flex justify-between text-ink-muted">
                  <span>Category:</span>
                  <span className={initialData.direction === 'i_owe' ? 'text-neg font-bold' : 'text-pos font-bold'}>
                    {initialData.direction === 'i_owe' ? 'I Owe (Payable)' : 'Owed to Me (Receivable)'}
                  </span>
                </div>
                <div className="flex justify-between text-ink-muted pt-1.5 border-t border-line font-mono-num num">
                  <span>Remaining Balance:</span>
                  <span className="font-bold text-ink">
                    {formatCurrency(remaining, initialData.currency)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
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
                  className="w-full lg-input text-base font-mono-num num font-bold"
                  autoFocus
                />
              </div>
            </div>
          ) : (
            <>
              {/* Direction Toggle */}
              <div className="lg-seg">
                <button
                  type="button"
                  onClick={() => setDirection('owed_to_me')}
                  className={`lg-seg-btn flex items-center justify-center space-x-1.5 ${
                    direction === 'owed_to_me' ? 'active text-pos' : ''
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Owed to Me</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDirection('i_owe')}
                  className={`lg-seg-btn flex items-center justify-center space-x-1.5 ${
                    direction === 'i_owe' ? 'active text-neg' : ''
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>I Owe</span>
                </button>
              </div>

              {/* Person */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
                  Counterparty / Person Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kwame Mensah, Tech Supplier Ltd"
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                  className="w-full lg-input text-xs"
                />
              </div>

              {/* Total Amount & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
                    Total Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="3000.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full lg-input text-xs font-mono-num num font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full lg-select text-xs font-mono-num"
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
                <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
                  Expected Repayment Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full lg-input text-xs font-mono-num num"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
                  Reason / Contract Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Milestone 2 project invoice balance"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full lg-input text-xs"
                />
              </div>
            </>
          )}

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
