import React, { useEffect, useState } from 'react';

interface SplashLoaderProps {
  onComplete: () => void;
  minDurationMs?: number;
}

export const SplashLoader: React.FC<SplashLoaderProps> = ({
  onComplete,
  minDurationMs = 1150,
}) => {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadingOut(true);
      const exitTimer = setTimeout(() => {
        onComplete();
      }, 400); // 400ms silky exit fade
      return () => clearTimeout(exitTimer);
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [minDurationMs, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#FDFCFB] dark:bg-[#0B0D11] text-[#1A1A1A] dark:text-[#F3F4F6] transition-all duration-400 ease-out select-none ${
        fadingOut ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* iOS Ambient Background Bloom */}
      <div className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-emerald-500/10 via-amber-500/5 to-blue-500/10 dark:from-emerald-500/15 dark:via-blue-500/10 dark:to-transparent blur-3xl pointer-events-none animate-pulse" />

      <div className="relative z-10 flex flex-col items-center space-y-6">
        {/* iOS-Style App Icon Squircle */}
        <div className="relative group">
          {/* Subtle Outer Glow Ring */}
          <div className="absolute -inset-1.5 rounded-[28px] bg-gradient-to-b from-black/10 to-black/5 dark:from-white/20 dark:to-white/5 blur-sm" />
          
          <div className="relative w-20 h-20 rounded-[22px] bg-gradient-to-b from-[#22252B] to-[#121418] dark:from-[#FFFFFF] dark:to-[#E5E7EB] text-[#FFFFFF] dark:text-[#111317] flex items-center justify-center shadow-[0_12px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_32px_rgba(255,255,255,0.12)] border border-white/10 dark:border-white/40 transition-transform duration-500">
            {/* Specular highlight */}
            <div className="absolute inset-0 rounded-[22px] bg-gradient-to-b from-white/20 via-transparent to-black/20 pointer-events-none" />
            <span className="font-display text-3xl font-bold tracking-tight">L</span>
          </div>
        </div>

        {/* Minimalist Brand Typography */}
        <div className="text-center space-y-1.5">
          <div className="text-sm font-bold tracking-[0.25em] uppercase font-display text-[#1A1A1A] dark:text-[#F3F4F6]">
            Ledger
          </div>
          <div className="text-[10px] tracking-[0.2em] uppercase font-mono text-[#6B7280] dark:text-[#9CA3AF]">
            Financial OS
          </div>
        </div>

        {/* iOS Fluid Shimmer Progress Line */}
        <div className="w-32 h-[3px] rounded-full bg-black/5 dark:bg-white/10 overflow-hidden relative mt-2">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-[#1A1A1A] to-transparent dark:via-white w-full rounded-full animate-shimmer" />
        </div>
      </div>

      {/* Discreet Encrypted Connection Badge */}
      <div className="absolute bottom-8 flex items-center space-x-2 text-[10px] font-mono text-[#9CA3AF] dark:text-[#6B7280]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
        <span>End-to-End Encrypted</span>
      </div>
    </div>
  );
};
