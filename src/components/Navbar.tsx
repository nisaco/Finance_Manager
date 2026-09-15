import React, { useState } from 'react';
import {
  Wallet,
  Receipt,
  PiggyBank,
  PieChart,
  Scale,
  Settings,
  History,
  Plus,
  ChevronDown,
  Layers,
  Sun,
  Moon,
  Lock,
  Unlock,
  UserPlus,
  LogOut,
  Sparkles,
  Mic,
  Crown,
  Menu,
  Download,
  Check,
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { NavigationSidebar } from './NavigationSidebar';
import { LedgerLogo } from './LedgerLogo';
import { InstallPwaModal, usePwaInstall } from './Modals/InstallPwaModal';

interface NavbarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  currentTab?: string;
  setCurrentTab?: (tab: string) => void;
  onOpenNewTx: () => void;
  onOpenAuditLogs?: () => void;
  onOpenLiveVoice?: () => void;
  onOpenAdminModal?: () => void;
  onOpenStealthAdmin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  currentTab,
  setCurrentTab,
  onOpenNewTx,
  onOpenAuditLogs,
  onOpenLiveVoice,
  onOpenAdminModal,
  onOpenStealthAdmin,
}) => {
  const effectiveTab = activeTab || currentTab || 'overview';
  const handleTabChange = (tab: string) => {
    if (onTabChange) onTabChange(tab);
    else if (setCurrentTab) setCurrentTab(tab);
    setMobileDrawerOpen(false);
  };
  const {
    profiles,
    activeProfile,
    selectProfile,
    isProfileLockedForUser,
    openCreateProfileModal,
    lockProfile,
  } = useLedger();
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const { isInstalled } = usePwaInstall();

  const isAdmin =
    user?.role === 'admin' ||
    user?.email?.toLowerCase() === 'jnkpappoe@gmail.com';

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Wallet },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'history', label: 'Monthly History', icon: History },
    { id: 'budgets', label: 'Budgets', icon: Scale },
    { id: 'goals', label: 'Savings Goals', icon: PiggyBank },
    { id: 'debts', label: 'Debts', icon: Layers },
    { id: 'reports', label: 'Reports', icon: PieChart },
    { id: 'ai-advisor', label: 'Fima AI', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Crown }] : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface/85 backdrop-blur-md border-b border-line transition-colors pt-[max(env(safe-area-inset-top,0px),0px)]">
        <div className="lg-page pt-1 sm:pt-1.5">
          {/* ---- Identity, profile, tools ---------------------------------- */}
          <div className="flex items-center justify-between h-16 sm:h-[4.25rem]">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {/* Menu for Mobile */}
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="lg-iconbtn md:hidden shrink-0 -ml-1 active:scale-95 transition-transform"
                aria-label="Open navigation menu"
                aria-expanded={mobileDrawerOpen}
                id="navbar-menu-button"
              >
                <Menu className="w-5 h-5" strokeWidth={1.7} />
              </button>

              <button
                onClick={() => handleTabChange('overview')}
                className="flex items-center gap-2.5 text-left shrink-0 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded-lg active:scale-95 transition-transform"
                title="Fimara Financial Operating System"
                id="navbar-brand-button"
              >
                <LedgerLogo size={30} />
                <span className="t-card hidden xs:block sm:text-base tracking-tight">Fimara</span>
              </button>

              <span className="h-5 w-px bg-line shrink-0 hidden xs:block" aria-hidden="true" />

              {/* Profile switcher */}
              {activeProfile && (
                <div className="relative min-w-0">
                  <button
                    id="navbar-profile-selector-btn"
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 h-8.5 px-2.5 rounded-lg border border-line bg-sunken hover:border-line-strong active:scale-95 transition-all max-w-[150px] sm:max-w-[220px] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    aria-label="Switch profile"
                    aria-expanded={profileDropdownOpen}
                  >
                    <span
                      className="w-2 h-2 rounded-full ring-2 ring-line/50 shrink-0"
                      style={{ backgroundColor: activeProfile.color || 'var(--lg-ink)' }}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold truncate text-ink">{activeProfile.name}</span>
                    {activeProfile.isLocked && (
                      <span title="PIN protected profile" className="shrink-0">
                        <Lock className="w-3 h-3 text-warn" strokeWidth={1.8} />
                      </span>
                    )}
                    <span className="text-[10px] font-mono-num font-bold text-ink-muted bg-canvas/70 px-1 py-0.5 rounded border border-line/60 shrink-0 hidden sm:inline">
                      {activeProfile.displayCurrency}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-ink-4 shrink-0 transition-transform duration-200 ${
                        profileDropdownOpen ? 'rotate-180' : ''
                      }`}
                      strokeWidth={1.8}
                    />
                  </button>

                  {profileDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setProfileDropdownOpen(false)}
                      />
                      <div className="lg-pop fixed left-3 right-3 sm:absolute sm:left-0 sm:right-auto top-[3.75rem] sm:top-full sm:mt-1.5 sm:w-64 sm:max-w-none z-50 overflow-hidden shadow-xl rounded-xl border border-line bg-surface p-0 animate-in fade-in-50 zoom-in-95 duration-150">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-line bg-sunken/40">
                          <span className="text-[10px] uppercase font-mono-num font-bold tracking-wider text-ink-muted">Switch Workspace</span>
                          <span className="text-[10px] font-mono-num font-bold text-ink-muted">{profiles.length} active</span>
                        </div>

                        <div className="max-h-52 overflow-y-auto p-1 space-y-0.5 overscroll-contain">
                          {profiles.map((p) => {
                            const isCurrent = p.id === activeProfile?.id;
                            const isLockedForUser = isProfileLockedForUser(p);

                            return (
                              <button
                                key={p.id}
                                onClick={() => {
                                  selectProfile(p.id);
                                  setProfileDropdownOpen(false);
                                }}
                                className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors text-xs ${
                                  isCurrent ? 'bg-sunken text-ink font-semibold' : 'text-ink-2 hover:text-ink hover:bg-sunken/60'
                                }`}
                                aria-current={isCurrent ? 'true' : undefined}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: p.color }}
                                    aria-hidden="true"
                                  />
                                  <span className="truncate text-xs">{p.name}</span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {p.isLocked && (
                                    <span title={isLockedForUser ? 'Locked' : 'Unlocked'} className="shrink-0">
                                      {isLockedForUser ? (
                                        <Lock className="w-3 h-3 text-warn" strokeWidth={1.8} />
                                      ) : (
                                        <Unlock className="w-3 h-3 text-pos" strokeWidth={1.8} />
                                      )}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-mono-num font-bold text-ink-muted">
                                    {p.displayCurrency}
                                  </span>
                                  {isCurrent && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="border-t border-line p-1 bg-sunken/30 space-y-0.5">
                          {activeProfile.isLocked && (
                            <button
                              onClick={() => {
                                lockProfile(activeProfile.id);
                                setProfileDropdownOpen(false);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-warn hover:bg-warn-soft flex items-center gap-2 transition-colors text-left"
                            >
                              <Lock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
                              <span>Lock current workspace</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              openCreateProfileModal();
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-ink hover:bg-sunken flex items-center gap-2 transition-colors text-left"
                          >
                            <UserPlus className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
                            <span>New profile workspace</span>
                          </button>

                          <button
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              handleTabChange('settings');
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-ink-3 hover:text-ink hover:bg-sunken flex items-center gap-2 transition-colors text-left"
                          >
                            <Settings className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
                            <span>Manage profiles</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Tools. Desktop only */}
            <div className="hidden md:flex items-center gap-1.5 shrink-0">
              <button
                onClick={toggleTheme}
                title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
                aria-label="Toggle theme"
                className="lg-iconbtn"
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="w-[18px] h-[18px]" strokeWidth={1.7} />
                ) : (
                  <Moon className="w-[18px] h-[18px]" strokeWidth={1.7} />
                )}
              </button>

              {onOpenAuditLogs && (
                <button
                  onClick={onOpenAuditLogs}
                  title="System audit and fund movement log"
                  aria-label="System audit log"
                  className="lg-iconbtn"
                >
                  <History className="w-[18px] h-[18px]" strokeWidth={1.7} />
                </button>
              )}

              {onOpenLiveVoice && (
                <button
                  onClick={onOpenLiveVoice}
                  title="Talk with Voice Fima"
                  aria-label="Talk with Voice Fima"
                  className="lg-btn lg-btn-quiet lg-btn-sm"
                >
                  <Mic className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                  Voice Fima
                </button>
              )}

              {!isInstalled && (
                <button
                  onClick={() => setShowInstallModal(true)}
                  title="Install Fimara App"
                  aria-label="Install Fimara App"
                  className="lg-btn lg-btn-quiet lg-btn-sm"
                >
                  <Download className="w-4 h-4 text-amber-500" strokeWidth={1.8} aria-hidden="true" />
                  <span className="hidden lg:inline">Install</span>
                </button>
              )}

              <button
                onClick={onOpenNewTx}
                aria-label="Record an entry"
                className="lg-btn lg-btn-solid lg-btn-sm"
              >
                <Plus className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
                Record entry
              </button>
            </div>

            {/* The primary action stays on screen at every width */}
            <button
              onClick={onOpenNewTx}
              aria-label="Record an entry"
              className="lg-btn lg-btn-solid md:hidden shrink-0 w-11 px-0"
            >
              <Plus className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>

          {/* ---- Desktop section navigation -------------------------------- */}
          <nav
            className="hidden md:flex items-center gap-1.5 border-t border-line py-2 overflow-x-auto scrollbar-none"
            aria-label="Sections"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = effectiveTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => handleTabChange(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-2 h-9 px-3 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.96] ${
                    isActive
                      ? 'bg-solid text-on-solid shadow-xs'
                      : 'text-ink-3 hover:text-ink hover:bg-sunken'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.7} aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ---- Phone navigation -------------------------------------------- */}
      <NavigationSidebar
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        effectiveTab={effectiveTab}
        onTabChange={handleTabChange}
        navItems={navItems}
        user={user}
        activeProfile={activeProfile}
        resolvedTheme={resolvedTheme}
        toggleTheme={toggleTheme}
        logout={logout}
        onOpenLiveVoice={onOpenLiveVoice}
        onOpenAuditLogs={onOpenAuditLogs}
        onOpenInstallModal={!isInstalled ? () => setShowInstallModal(true) : undefined}
      />

      {/* Install PWA Modal */}
      <InstallPwaModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </>
  );
};
