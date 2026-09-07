import React, { useState, useEffect } from 'react';
import { X, PiggyBank, ShieldCheck, Landmark, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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
      setDeadline('');
      setIsRealMoney(false);
      setAccountNumber('');
      setAccountName('');
      setIsResolved(false);
    }
  }, [initialData, isOpen, activeProfile]);

  const handleResolveAccount = async () => {
    if (!accountNumber || accountNumber.length < 9) {
      notify('Please enter a valid account or mobile money number', 'error');
      return;
    }
    setIsResolving(true);
    try {
      const res = await api.resolveAccount(accountNumber, selectedBankCode);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    const numTarget = parseFloat(target);
    if (!numTarget || numTarget <= 0) {
      notify('Please enter a valid target amount', 'error');
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

      if (initialData) {
        await api.updateGoal(initialData.id, {
          name,
          target: numTarget,
          currency,
          deadline: deadline || undefined,
          paystackDestination,
        });
        notify('Savings goal updated');
      } else {
        await api.createGoal({
          profileId: activeProfile.id,
          name,
          target: numTarget,
          current: isRealMoney ? 0 : parseFloat(current) || 0,
          currency,
          deadline: deadline || undefined,
          paystackDestination,
        });
        notify('Savings goal established');
      }
      await refreshData();
      onClose();
    } catch (err: any) {
      notify(err.message || 'Failed to save goal', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A1A1A]/40 backdrop-blur-xs">
      <div className="bg-white border border-[#E8E5DF] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#E8E5DF] shrink-0">
          <div className="flex items-center space-x-2">
            <PiggyBank className="w-5 h-5 text-[#1A1A1A]" />
            <h2 className="font-display text-base sm:text-lg font-bold text-[#1A1A1A]">
              {initialData ? 'Edit Savings Goal' : 'Create Savings Goal'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-1 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F7F5F2] rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Goal Name */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
              Goal Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Emergency Reserve, Land Acquisition, Q4 Equipment"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-sm focus:outline-none focus:border-[#1A1A1A]"
            />
          </div>

          {/* Target Amount & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                Target Amount
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="25000.00"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-sm font-mono-num font-bold focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-sm font-mono-num focus:outline-none focus:border-[#1A1A1A]"
              >
                <option value="GHS">GHS (Ghana Cedi)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="GBP">GBP (British Pound)</option>
                <option value="NGN">NGN (Nigerian Naira)</option>
              </select>
            </div>
          </div>

          {/* Target Date */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
              Target Completion Deadline (Optional)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-sm font-mono-num focus:outline-none focus:border-[#1A1A1A]"
            />
          </div>

          {/* REAL MONEY PAYSTACK DESTINATION SECTION */}
          <div className="border border-[#E8E5DF] rounded-xl p-4 bg-[#FDFCFB] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#1A1A1A]">
                  Link Bank or Mobile Money Account
                </span>
                <span className="text-[11px] text-[#6B7280] block">
                  Link an account to deposit funds directly to this savings goal.
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
              <div className="space-y-3 pt-2 border-t border-[#E8E5DF] animate-in fade-in duration-200">
                {/* Bank / Provider Selection */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
                    Destination Bank or Mobile Money Network
                  </label>
                  <select
                    value={selectedBankCode}
                    onChange={(e) => {
                      setSelectedBankCode(e.target.value);
                      setIsResolved(false);
                    }}
                    className="w-full bg-[#FFFFFF] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-xs focus:outline-none focus:border-[#1A1A1A]"
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
                  <label className="block text-[10px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
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
                      className="w-full bg-[#FFFFFF] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-xs font-mono-num focus:outline-none focus:border-[#1A1A1A]"
                    />
                    <button
                      type="button"
                      onClick={handleResolveAccount}
                      disabled={isResolving || !accountNumber}
                      className="px-3 py-2 bg-[#F7F5F2] hover:bg-[#E8E5DF] text-[#1A1A1A] text-xs font-bold rounded-lg border border-[#E8E5DF] flex items-center space-x-1 shrink-0 disabled:opacity-50"
                    >
                      {isResolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-[#1A1A1A]" />}
                      <span>Verify</span>
                    </button>
                  </div>
                </div>

                {/* Resolved Account Badge */}
                {isResolved && (
                  <div className="p-2.5 rounded-lg bg-[#15803D]/10 border border-[#15803D]/30 flex items-center space-x-2 text-xs text-[#15803D]">
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
              {isSubmitting ? 'Securing...' : initialData ? 'Save Changes' : 'Initialize Goal'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
