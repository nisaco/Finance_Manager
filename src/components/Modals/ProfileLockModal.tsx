import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, Delete, X, ShieldAlert } from 'lucide-react';
import { Profile } from '../../types';
import { useLedger } from '../../context/LedgerContext';

interface ProfileLockModalProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onUnlockSuccess?: () => void;
}

export const ProfileLockModal: React.FC<ProfileLockModalProps> = ({
  profile,
  isOpen,
  onClose,
  onUnlockSuccess,
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
        onUnlockSuccess?.();
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
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs focus:outline-none animate-in fade-in duration-150"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="bg-surface border border-line rounded-2xl w-full max-w-sm shadow-2xl p-5 sm:p-6 text-center relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="lg-iconbtn absolute top-4 right-4"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Profile Avatar Icon */}
        <div
          className="w-12 h-12 rounded-xl text-white flex items-center justify-center mx-auto mb-3 shadow-sm"
          style={{ backgroundColor: profile.color || 'var(--lg-ink)' }}
        >
          <Lock className="w-6 h-6 stroke-[2.2]" />
        </div>

        <h2 className="t-title">
          Unlock {profile.name}
        </h2>
        <p className="t-meta num mt-1">
          Enter the security PIN to access this private profile
        </p>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-3 my-5">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                pin.length > idx
                  ? 'bg-solid border-line-strong scale-110 shadow-xs'
                  : 'bg-sunken border-line'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-neg-soft border border-neg-soft rounded-xl text-xs text-neg font-medium flex items-center justify-center gap-1.5 animate-in fade-in">
            <ShieldAlert className="w-4 h-4 shrink-0" />
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
              className="h-11 rounded-xl bg-sunken hover:bg-surface text-ink text-lg num font-bold border border-line transition-all active:scale-95 flex items-center justify-center shadow-xs cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-11 rounded-xl bg-sunken hover:bg-surface text-ink-3 text-xs num font-semibold border border-line flex items-center justify-center cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-11 rounded-xl bg-sunken hover:bg-surface text-ink text-lg num font-bold border border-line transition-all active:scale-95 flex items-center justify-center shadow-xs cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-11 rounded-xl bg-sunken hover:bg-surface text-ink-3 border border-line flex items-center justify-center cursor-pointer"
            aria-label="Backspace"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        {/* Submit & Cancel */}
        <div className="space-y-2 max-w-[240px] mx-auto">
          <button
            onClick={() => handleSubmit()}
            disabled={isSubmitting || pin.length < 4}
            className="w-full py-2.5 lg-btn lg-btn-solid justify-center disabled:opacity-40"
          >
            <span>{isSubmitting ? 'Verifying...' : 'Unlock Profile'}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 text-xs text-ink-3 hover:text-ink font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};
