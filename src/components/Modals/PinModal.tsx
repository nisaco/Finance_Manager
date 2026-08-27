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

    const res = await login(pin);
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.message || 'Incorrect PIN');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1A1A1A]/70 backdrop-blur-xs">
      <div className="bg-white border border-[#E8E5DF] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
        
        <div className="w-12 h-12 rounded-xl bg-[#F7F5F2] border border-[#E8E5DF] text-[#1A1A1A] flex items-center justify-center mx-auto mb-3 shadow-xs">
          <Lock className="w-6 h-6" />
        </div>

        <h2 className="font-display text-xl font-bold text-[#1A1A1A]">
          Ledger Protected
        </h2>
        <p className="text-xs text-[#6B7280] mt-1 font-mono-num">
          Enter your owner security PIN to access accounts
        </p>

        {/* PIN Input Dots / Indicator */}
        <div className="flex justify-center space-x-3 my-6">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                pin.length > idx
                  ? 'bg-[#1A1A1A] border-[#1A1A1A] scale-110 shadow-sm'
                  : 'bg-[#FDFCFB] border-[#E8E5DF]'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 p-2 bg-[#DC2626]/10 border border-[#DC2626]/30 rounded text-xs text-[#DC2626] font-bold animate-shake">
            {error}
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num.toString())}
              className="h-12 rounded-xl bg-[#FDFCFB] hover:bg-[#F7F5F2] text-[#1A1A1A] text-lg font-mono-num font-bold border border-[#E8E5DF] transition-all active:scale-95 flex items-center justify-center shadow-xs"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-xl bg-[#F7F5F2] hover:bg-[#E8E5DF] text-[#6B7280] text-xs font-mono-num font-bold border border-[#E8E5DF] flex items-center justify-center"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-12 rounded-xl bg-[#FDFCFB] hover:bg-[#F7F5F2] text-[#1A1A1A] text-lg font-mono-num font-bold border border-[#E8E5DF] transition-all active:scale-95 flex items-center justify-center shadow-xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-[#F7F5F2] hover:bg-[#E8E5DF] text-[#6B7280] border border-[#E8E5DF] flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Submit */}
        <button
          onClick={() => handleSubmit()}
          disabled={isSubmitting || pin.length < 4}
          className="w-full max-w-[240px] mx-auto py-3 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-40"
        >
          <span>Unlock Ledger</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-[10px] text-[#6B7280] font-mono-num mt-4">
          Default initial PIN: <span className="text-[#1A1A1A] font-bold">1234</span> (configurable in Settings)
        </p>

      </div>
    </div>
  );
};
