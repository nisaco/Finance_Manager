import React from 'react';
import { Mic, MicOff, Volume2, Radio, Sparkles } from 'lucide-react';

interface SpatialVoiceOrbProps {
  status: 'connecting' | 'connected' | 'speaking' | 'listening' | 'error' | 'disconnected';
  isMuted: boolean;
  audioLevel: number;
  onOrbClick?: () => void;
}

export const SpatialVoiceOrb: React.FC<SpatialVoiceOrbProps> = ({
  status,
  isMuted,
  audioLevel,
  onOrbClick,
}) => {
  // Compute normalized audio scale factor (capped safely)
  const dynamicVoiceScale =
    status === 'listening' && !isMuted
      ? 1 + Math.min(0.28, (audioLevel / 100) * 0.28)
      : status === 'speaking'
      ? 1.08
      : 1;

  // Dynamic glow intensity
  const glowOpacity =
    status === 'speaking'
      ? 0.95
      : status === 'listening' && audioLevel > 5
      ? Math.min(0.9, 0.4 + (audioLevel / 100) * 0.5)
      : 0.35;

  return (
    <div
      onClick={onOrbClick}
      className="relative flex items-center justify-center cursor-pointer group select-none"
      title={
        status === 'speaking'
          ? 'Fima is speaking • Click to mute'
          : isMuted
          ? 'Microphone muted • Click to unmute'
          : 'Listening • Click to mute'
      }
    >
      {/* 1. Ultra-Wide Atmospheric Room Aura (Floor/Backdrop Radiance) */}
      <div
        className="absolute rounded-full transition-all duration-700 ease-out pointer-events-none"
        style={{
          width: '420px',
          height: '420px',
          opacity: glowOpacity,
          background:
            status === 'speaking'
              ? 'radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, rgba(6, 182, 212, 0.25) 35%, rgba(99, 102, 241, 0.15) 55%, transparent 75%)'
              : isMuted
              ? 'radial-gradient(circle, rgba(244, 63, 94, 0.3) 0%, rgba(225, 29, 72, 0.15) 40%, transparent 70%)'
              : status === 'listening' && audioLevel > 8
              ? 'radial-gradient(circle, rgba(56, 189, 248, 0.45) 0%, rgba(52, 211, 153, 0.3) 35%, rgba(147, 51, 234, 0.15) 55%, transparent 75%)'
              : 'radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, rgba(56, 189, 248, 0.08) 40%, transparent 70%)',
          filter: 'blur(45px)',
          transform: `scale(${dynamicVoiceScale * 1.15})`,
        }}
      />

      {/* 2. Concentric Spatial Sound Halo 1 (Expanding Ripples) */}
      <div
        className={`absolute rounded-full pointer-events-none transition-all duration-300 ${
          status === 'speaking'
            ? 'w-72 h-72 sm:w-84 sm:h-84 bg-gradient-to-tr from-emerald-500/20 via-teal-400/20 to-cyan-400/20 animate-pulse blur-xl'
            : status === 'listening' && audioLevel > 5
            ? 'w-68 h-68 sm:w-80 sm:h-80 bg-gradient-to-tr from-cyan-400/20 via-blue-500/20 to-violet-500/20 blur-lg'
            : 'w-56 h-56 bg-white/5 blur-md'
        }`}
        style={{
          transform: `scale(${dynamicVoiceScale * 1.08})`,
        }}
      />

      {/* 3. Concentric Spatial Sound Halo 2 (Harmonic Core Ripple) */}
      <div
        className={`absolute rounded-full pointer-events-none transition-all duration-150 ${
          status === 'speaking'
            ? 'w-60 h-60 sm:w-72 sm:h-72 border border-emerald-400/40 animate-ping opacity-25'
            : status === 'listening' && audioLevel > 15
            ? 'w-56 h-56 sm:w-68 sm:h-68 border border-cyan-300/40 animate-pulse opacity-30'
            : 'w-48 h-48 border border-white/5 opacity-10'
        }`}
        style={{
          transform: `scale(${dynamicVoiceScale})`,
        }}
      />

      {/* 4. The Spatial Living Orb Container */}
      <div
        className="relative w-44 h-44 sm:w-56 sm:h-56 flex items-center justify-center transition-transform duration-200 ease-out"
        style={{
          transform: `scale(${dynamicVoiceScale})`,
        }}
      >
        {/* Layer A: Outer Morphing Chromatic Aura (Siri Liquid Aurora) */}
        <div
          className={`absolute inset-0 transition-all duration-700 blur-md ${
            status === 'speaking'
              ? 'animate-spatial-morph-fast opacity-90'
              : status === 'listening' && audioLevel > 8
              ? 'animate-spatial-morph-fast opacity-85'
              : 'animate-spatial-morph opacity-60'
          }`}
          style={{
            background:
              status === 'speaking'
                ? 'conic-gradient(from 0deg, #10B981, #06B6D4, #3B82F6, #8B5CF6, #EC4899, #10B981)'
                : isMuted
                ? 'conic-gradient(from 45deg, #E11D48, #BE123C, #881337, #E11D48)'
                : status === 'connecting'
                ? 'conic-gradient(from 180deg, #F59E0B, #EC4899, #8B5CF6, #3B82F6, #F59E0B)'
                : 'conic-gradient(from 90deg, #06B6D4, #3B82F6, #10B981, #6366F1, #06B6D4)',
          }}
        />

        {/* Layer B: Reverse Morphing Iridescent Shell */}
        <div
          className="absolute inset-1 animate-spatial-morph-reverse opacity-80 mix-blend-screen transition-all duration-500"
          style={{
            background:
              status === 'speaking'
                ? 'radial-gradient(circle at 30% 30%, #34D399, #0EA5E9 45%, #6366F1 80%)'
                : isMuted
                ? 'radial-gradient(circle at 30% 30%, #FB7185, #E11D48 50%, #881337 90%)'
                : 'radial-gradient(circle at 35% 35%, #38BDF8, #2DD4BF 40%, #4F46E5 85%)',
          }}
        />

        {/* Layer C: Deep Glass Core with Fluid Volume */}
        <div
          className={`relative z-10 w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden transition-all duration-300 shadow-2xl flex items-center justify-center backdrop-blur-xl border border-white/30 ${
            status === 'speaking'
              ? 'bg-gradient-to-br from-emerald-500/40 via-teal-900/60 to-[#0A0D12]/90 shadow-[0_0_60px_rgba(16,185,129,0.5)]'
              : isMuted
              ? 'bg-gradient-to-br from-rose-600/40 via-rose-950/70 to-[#0A0D12]/90 shadow-[0_0_40px_rgba(225,29,72,0.4)]'
              : status === 'listening'
              ? 'bg-gradient-to-br from-cyan-500/30 via-slate-900/70 to-[#0A0D12]/90 shadow-[0_0_50px_rgba(6,182,212,0.4)]'
              : 'bg-gradient-to-br from-white/20 via-slate-900/80 to-[#0A0D12]/90 shadow-[0_0_30px_rgba(255,255,255,0.15)]'
          }`}
        >
          {/* Glass Specular Glint (Top Crescent Reflection) */}
          <div
            className="absolute top-1.5 inset-x-4 h-12 rounded-full pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.15) 60%, transparent 100%)',
              filter: 'blur(0.5px)',
            }}
          />

          {/* Internal Volumetric Refraction Shadow */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 120%, rgba(0, 0, 0, 0.8) 0%, transparent 70%)',
            }}
          />

          {/* Core Dynamic Entity / Living Siri Symbol */}
          <div className="relative z-20 flex flex-col items-center justify-center transition-all transform group-hover:scale-110 duration-200">
            {status === 'speaking' ? (
              <div className="relative flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-emerald-400/20 blur-sm absolute animate-ping" />
                <Volume2 className="w-9 h-9 sm:w-11 sm:h-11 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)] animate-pulse" />
              </div>
            ) : isMuted ? (
              <div className="relative flex items-center justify-center">
                <MicOff className="w-9 h-9 sm:w-11 sm:h-11 text-rose-300 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
              </div>
            ) : status === 'connecting' ? (
              <div className="relative flex items-center justify-center">
                <Radio className="w-9 h-9 sm:w-11 sm:h-11 text-amber-300 animate-spin" />
              </div>
            ) : (
              <div className="relative flex items-center justify-center">
                {/* Responsive Audio Waveform Core */}
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-cyan-400/20 blur-xs absolute transition-transform"
                  style={{
                    transform: `scale(${1 + Math.min(0.6, (audioLevel / 100) * 0.8)})`,
                  }}
                />
                <Mic
                  className={`w-9 h-9 sm:w-11 sm:h-11 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.8)] transition-all ${
                    audioLevel > 10 ? 'scale-110 text-cyan-200' : 'text-white/90'
                  }`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Outer Spatial Rim Highlight (Apple Vision Pro Fresnel Ring) */}
        <div
          className="absolute inset-0 rounded-full border border-white/40 pointer-events-none"
          style={{
            boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.6), inset 0 -2px 6px rgba(0, 0, 0, 0.7)',
          }}
        />
      </div>

      {/* 5. Fluid Spatial Ribbon Visualizer (Replacing Generic Rectangles) */}
      <div className="absolute -bottom-10 inset-x-0 flex items-center justify-center space-x-1.5 h-6 pointer-events-none">
        {[...Array(9)].map((_, i) => {
          // Calculate natural curved harmonic frequency
          const distanceFromCenter = Math.abs(i - 4);
          const weight = 1 - distanceFromCenter * 0.18;

          const ribbonHeight =
            status === 'speaking'
              ? Math.max(6, Math.sin(Date.now() / 160 + i * 0.6) * 14 + 16 * weight)
              : status === 'listening' && !isMuted
              ? Math.max(4, Math.min(32, (audioLevel / 100) * 36 * weight + 4))
              : 4;

          return (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-75 ${
                status === 'speaking'
                  ? 'bg-gradient-to-t from-emerald-400 to-cyan-300 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : status === 'listening' && !isMuted && audioLevel > 5
                  ? 'bg-gradient-to-t from-cyan-400 via-sky-200 to-white shadow-[0_0_8px_rgba(56,189,248,0.8)]'
                  : 'bg-white/20'
              }`}
              style={{
                height: `${ribbonHeight}px`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
