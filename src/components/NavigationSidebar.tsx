import React, { useEffect } from 'react';
import { X, Mic, History, Sun, Moon, LogOut, ChevronRight, LucideIcon, Download } from 'lucide-react';
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
  onOpenInstallModal?: () => void;
}

/**
 * Slide-over navigation drawer for phones.
 *
 * Behaviour is unchanged: opened by the header menu button, slides in from the
 * left, closes on backdrop click, Escape, or picking a section, and locks
 * background scroll while open.
 *
 * What changed is the feel. The panel animates on transform alone so it runs on
 * the compositor and stays smooth on a mid-range Android; it carries real
 * layered elevation so it reads as sitting above the page; and its rows arrive
 * a beat behind it rather than appearing all at once. All of it is disabled
 * outright for anyone whose system asks for reduced motion.
 */
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
  onOpenInstallModal,
}) => {
  // Lock background scroll when the drawer is open so only the drawer scrolls.
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

  /** Row index drives the stagger delay. */
  let step = 0;
  const delay = () => ({ ['--i' as string]: String(step++) }) as React.CSSProperties;

  return (
    <div
      className="fixed inset-0 z-50 md:hidden flex"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      <div className="lg-drawer-scrim backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <aside className="lg-drawer w-[19.5rem] max-w-[85vw] z-10 overscroll-contain touch-pan-y shadow-2xl">
        {/* iOS Drag Pill for tactile native mobile feel */}
        <div className="w-9 h-1 rounded-full bg-ink-4/35 mx-auto mt-2 -mb-1" aria-hidden="true" />

        {/* ---- Identity ---- */}
        <div className="flex items-center justify-between gap-3 px-4 h-16 border-b border-line shrink-0">
          <button
            onClick={() => {
              onClose();
              onTabChange('overview');
            }}
            className="flex items-center gap-2.5 min-w-0 text-left active:scale-95 transition-transform"
          >
            <LedgerLogo size={30} />
            <div className="min-w-0">
              <span className="t-card block tracking-tight">Fimara</span>
              <span className="t-meta block truncate">Financial OS</span>
            </div>
          </button>

          <button onClick={onClose} className="lg-iconbtn shrink-0 active:scale-90 transition-transform" aria-label="Close menu">
            <X className="w-5 h-5" strokeWidth={1.7} />
          </button>
        </div>

        {/* ---- Sections ---- */}
        <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y lg-stagger">
          <div className="px-4 pt-4 pb-1" style={delay()}>
            <span className="t-eyebrow">Go to</span>
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
                className="lg-row active:scale-[0.98] transition-transform"
                style={delay()}
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className="lg-row-icon"
                  aria-hidden="true"
                  style={
                    isActive
                      ? {
                          background: 'var(--lg-accent-soft)',
                          borderColor: 'transparent',
                          color: 'var(--lg-accent)',
                        }
                      : undefined
                  }
                >
                  <Icon className="w-[18px] h-[18px]" strokeWidth={1.7} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block truncate ${isActive ? 't-card' : 't-body text-ink'}`}>
                    {item.label}
                  </span>
                  {isActive && <span className="t-meta block">You are here</span>}
                </span>
                <ChevronRight
                  className="w-[18px] h-[18px] text-ink-4 shrink-0"
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
              </button>
            );
          })}

          {(onOpenLiveVoice || onOpenAuditLogs) && (
            <>
              <div className="px-4 pt-5 pb-1 mt-2 border-t border-line" style={delay()}>
                <span className="t-eyebrow">Tools</span>
              </div>

              {onOpenLiveVoice && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenLiveVoice();
                  }}
                  className="lg-row"
                  style={delay()}
                >
                  <span className="lg-row-icon" aria-hidden="true">
                    <Mic className="w-[18px] h-[18px]" strokeWidth={1.7} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="t-body text-ink block">Live Voice Fima</span>
                    <span className="t-meta block">Talk through your finances</span>
                  </span>
                  <ChevronRight
                    className="w-[18px] h-[18px] text-ink-4 shrink-0"
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                </button>
              )}

              {onOpenAuditLogs && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuditLogs();
                  }}
                  className="lg-row"
                  style={delay()}
                >
                  <span className="lg-row-icon" aria-hidden="true">
                    <History className="w-[18px] h-[18px]" strokeWidth={1.7} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="t-body text-ink block">Audit log</span>
                    <span className="t-meta block">Every fund movement, in order</span>
                  </span>
                  <ChevronRight
                    className="w-[18px] h-[18px] text-ink-4 shrink-0"
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                </button>
              )}

              {onOpenInstallModal && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenInstallModal();
                  }}
                  className="lg-row"
                  style={delay()}
                >
                  <span className="lg-row-icon text-amber-500" aria-hidden="true">
                    <Download className="w-[18px] h-[18px]" strokeWidth={1.7} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="t-body text-ink block">Install Fimara</span>
                    <span className="t-meta block">Add to Home Screen or Desktop</span>
                  </span>
                  <ChevronRight
                    className="w-[18px] h-[18px] text-ink-4 shrink-0"
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                </button>
              )}
            </>
          )}
        </div>

        {/* ---- Account ---- */}
        <div className="border-t border-line p-4 bg-sunken shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="t-card truncate">{user?.username || 'User'}</div>
              <div className="t-meta truncate">{user?.email}</div>
            </div>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="lg-btn lg-btn-quiet lg-btn-sm shrink-0"
            >
              {resolvedTheme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                  Light
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                  Dark
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
              className="lg-btn lg-btn-danger lg-btn-block mt-4"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
              Sign out
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};
