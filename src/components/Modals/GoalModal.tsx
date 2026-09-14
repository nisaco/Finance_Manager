import React, { useState, useEffect } from 'react';
import {
  X,
  PiggyBank,
  ShieldCheck,
  CheckCircle,
  Loader2,
  Calendar,
  Info,
} from 'lucide-react';
import { Goal, PaystackBank } from '../../types';
import { useLedger } from '../../context/LedgerContext';
import { api } from '../../api/client';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Goal | null;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  initialData,
}) => {
  const { activeProfile, refreshData, notify } = useLedger();

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('0');
  const [currency, setCurrency] = useState('GHS');
  const [deadline, setDeadline] = useState('');

  // Paystack real-money setup
  const [isRealMoney, setIsRealMoney] = useState(false);
  const [banks, setBanks] = useState<PaystackBank[]>([]);
  const [selectedBankCode, setSelectedBankCode] = useState('MTN');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getPaystackBanks('ghana').then(setBanks).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setTarget(initialData.target.toString());
      setCurrent(initialData.current.toString());
      setCurrency(initialData.currency);
      setDeadline(initialData.deadline || '');

      const hasPaystack = initialData.paystackDestination?.type === 'paystack_recipient';
      setIsRealMoney(hasPaystack);
      if (hasPaystack) {
        setAccountName(initialData.paystackDestination.accountName || '');
        setAccountNumber(initialData.paystackDestination.accountNumber || '');
        setIsResolved(true);
      }
    } else {
      setName('');
      setTarget('');
      setCurrent('0');
      setCurrency(activeProfile?.displayCurrency || 'GHS');
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 90);
      setDeadline(defaultDate.toISOString().split('T')[0]);
      setIsRealMoney(false);
      setAccountNumber('');
      setAccountName('');
      setIsResolved(false);
    }
  }, [initialData, isOpen, activeProfile]);

  useEffect(() => {
    if (!isRealMoney) return;
    const cleanNum = accountNumber.replace(/\s+/g, '');
    if (cleanNum.length < 9) {
      return;
    }

    let isCurrent = true;
    const timer = setTimeout(async () => {
      setIsResolving(true);
      try {
        const res = await api.resolveAccount(cleanNum, selectedBankCode);
        if (isCurrent) {
          setAccountName(res.accountName);
          setIsResolved(true);
        }
      } catch (err: any) {
        if (isCurrent) {
          console.warn('Auto account resolution error:', err);
        }
      } finally {
        if (isCurrent) {
          setIsResolving(false);
        }
      }
    }, 450);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [accountNumber, selectedBankCode, isRealMoney]);

  const handleResolveAccount = async () => {
    const cleanNum = accountNumber.replace(/\s+/g, '');
    if (!cleanNum || cleanNum.length < 9) {
      notify('Please enter a valid account or mobile money number', 'error');
      return;
    }
    setIsResolving(true);
    try {
      const res = await api.resolveAccount(cleanNum, selectedBankCode);
      setAccountName(res.accountName);
      setIsResolved(true);
      notify(`Account verified: ${res.accountName}`);
    } catch (err: any) {
      notify(err.message || 'Account resolution failed', 'error');
      setIsResolved(false);
    } finally {
      setIsResolving(false);
    }
  };

  const handleSetDuration = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDeadline(d.toISOString().split('T')[0]);
  };

  const numTarget = parseFloat(target) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    if (!name.trim()) {
      notify('Please enter a name for your savings vault', 'error');
      return;
    }
    if (!numTarget || numTarget <= 0) {
      notify('Please enter a valid savings target amount', 'error');
      return;
    }
    if (!deadline) {
      notify('Please set a target end date for your savings vault', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let paystackDestination: Goal['paystackDestination'] = { type: 'none' };

      if (isRealMoney) {
        const bank = banks.find((b) => b.code === selectedBankCode);
        let recipientCode = initialData?.paystackDestination?.recipientCode;

        if (!recipientCode) {
          const recRes = await api.createRecipient(
            accountName || name,
            accountNumber,
            selectedBankCode,
            currency
          );
          recipientCode = recRes.recipientCode;
        }

        paystackDestination = {
          type: 'paystack_recipient',
          recipientCode,
          accountLast4: accountNumber.slice(-4),
          bankName: bank?.name || 'Bank / MoMo Ghana',
          accountName: accountName || 'Verified Vault',
          accountNumber,
        };
      }

      const payload = {
        name: name.trim(),
        target: numTarget,
        currency,
        deadline: deadline || undefined,
        paystackDestination,
      };

      if (initialData) {
        await api.updateGoal(initialData.id, payload);
        notify('Savings vault updated successfully');
      } else {
        await api.createGoal({
          profileId: activeProfile.id,
          ...payload,
          current: isRealMoney ? 0 : parseFloat(current) || 0,
        });
        notify('Savings vault created! You can now deposit funds anytime.');
      }
      await refreshData();
      onClose();
    } catch (err: any) {
      notify(err.message || 'Failed to save savings vault', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/60 backdrop-blur-xs">
      <div className="lg-card w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <div className="flex items-center space-x-2">
            <PiggyBank className="w-5 h-5 text-ink" />
            <h2 className="font-display text-base sm:text-lg font-bold text-ink">
              {initialData ? 'Edit Savings Vault' : 'Create Savings Vault'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Rules & Policy Notice */}
          <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/20 text-xs text-ink space-y-1">
            <div className="flex items-center space-x-1.5 font-bold">
              <Info className="w-4 h-4 text-accent shrink-0" />
              <span>How Your Savings Vault Works</span>
            </div>
            <p className="text-[11px] leading-relaxed text-ink-muted">
              Deposit funds anytime. On maturity, withdraw with a standard <strong>2%</strong> processing fee. Early withdrawals before the maturity date incur a <strong>10%</strong> early penalty fee.
            </p>
          </div>

          {/* Vault Name */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
              Savings Vault Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Land Acquisition, School Fees, Emergency Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full lg-input text-xs"
            />
          </div>

          {/* Target Amount & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
                Target Savings Goal
              </label>
              <input
                type="number"
                step="0.01"
                required
                min="1"
                placeholder="5000.00"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
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
                <option value="GHS">GHS (Ghana Cedi)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="GBP">GBP (British Pound)</option>
                <option value="NGN">NGN (Nigerian Naira)</option>
              </select>
            </div>
          </div>

          {/* Set End Date with Quick Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Target Maturity Date</span>
              </label>
              <span className="text-[10px] text-ink-muted">
                2% on/after date, 10% before
              </span>
            </div>

            <input
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full lg-input text-xs font-mono-num num"
            />

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleSetDuration(30)}
                className="px-2.5 py-1 text-xs rounded-lg bg-sunken border border-line text-ink font-medium hover:border-ink/30 transition-colors"
              >
                +30 Days (1 Mo)
              </button>
              <button
                type="button"
                onClick={() => handleSetDuration(90)}
                className="px-2.5 py-1 text-xs rounded-lg bg-sunken border border-line text-ink font-medium hover:border-ink/30 transition-colors"
              >
                +90 Days (3 Mo)
              </button>
              <button
                type="button"
                onClick={() => handleSetDuration(180)}
                className="px-2.5 py-1 text-xs rounded-lg bg-sunken border border-line text-ink font-medium hover:border-ink/30 transition-colors"
              >
                +180 Days (6 Mo)
              </button>
              <button
                type="button"
                onClick={() => handleSetDuration(365)}
                className="px-2.5 py-1 text-xs rounded-lg bg-sunken border border-line text-ink font-medium hover:border-ink/30 transition-colors"
              >
                +365 Days (1 Yr)
              </button>
            </div>
          </div>

          {/* PAYSTACK DESTINATION SECTION */}
          <div className="border border-line rounded-xl p-4 bg-sunken space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-ink">
                  Link Paystack Payout Destination
                </span>
                <span className="text-[11px] text-ink-muted block">
                  Connect a verified bank or Mobile Money account for direct Paystack payouts.
                </span>
              </div>
              <input
                type="checkbox"
                id="realMoneyToggle"
                checked={isRealMoney}
                onChange={(e) => setIsRealMoney(e.target.checked)}
                className="w-4 h-4 rounded text-ink bg-surface border-line focus:ring-accent cursor-pointer"
              />
            </div>

            {isRealMoney && (
              <div className="space-y-3 pt-3 border-t border-line animate-in fade-in duration-200">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
                    Destination Bank or Mobile Money Network
                  </label>
                  <select
                    value={selectedBankCode}
                    onChange={(e) => {
                      setSelectedBankCode(e.target.value);
                      setIsResolved(false);
                    }}
                    className="w-full lg-select text-xs"
                  >
                    {banks.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-mono-num mb-1 font-bold">
                    Account / Mobile Money Number
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="e.g. 0244000000 or Account No"
                      value={accountNumber}
                      onChange={(e) => {
                        setAccountNumber(e.target.value);
                        setIsResolved(false);
                      }}
                      className="w-full lg-input text-xs font-mono-num num"
                    />
                    <button
                      type="button"
                      onClick={handleResolveAccount}
                      disabled={isResolving || !accountNumber}
                      className="lg-btn-quiet text-xs flex items-center space-x-1 shrink-0 disabled:opacity-50"
                    >
                      {isResolving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-pos" />
                      )}
                      <span>Verify</span>
                    </button>
                  </div>
                </div>

                {/* Resolved Account Badge */}
                {isResolved && (
                  <div className="p-2.5 rounded-xl bg-pos/10 border border-pos/30 flex items-center space-x-2 text-xs text-pos">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span className="font-bold font-mono-num truncate">
                      Account Name: {accountName}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
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
              {isSubmitting ? 'Securing...' : initialData ? 'Save Changes' : 'Create Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
