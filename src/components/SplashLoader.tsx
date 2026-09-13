import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { LedgerLogo } from './LedgerLogo';

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
        {/* Professional App Icon Squircle */}
        <div className="relative group">
          {/* Ambient Glow */}
          <div className="absolute -inset-3 rounded-3xl bg-emerald-500/20 dark:bg-emerald-500/25 blur-xl pointer-events-none animate-pulse" />
          <motion.div
            animate={{
              rotate: [-14, 14, -14],
              scale: [1, 1.04, 1],
            }}
            transition={{
              rotate: {
                repeat: Infinity,
                duration: 2.4,
                ease: 'easeInOut',
              },
              scale: {
                repeat: Infinity,
                duration: 2.4,
                ease: 'easeInOut',
              },
            }}
            className="will-change-transform drop-shadow-xl"
          >
            <LedgerLogo size={80} />
          </motion.div>
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
