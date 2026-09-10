import React, { useEffect, useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';

interface AuthTransitionOverlayProps {
  mode: 'login' | 'register';
  usernameOrEmail?: string;
}

export const AuthTransitionOverlay: React.FC<AuthTransitionOverlayProps> = ({
  mode,
  usernameOrEmail,
}) => {
  const [stepIndex, setStepIndex] = useState(0);

  const steps =
    mode === 'login'
      ? [
          'Verifying encrypted credentials...',
          'Establishing secure cryptographic session...',
          'Decrypting ledger vaults & portfolios...',
        ]
      : [
          'Initializing multi-user vault architecture...',
          'Generating zero-knowledge profile security...',
          'Preparing your personal financial dashboard...',
        ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 650);

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-xl animate-in fade-in duration-200">
      {/* iOS Floating Glass Card */}
      <div className="relative w-full max-w-sm rounded-3xl bg-white/90 dark:bg-[#141720]/90 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] p-7 text-center flex flex-col items-center space-y-5 animate-in zoom-in-95 duration-250">
        {/* Subtle radial ambient bloom */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none" />

        {/* High-Precision Orbital Spinner (iOS Native Feel) */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* Outer Track Ring */}
          <div className="absolute inset-0 rounded-full border-[2.5px] border-black/5 dark:border-white/10" />

          {/* Primary High-Speed Gradient Arc */}
          <div className="absolute inset-0 rounded-full border-[2.5px] border-transparent border-t-[#1A1A1A] dark:border-t-white border-r-[#1A1A1A]/40 dark:border-r-white/40 animate-spin-smooth" />

          {/* Secondary Counter-Rotating Inner Accent */}
          <div className="w-10 h-10 rounded-full border-[2px] border-transparent border-b-emerald-500/80 dark:border-b-emerald-400/80 animate-[spin_1.5s_linear_infinite_reverse]" />

          {/* Center Vault Shield Icon */}
          <div className="absolute w-6 h-6 rounded-full bg-white dark:bg-[#1A1E29] flex items-center justify-center shadow-xs">
            {mode === 'login' ? (
              <Lock className="w-3 h-3 text-[#1A1A1A] dark:text-white" />
            ) : (
              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
        </div>

        {/* Typography & Dynamic Status */}
        <div className="space-y-1.5 z-10">
          <h3 className="text-base font-bold font-display text-[#1A1A1A] dark:text-[#F3F4F6] tracking-tight">
            {mode === 'login' ? 'Authenticating Session' : 'Creating Account'}
          </h3>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] min-h-[18px] transition-all duration-300 font-medium">
            {steps[stepIndex]}
          </p>
          {usernameOrEmail && (
            <div className="pt-1">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono text-[#6B7280] dark:text-[#9CA3AF] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 truncate max-w-[200px]">
                {usernameOrEmail}
              </span>
            </div>
          )}
        </div>

        {/* Shimmer progress line */}
        <div className="w-40 h-[2px] rounded-full bg-black/5 dark:bg-white/10 overflow-hidden relative">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-[#1A1A1A] dark:via-white to-transparent w-full rounded-full animate-shimmer" />
        </div>
      </div>
    </div>
  );
};
