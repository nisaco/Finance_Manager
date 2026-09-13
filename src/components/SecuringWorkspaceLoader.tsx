import React from 'react';
import { motion } from 'motion/react';
import { LedgerLogo } from './LedgerLogo';

interface SecuringWorkspaceLoaderProps {
  message?: string;
  subtext?: string;
}

export const SecuringWorkspaceLoader: React.FC<SecuringWorkspaceLoaderProps> = ({
  message = 'Securing Workspace',
  subtext = 'Verifying Secure Session',
}) => {
  return (
    <div
      id="securing-workspace-loader"
      className="min-h-screen bg-[#FDFCFB] dark:bg-[#0B0D11] flex flex-col items-center justify-center p-4 select-none relative overflow-hidden"
    >
      {/* Ambient background bloom */}
      <div className="absolute w-80 h-80 rounded-full bg-gradient-to-tr from-emerald-500/10 via-amber-500/5 to-blue-500/10 dark:from-emerald-500/15 dark:via-blue-500/10 dark:to-transparent blur-3xl pointer-events-none animate-pulse" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Animated Oscillating/Rotating App Icon (Left to Right and Right to Left) */}
        <div className="relative mb-5 flex items-center justify-center">
          {/* Subtle Ambient Glow Aura */}
          <div className="absolute -inset-4 rounded-3xl bg-emerald-500/20 dark:bg-emerald-500/25 blur-xl pointer-events-none animate-pulse" />

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
            className="relative will-change-transform drop-shadow-xl"
            aria-label="Ledger Logo Loading Animation"
          >
            <LedgerLogo size={56} />
          </motion.div>
        </div>

        {/* Securing Workspace with Sequential Fading Dots */}
        <div className="flex items-center text-[11px] font-mono tracking-[0.2em] text-[#6B7280] dark:text-[#9CA3AF] uppercase select-none">
          <span>{message}</span>
          <span className="inline-flex tracking-normal ml-0.5 text-xs font-bold leading-none select-none">
            <motion.span
              animate={{ opacity: [0.15, 1, 0.15] }}
              transition={{
                repeat: Infinity,
                duration: 1.4,
                delay: 0,
                ease: 'easeInOut',
              }}
            >
              .
            </motion.span>
            <motion.span
              animate={{ opacity: [0.15, 1, 0.15] }}
              transition={{
                repeat: Infinity,
                duration: 1.4,
                delay: 0.28,
                ease: 'easeInOut',
              }}
            >
              .
            </motion.span>
            <motion.span
              animate={{ opacity: [0.15, 1, 0.15] }}
              transition={{
                repeat: Infinity,
                duration: 1.4,
                delay: 0.56,
                ease: 'easeInOut',
              }}
            >
              .
            </motion.span>
          </span>
        </div>

        {/* Subtle Encrypted Verification Badge */}
        {subtext && (
          <div className="mt-4 flex items-center space-x-2 text-[10px] font-mono text-[#9CA3AF] dark:text-[#6B7280] tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>{subtext}</span>
          </div>
        )}
      </div>
    </div>
  );
};
