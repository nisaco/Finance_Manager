import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, Delete, X, ShieldAlert } from 'lucide-react';
import { Profile } from '../../types';
import { useLedger } from '../../context/LedgerContext';

interface ProfileLockModalProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileLockModal: React.FC<ProfileLockModalProps> = ({
  profile,
  isOpen,
  onClose,
}) => {
  const { unlockProfile } = useLedger();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, profile]);

  if (!isOpen || !profile) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setError('');
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setError('');
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError('');
    setPin('');
  };

  const handleSubmit = async (pinToSubmit = pin) => {
    if (pinToSubmit.length < 4 || isSubmitting) return;
    setIsSubmitting(true);
    setError('');

    try {
      const success = await unlockProfile(profile.id, pinToSubmit);
      if (success) {
        onClose();
      } else {
        setError('Incorrect PIN for this profile');
        setPin('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify PIN');
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Allow physical keyboard typing
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9') {
      handleDigit(e.key);
    } else if (e.key === 'Backspace') {
      handleBackspace();
    } else if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-[#1A1A1A]/70 backdrop-blur-xs focus:outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="bg-white border border-[#E8E5DF] rounded-2xl w-full max-w-sm shadow-2xl p-5 sm:p-6 text-center animate-in zoom-in-95 duration-150 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F7F5F2] rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Profile Avatar Icon */}
        <div
          className="w-12 h-12 rounded-xl text-white flex items-center justify-center mx-auto mb-3 shadow-sm"
          style={{ backgroundColor: profile.color || '#1A1A1A' }}
        >
          <Lock className="w-6 h-6 stroke-[2.2]" />
        </div>

        <h2 className="font-display text-lg sm:text-xl font-bold text-[#1A1A1A]">
          Unlock {profile.name}
        </h2>
        <p className="text-xs text-[#6B7280] mt-1 font-mono-num">
          Enter the security PIN to access this private profile
        </p>

        {/* PIN Indicators */}
        <div className="flex justify-center space-x-3 my-5">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                pin.length > idx
                  ? 'bg-[#1A1A1A] border-[#1A1A1A] scale-110 shadow-xs'
                  : 'bg-[#FDFCFB] border-[#D1D5DB]'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 p-2 bg-[#DC2626]/10 border border-[#DC2626]/30 rounded text-xs text-[#DC2626] font-bold flex items-center justify-center space-x-1.5 animate-shake">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num.toString())}
              className="h-11 rounded-xl bg-[#FDFCFB] hover:bg-[#F7F5F2] text-[#1A1A1A] text-lg font-mono-num font-bold border border-[#E8E5DF] transition-all active:scale-95 flex items-center justify-center shadow-xs"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-11 rounded-xl bg-[#F7F5F2] hover:bg-[#E8E5DF] text-[#6B7280] text-xs font-mono-num font-bold border border-[#E8E5DF] flex items-center justify-center"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-11 rounded-xl bg-[#FDFCFB] hover:bg-[#F7F5F2] text-[#1A1A1A] text-lg font-mono-num font-bold border border-[#E8E5DF] transition-all active:scale-95 flex items-center justify-center shadow-xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-11 rounded-xl bg-[#F7F5F2] hover:bg-[#E8E5DF] text-[#6B7280] border border-[#E8E5DF] flex items-center justify-center"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        {/* Submit & Cancel */}
        <div className="space-y-2 max-w-[240px] mx-auto">
          <button
            onClick={() => handleSubmit()}
            disabled={isSubmitting || pin.length < 4}
            className="w-full py-2.5 bg-[#1A1A1A] hover:bg-[#333333] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center space-x-1.5 disabled:opacity-40"
          >
            <span>{isSubmitting ? 'Verifying...' : 'Unlock Profile'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 text-xs text-[#6B7280] hover:text-[#1A1A1A] font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};
