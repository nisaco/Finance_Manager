import React, { useEffect } from 'react';
import {
  X,
  Mic,
  History,
  Sun,
  Moon,
  LogOut,
  LucideIcon,
} from 'lucide-react';
import { Profile, User } from '../types';
import { LedgerLogo } from './LedgerLogo';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface NavigationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  effectiveTab: string;
  onTabChange: (tab: string) => void;
  navItems: NavItem[];
  user: User | null;
  activeProfile?: Profile | null;
  resolvedTheme: 'light' | 'dark';
  toggleTheme: () => void;
  logout: () => void;
  onOpenLiveVoice?: () => void;
  onOpenAuditLogs?: () => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  isOpen,
  onClose,
  effectiveTab,
  onTabChange,
  navItems,
  user,
  activeProfile,
  resolvedTheme,
  toggleTheme,
  logout,
  onOpenLiveVoice,
  onOpenAuditLogs,
}) => {
  // Lock background scroll when sidebar is open so ONLY the sidebar can scroll
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = prevOverflow === 'hidden' ? '' : prevOverflow;
        document.body.style.touchAction = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true" aria-label="Navigation Menu">
      {/* 1. Backdrop: Blurs the rest of the screen as requested */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 2. Sidebar Drawer: Completely OPAQUE, ZERO transparency, ZERO glass effect */}
      <aside
        className="relative w-72 sm:w-80 max-w-[85vw] h-[100dvh] max-h-[100dvh] bg-white dark:bg-[#11141C] border-r border-[#E5E7EB] dark:border-[#222733] shadow-[0_25px_60px_rgba(0,0,0,0.4)] flex flex-col justify-between z-10 animate-in slide-in-from-left duration-300 ease-out overscroll-contain touch-pan-y overflow-hidden"
      >
        {/* Top Header: 100% Solid Opaque Background */}
        <div className="p-4 border-b border-[#E5E7EB] dark:border-[#222733] flex items-center justify-between shrink-0 bg-[#F9FAFB] dark:bg-[#161A24]">
          <div
            onClick={() => {
              onClose();
              onTabChange('overview');
            }}
            className="flex items-center space-x-2.5 cursor-pointer group"
          >
            <LedgerLogo size={32} />
            <div>
              <div className="font-display font-bold text-sm tracking-tight text-[#1A1A1A] dark:text-[#F3F4F6]">
                Ledger
              </div>
              <div className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">
                {user ? `@${user.username}` : 'Financial OS'} • {activeProfile?.name || 'Active'}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B7280] dark:text-[#9CA3AF] hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Middle Nav Items: Strictly scrolls inside sidebar */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-1 touch-pan-y bg-white dark:bg-[#11141C]">
          <div className="text-[10px] font-mono-num font-bold uppercase tracking-wider text-[#9CA3AF] dark:text-[#6B7280] px-3 py-1">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = effectiveTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  onClose();
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer ${
                  isActive
                    ? 'bg-[#1A1A1A] text-white dark:bg-[#F3F4F6] dark:text-[#111317] shadow-xs'
                    : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#222733] space-y-1">
            <div className="text-[10px] font-mono-num font-bold uppercase tracking-wider text-[#9CA3AF] dark:text-[#6B7280] px-3 py-1">
              Actions &amp; Logs
            </div>
            {onOpenLiveVoice && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLiveVoice();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <Mic className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Live Voice Fima</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </button>
            )}
            {onOpenAuditLogs && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAuditLogs();
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] transition-all active:scale-[0.98] cursor-pointer"
              >
                <History className="w-4 h-4" />
                <span>Audit Log</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Drawer User Footer: 100% Solid Opaque Background */}
        <div className="p-3.5 border-t border-[#E5E7EB] dark:border-[#222733] bg-[#F9FAFB] dark:bg-[#161A24] space-y-2.5 shrink-0 overscroll-contain">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs min-w-0 pr-2">
              <span className="font-bold text-[#1A1A1A] dark:text-[#F3F4F6] block truncate">
                {user?.username || 'User'}
              </span>
              <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] truncate block">
                {user?.email}
              </span>
            </div>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#2D323F] bg-white dark:bg-[#22252E] text-[#4B5563] dark:text-[#9CA3AF] text-xs font-medium shrink-0 cursor-pointer"
            >
              {resolvedTheme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#4B5563]" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>

          {user && (
            <button
              onClick={() => {
                onClose();
                logout();
              }}
              className="w-full flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 font-semibold text-xs hover:bg-red-100 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};
