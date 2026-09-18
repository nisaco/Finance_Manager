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
              <stop offset="0%" stopColor="#141923" />
              <stop offset="50%" stopColor="#0B0E14" />
              <stop offset="100%" stopColor="#06080B" />
            </linearGradient>

            <linearGradient id="logoWingTop" x1="0%" y1="0%" x2="100%" y2="40%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>

            <linearGradient id="logoWingMid" x1="10%" y1="90%" x2="90%" y2="20%">
              <stop offset="0%" stopColor="#047857" />
              <stop offset="40%" stopColor="#059669" />
              <stop offset="75%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>

            <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#10B981" floodOpacity="0.4" />
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#10B981" floodOpacity="0.6" />
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
            stroke="#10B981"
            strokeOpacity="0.18"
            strokeWidth="3"
          />

          <g filter="url(#logoShadow)">
            {/* Top Aerodynamic Ribbon Wing */}
            <path
              d="M 152 166
                 C 152 136, 172 122, 208 122
                 L 366 122
                 C 386 122, 396 132, 392 148
                 C 386 174, 362 192, 334 192
                 L 202 192
                 C 172 192, 152 182, 152 166 Z"
              fill="url(#logoWingTop)"
            />

            {/* Lower Stem & Middle Aerodynamic Crossbar */}
            <path
              d="M 154 374
                 C 152 398, 166 404, 176 384
                 C 188 360, 192 312, 192 264
                 C 192 238, 212 230, 238 230
                 L 324 230
                 C 342 230, 350 238, 346 254
                 C 338 280, 316 296, 288 296
                 L 222 296
                 C 188 296, 182 320, 178 354
                 C 168 392, 154 398, 154 374 Z"
              fill="url(#logoWingMid)"
            />
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
