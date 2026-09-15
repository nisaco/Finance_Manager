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
 */
export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  isOpen,
  onClose,
  effectiveTab,
  onTabChange,
  navItems,
  user,
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

      <aside className="lg-drawer w-[14.75rem] max-w-[60vw] sm:w-[16.5rem] z-10 overscroll-contain touch-pan-y shadow-2xl pt-[max(env(safe-area-inset-top,0px),2.25rem)]">
        {/* iOS Drag Pill for tactile native mobile feel */}
        <div className="w-8 h-1 rounded-full bg-ink-4/30 mx-auto -mt-1 mb-2.5 shrink-0" aria-hidden="true" />

        {/* ---- Identity ---- */}
        <div className="flex items-center justify-between gap-2 px-3.5 pb-3 min-h-[3.5rem] border-b border-line shrink-0">
          <button
            onClick={() => {
              onClose();
              onTabChange('overview');
            }}
            className="flex items-center gap-2 min-w-0 text-left active:scale-95 transition-transform"
          >
            <LedgerLogo size={28} />
            <div className="min-w-0">
              <span className="t-card block tracking-tight text-sm font-bold truncate">Fimara</span>
              <span className="t-meta block truncate text-[10px]">Financial OS</span>
            </div>
          </button>

          <button onClick={onClose} className="lg-iconbtn shrink-0 active:scale-90 transition-transform p-1.5" aria-label="Close menu">
            <X className="w-4 h-4" strokeWidth={1.7} />
          </button>
        </div>

        {/* ---- Sections ---- */}
        <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y lg-stagger">
          <div className="px-3.5 pt-3 pb-1" style={delay()}>
            <span className="t-eyebrow text-[10px]">Go to</span>
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
                className="lg-row !min-h-[50px] !py-2.5 !px-3.5 active:scale-[0.98] transition-transform"
                style={delay()}
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className="lg-row-icon !w-[32px] !h-[32px] !rounded-lg"
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
                  <Icon className="w-4 h-4" strokeWidth={1.7} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block truncate ${isActive ? 't-card text-xs font-semibold' : 't-body text-xs text-ink'}`}>
                    {item.label}
                  </span>
                  {isActive && <span className="t-meta block text-[10px] leading-tight">Current</span>}
                </span>
                <ChevronRight
                  className="w-3.5 h-3.5 text-ink-4 shrink-0"
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
              </button>
            );
          })}

          {(onOpenLiveVoice || onOpenAuditLogs || onOpenInstallModal) && (
            <>
              <div className="px-3.5 pt-4 pb-1 mt-1 border-t border-line" style={delay()}>
                <span className="t-eyebrow text-[10px]">Tools</span>
              </div>

              {onOpenLiveVoice && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenLiveVoice();
                  }}
                  className="lg-row !min-h-[50px] !py-2.5 !px-3.5"
                  style={delay()}
                >
                  <span className="lg-row-icon !w-[32px] !h-[32px] !rounded-lg" aria-hidden="true">
                    <Mic className="w-4 h-4" strokeWidth={1.7} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="t-body text-xs text-ink block truncate">Live Voice Fima</span>
                    <span className="t-meta block text-[10px] truncate">Talk with AI</span>
                  </span>
                  <ChevronRight
                    className="w-3.5 h-3.5 text-ink-4 shrink-0"
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
                  className="lg-row !min-h-[50px] !py-2.5 !px-3.5"
                  style={delay()}
                >
                  <span className="lg-row-icon !w-[32px] !h-[32px] !rounded-lg" aria-hidden="true">
                    <History className="w-4 h-4" strokeWidth={1.7} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="t-body text-xs text-ink block truncate">Audit log</span>
                    <span className="t-meta block text-[10px] truncate">Fund movement</span>
                  </span>
                  <ChevronRight
                    className="w-3.5 h-3.5 text-ink-4 shrink-0"
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
                  className="lg-row !min-h-[50px] !py-2.5 !px-3.5"
                  style={delay()}
                >
                  <span className="lg-row-icon !w-[32px] !h-[32px] !rounded-lg text-amber-500" aria-hidden="true">
                    <Download className="w-4 h-4" strokeWidth={1.7} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="t-body text-xs text-ink block truncate">Install App</span>
                    <span className="t-meta block text-[10px] truncate">Add to Home Screen</span>
                  </span>
                  <ChevronRight
                    className="w-3.5 h-3.5 text-ink-4 shrink-0"
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                </button>
              )}
            </>
          )}
        </div>

        {/* ---- Account ---- */}
        <div className="border-t border-line p-3 pb-[max(env(safe-area-inset-bottom,0px),1.25rem)] bg-sunken shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="t-card truncate text-xs font-semibold">{user?.username || 'User'}</div>
              <div className="t-meta truncate text-[10px]">{user?.email}</div>
            </div>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="lg-btn lg-btn-quiet lg-btn-sm shrink-0 text-xs px-2 py-1"
            >
              {resolvedTheme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5" strokeWidth={1.7} aria-hidden="true" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" strokeWidth={1.7} aria-hidden="true" />
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
              className="lg-btn lg-btn-danger lg-btn-block mt-3 text-xs py-2"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.7} aria-hidden="true" />
              Sign out
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};
