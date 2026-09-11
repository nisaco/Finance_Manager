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
      // Default to 90 days out
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 90);
      setDeadline(defaultDate.toISOString().split('T')[0]);
      setIsRealMoney(false);
      setAccountNumber('');
      setAccountName('');
      setIsResolved(false);
    }
  }, [initialData, isOpen, activeProfile]);

  // Auto-fetch account name on typing when linking Paystack payout destination
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A1A1A]/40 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#E8E5DF] dark:border-[#2D323F] shrink-0">
          <div className="flex items-center space-x-2">
            <PiggyBank className="w-5 h-5 text-[#1A1A1A] dark:text-white" />
            <h2 className="font-display text-base sm:text-lg font-bold text-[#1A1A1A] dark:text-white">
              {initialData ? 'Edit Savings Vault' : 'Create Savings Vault'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-1 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-white hover:bg-[#F7F5F2] dark:hover:bg-[#252830] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Rules & Policy Notice */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-300 space-y-1.5">
            <div className="flex items-center space-x-1.5 font-bold">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>How Your Savings Vault Works</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900/85 dark:text-amber-200/80">
              You can deposit funds into your vault as many times as you like. When your set end date is reached, you can withdraw your money with the standard <strong>2%</strong> processing fee. You can also withdraw anytime before the set date with the <strong>10%</strong> early withdrawal penalty fee.
            </p>
          </div>

          {/* Goal Name */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mb-1 font-bold">
              Savings Vault Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Land Purchase, School Fees, Business Capital, New Car"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#FDFCFB] dark:bg-[#15181E] text-[#1A1A1A] dark:text-white px-3 py-2.5 rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] text-sm focus:outline-none focus:border-[#1A1A1A] dark:focus:border-white transition-colors"
            />
          </div>

          {/* Target Amount & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mb-1 font-bold">
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
                className="w-full bg-[#FDFCFB] dark:bg-[#15181E] text-[#1A1A1A] dark:text-white px-3 py-2 rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] text-sm font-mono-num font-bold focus:outline-none focus:border-[#1A1A1A] dark:focus:border-white"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mb-1 font-bold">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[#FDFCFB] dark:bg-[#15181E] text-[#1A1A1A] dark:text-white px-3 py-2 rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] text-sm font-mono-num focus:outline-none focus:border-[#1A1A1A] dark:focus:border-white"
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
              <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] font-mono-num font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Set End Date (Maturity Date)</span>
              </label>
              <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">
                Withdraw anytime (2% on/after date, 10% before)
              </span>
            </div>

            <input
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-[#FDFCFB] dark:bg-[#15181E] text-[#1A1A1A] dark:text-white px-3 py-2 rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] text-sm font-mono-num focus:outline-none focus:border-[#1A1A1A] dark:focus:border-white"
            />

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleSetDuration(30)}
                className="px-2.5 py-1 text-xs rounded-md bg-[#F7F5F2] dark:bg-[#252830] border border-[#E8E5DF] dark:border-[#2D323F] hover:bg-[#E8E5DF] font-medium transition-colors"
              >
                +30 Days (1 Mo)
              </button>
              <button
                type="button"
                onClick={() => handleSetDuration(90)}
                className="px-2.5 py-1 text-xs rounded-md bg-[#F7F5F2] dark:bg-[#252830] border border-[#E8E5DF] dark:border-[#2D323F] hover:bg-[#E8E5DF] font-medium transition-colors"
              >
                +90 Days (3 Mo)
              </button>
              <button
                type="button"
                onClick={() => handleSetDuration(180)}
                className="px-2.5 py-1 text-xs rounded-md bg-[#F7F5F2] dark:bg-[#252830] border border-[#E8E5DF] dark:border-[#2D323F] hover:bg-[#E8E5DF] font-medium transition-colors"
              >
                +180 Days (6 Mo)
              </button>
              <button
                type="button"
                onClick={() => handleSetDuration(365)}
                className="px-2.5 py-1 text-xs rounded-md bg-[#F7F5F2] dark:bg-[#252830] border border-[#E8E5DF] dark:border-[#2D323F] hover:bg-[#E8E5DF] font-medium transition-colors"
              >
                +365 Days (1 Yr)
              </button>
            </div>
          </div>

          {/* PAYSTACK DESTINATION SECTION */}
          <div className="border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl p-4 bg-[#FDFCFB] dark:bg-[#181A20] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                  Link Paystack Payout Destination
                </span>
                <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] block">
                  Connect a verified bank or Mobile Money account for direct Paystack payouts.
                </span>
              </div>
              <input
                type="checkbox"
                id="realMoneyToggle"
                checked={isRealMoney}
                onChange={(e) => setIsRealMoney(e.target.checked)}
                className="w-4 h-4 rounded text-[#1A1A1A] bg-[#FFFFFF] border-[#E8E5DF] focus:ring-[#1A1A1A]"
              />
            </div>

            {isRealMoney && (
              <div className="space-y-3 pt-2 border-t border-[#E8E5DF] dark:border-[#2D323F] animate-in fade-in duration-200">
                {/* Bank / Provider Selection */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mb-1 font-bold">
                    Destination Bank or Mobile Money Network
                  </label>
                  <select
                    value={selectedBankCode}
                    onChange={(e) => {
                      setSelectedBankCode(e.target.value);
                      setIsResolved(false);
                    }}
                    className="w-full bg-[#FFFFFF] dark:bg-[#15181E] text-[#1A1A1A] dark:text-white px-3 py-2 rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] text-xs focus:outline-none focus:border-[#1A1A1A]"
                  >
                    {banks.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Account / MoMo Number with Verification */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mb-1 font-bold">
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
                      className="w-full bg-[#FFFFFF] dark:bg-[#15181E] text-[#1A1A1A] dark:text-white px-3 py-2 rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] text-xs font-mono-num focus:outline-none focus:border-[#1A1A1A]"
                    />
                    <button
                      type="button"
                      onClick={handleResolveAccount}
                      disabled={isResolving || !accountNumber}
                      className="px-3 py-2 bg-[#F7F5F2] dark:bg-[#252830] hover:bg-[#E8E5DF] dark:hover:bg-[#2D323F] text-[#1A1A1A] dark:text-white text-xs font-bold rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] flex items-center space-x-1 shrink-0 disabled:opacity-50"
                    >
                      {isResolving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      <span>Verify</span>
                    </button>
                  </div>
                </div>

                {/* Resolved Account Badge */}
                {isResolved && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-2 text-xs text-emerald-700 dark:text-emerald-300">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span className="font-bold font-mono-num truncate">
                      Holder: {accountName}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E8E5DF] dark:border-[#2D323F]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-bold text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] dark:bg-white dark:hover:bg-gray-100 text-[#FFFFFF] dark:text-[#1A1A1A] rounded-md text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Securing...' : initialData ? 'Save Changes' : 'Create Vault'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
