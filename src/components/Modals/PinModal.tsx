import React, { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, Delete, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const PinModal: React.FC = () => {
  const { requireAuthModal, setRequireAuthModal, login } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!requireAuthModal) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const res = await login({ usernameOrEmail: 'pin_user', password: pin });
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || 'Incorrect PIN');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-sm shadow-2xl p-5 sm:p-6 text-center max-h-[92vh] overflow-y-auto">
        
        <div className="w-12 h-12 rounded-xl bg-sunken border border-line text-ink flex items-center justify-center mx-auto mb-3 shadow-xs">
          <Lock className="w-6 h-6 stroke-[2]" />
        </div>

        <h2 className="t-title">
          Ledger Protected
        </h2>
        <p className="t-meta num mt-1">
          Enter your owner security PIN to access accounts
        </p>

        {/* PIN Input Dots / Indicator */}
        <div className="flex justify-center gap-3 my-6">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                pin.length > idx
                  ? 'bg-solid border-line-strong scale-110 shadow-sm'
                  : 'bg-sunken border-line'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-neg-soft border border-neg-soft rounded-xl text-xs text-neg font-medium animate-in fade-in">
            {error}
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num.toString())}
              className="h-12 rounded-xl bg-sunken hover:bg-surface text-ink text-lg num font-bold border border-line transition-all active:scale-95 flex items-center justify-center shadow-xs cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-xl bg-sunken hover:bg-surface text-ink-3 text-xs num font-semibold border border-line flex items-center justify-center cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-12 rounded-xl bg-sunken hover:bg-surface text-ink text-lg num font-bold border border-line transition-all active:scale-95 flex items-center justify-center shadow-xs cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-sunken hover:bg-surface text-ink-3 border border-line flex items-center justify-center cursor-pointer"
            aria-label="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Submit */}
        <button
          onClick={() => handleSubmit()}
          disabled={isSubmitting || pin.length < 4}
          className="w-full max-w-[240px] mx-auto py-3 lg-btn lg-btn-solid justify-center disabled:opacity-40"
        >
          <span>Unlock Ledger</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>

        <p className="t-meta num mt-4">
          Owner security PIN verification enabled
        </p>

      </div>
    </div>
  );
};
