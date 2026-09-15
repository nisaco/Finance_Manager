import React from 'react';

interface LedgerLogoProps {
  size?: number | string;
  className?: string;
  showText?: boolean;
  variant?: 'full' | 'mark';
}

export const LedgerLogo: React.FC<LedgerLogoProps> = ({
  size = 32,
  className = '',
  showText = false,
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <div className={`inline-flex items-center space-x-2.5 ${className}`}>
      {/* High-Resolution Vector Emblem */}
      <div
        style={{ width: pixelSize, height: pixelSize }}
        className="relative shrink-0 rounded-xl overflow-hidden shadow-xs select-none transition-transform group-hover:scale-105"
      >
        <svg
          viewBox="0 0 512 512"
          width="100%"
          height="100%"
          className="w-full h-full block"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E222D" />
              <stop offset="50%" stopColor="#11141A" />
              <stop offset="100%" stopColor="#090B0E" />
            </linearGradient>

            <linearGradient id="logoGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="45%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            <linearGradient id="logoEmeraldGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="60%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#6EE7B7" />
            </linearGradient>

            <linearGradient id="logoPillarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="70%" stopColor="#F1F5F9" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>

            <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Squircle container */}
          <rect x="0" y="0" width="512" height="512" rx="120" fill="url(#logoBgGrad)" />
          <rect
            x="2"
            y="2"
            width="508"
            height="508"
            rx="118"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.14"
            strokeWidth="4"
          />

          <g filter="url(#logoShadow)">
            {/* Subtle underlay ledger sheet */}
            <rect x="200" y="316" width="180" height="40" rx="12" fill="#64748B" opacity="0.35" />

            {/* Base Horizontal Ledger Block */}
            <rect x="128" y="332" width="252" height="52" rx="14" fill="url(#logoGoldGrad)" />

            {/* Vertical Stability Pillar */}
            <rect x="128" y="128" width="58" height="256" rx="16" fill="url(#logoPillarGrad)" />
            <rect x="134" y="136" width="6" height="240" rx="3" fill="#FFFFFF" opacity="0.8" />

            {/* Ascent Bar 1 */}
            <rect x="220" y="244" width="52" height="72" rx="12" fill="#E2E8F0" opacity="0.9" />

            {/* Ascent Bar 2 */}
            <rect x="298" y="180" width="52" height="136" rx="12" fill="url(#logoPillarGrad)" />

            {/* Emerald Growth Arrow Peak */}
            <path
              d="M 324 112 L 384 172 C 390 178 388 188 380 188 H 340 C 331 188 324 181 324 172 Z"
              fill="url(#logoEmeraldGrad)"
            />
            <circle cx="384" cy="128" r="10" fill="#6EE7B7" />
            <circle cx="384" cy="128" r="4" fill="#FFFFFF" />

            {/* Ledger Notch details */}
            <line x1="145" y1="184" x2="169" y2="184" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
            <line x1="145" y1="220" x2="169" y2="220" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
            <line x1="145" y1="256" x2="169" y2="256" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
          </g>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className="font-display font-bold tracking-tight text-[#1A1A1A] dark:text-[#F3F4F6] text-base leading-none">
            Fimara
          </span>
          <span className="text-[9px] tracking-widest uppercase text-[#6B7280] dark:text-[#9CA3AF] font-mono-num mt-0.5">
            Financial OS
          </span>
        </div>
      )}
    </div>
  );
};
