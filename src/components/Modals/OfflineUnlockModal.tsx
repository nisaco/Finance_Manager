import React, { useState, useEffect, useRef } from 'react';
import { Lock, ShieldAlert, KeyRound, ArrowRight, Delete } from 'lucide-react';
import { verifyOfflinePin, getOfflineLockoutStatus } from '../../services/offlinePinAuth';

interface OfflineUnlockModalProps {
  isOpen: boolean;
  user: {
    id: string;
    username: string;
    email: string;
  };
  onUnlockSuccess: () => void;
}

export const OfflineUnlockModal: React.FC<OfflineUnlockModalProps> = ({
  isOpen,
  user,
  onUnlockSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lockout, setLockout] = useState(() => getOfflineLockoutStatus(user.id));
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep lockout status updated
  useEffect(() => {
    const interval = setInterval(() => {
      setLockout(getOfflineLockoutStatus(user.id));
    }, 15000);
    return () => clearInterval(interval);
  }, [user.id]);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg(null);
      setLockout(getOfflineLockoutStatus(user.id));
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, user.id]);

  const handleDigit = (digit: string) => {
    if (lockout.isLocked || pin.length >= 4 || isVerifying) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setErrorMsg(null);
    if (nextPin.length === 4) {
      triggerVerification(nextPin);
    }
  };

  const handleBackspace = () => {
    if (lockout.isLocked || isVerifying) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const triggerVerification = async (pinToVerify: string) => {
    setIsVerifying(true);
    setErrorMsg(null);
    try {
      const result = await verifyOfflinePin(user.id, pinToVerify);
      if (result.success) {
        onUnlockSuccess();
      } else {
        setErrorMsg(result.error || 'Invalid Offline PIN');
        setPin('');
        setLockout(getOfflineLockoutStatus(user.id));
      }
    } catch {
      setErrorMsg('Failed to verify PIN. Please try again.');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/90 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offline-unlock-title"
    >
      <div className="lg-card w-full max-w-sm p-6 sm:p-7 text-center space-y-5 border border-line bg-surface shadow-2xl rounded-2xl">
        {/* User Identity Header */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-line flex items-center justify-center text-ink shadow-xs">
            <Lock className="w-5 h-5 text-accent" strokeWidth={2} />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Offline Mode
            </span>
            <h2 id="offline-unlock-title" className="text-base font-bold text-ink font-display">
              Unlock Local Ledger
            </h2>
            <p className="text-xs text-ink-3 mt-0.5">
              Logged in as <strong className="text-ink">@{user.username}</strong>
            </p>
          </div>
        </div>

        {/* Hidden physical input for keyboard support */}
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pin}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
            setPin(val);
            if (val.length === 4) {
              triggerVerification(val);
            }
          }}
          disabled={lockout.isLocked || isVerifying}
          className="sr-only"
          autoFocus
        />

        {/* PIN Dot Indicators */}
        <div
          onClick={() => inputRef.current?.focus()}
          className="flex justify-center items-center gap-4 py-2 cursor-pointer"
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < pin.length;
            return (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${
                  isFilled
                    ? 'bg-ink border-ink scale-110'
                    : 'bg-surface-2 border-line scale-100'
                }`}
              />
            );
          })}
        </div>

        {/* Error / Lockout Messages */}
        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-neg-soft border border-neg/20 text-neg text-xs flex items-center justify-center gap-1.5 animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {lockout.isLocked && (
          <div className="p-3 rounded-xl bg-warn-soft border border-warn/30 text-warn text-xs space-y-1">
            <div className="font-semibold">Security Lockout Active</div>
            <p className="text-[11px] leading-relaxed">
              Too many failed attempts. Locked for{' '}
              <strong className="num">{lockout.lockRemainingMinutes}</strong> min to prevent unauthorized access.
            </p>
          </div>
        )}

        {/* Numeric Keypad for Mobile & Touch */}
        <div className="grid grid-cols-3 gap-2 pt-1 max-w-[240px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              disabled={lockout.isLocked || isVerifying}
              className="h-12 rounded-xl text-sm font-semibold text-ink bg-sunken hover:bg-surface-2 border border-line active:scale-95 transition-all num disabled:opacity-40"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              setPin('');
              setErrorMsg(null);
            }}
            disabled={pin.length === 0 || isVerifying}
            className="h-12 rounded-xl text-xs font-medium text-ink-3 hover:text-ink bg-transparent transition-colors disabled:opacity-30"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            disabled={lockout.isLocked || isVerifying}
            className="h-12 rounded-xl text-sm font-semibold text-ink bg-sunken hover:bg-surface-2 border border-line active:scale-95 transition-all num disabled:opacity-40"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            disabled={pin.length === 0 || isVerifying}
            className="h-12 rounded-xl flex items-center justify-center text-ink-3 hover:text-ink bg-transparent transition-colors disabled:opacity-30"
            aria-label="Backspace"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        {/* Informational Footer */}
        <div className="pt-2 border-t border-line text-[11px] text-ink-3 leading-relaxed">
          <span>
            Offline security protects your locally stored records. When connected to the internet, sign in using your standard account password.
          </span>
        </div>
      </div>
    </div>
  );
};

