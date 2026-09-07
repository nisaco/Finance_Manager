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
  Shield,
  LogOut,
  User,
  Sparkles,
  Mic,
  Menu,
  X,
  Crown,
  ShieldCheck,
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  currentTab?: string;
  setCurrentTab?: (tab: string) => void;
  onOpenNewTx: () => void;
  onOpenAuditLogs?: () => void;
  onOpenLiveVoice?: () => void;
  onOpenAdminModal?: () => void;
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

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Wallet },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'budgets', label: 'Budgets', icon: Scale },
    { id: 'goals', label: 'Savings Goals', icon: PiggyBank },
    { id: 'debts', label: 'Debts', icon: Layers },
    { id: 'reports', label: 'Reports', icon: PieChart },
    { id: 'ai-advisor', label: 'Fima AI', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF]/95 dark:bg-[#181A20]/95 backdrop-blur-md border-b border-[#E8E5DF] dark:border-[#2D323F] transition-colors shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Tier: Brand, Profile Switcher & Action Tools */}
        <div className="flex items-center justify-between h-14 sm:h-15">
          
          {/* Left: Brand & Profile Selector */}
          <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
            <button
              onClick={() => handleTabChange('overview')}
              className="flex items-center space-x-2 sm:space-x-2.5 text-left group focus:outline-none shrink-0"
              title="Ledger Financial Platform"
              id="navbar-brand-button"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] dark:bg-[#F3F4F6] border border-[#1A1A1A] dark:border-[#F3F4F6] flex items-center justify-center text-[#FFFFFF] dark:text-[#111317] font-display text-base font-bold tracking-tighter group-hover:bg-[#333333] dark:group-hover:bg-[#E5E7EB] transition-colors shadow-xs">
                L
              </div>
              <div>
                <span className="font-display text-sm sm:text-base font-bold tracking-tight text-[#1A1A1A] dark:text-[#F3F4F6] block leading-none">
                  Ledger
                </span>
                <span className="text-[9px] tracking-widest uppercase text-[#6B7280] dark:text-[#9CA3AF] font-mono-num hidden sm:block mt-0.5">
                  Editorial Edition
                </span>
              </div>
            </button>

            {/* Vertical Divider */}
            <div className="h-4 sm:h-5 w-px bg-[#E8E5DF] dark:border-[#2D323F] shrink-0" />

            {/* Profile Selector Badge */}
            {activeProfile && (
              <div className="relative min-w-0">
                <button
                  id="navbar-profile-selector-btn"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-2.5 py-1.5 rounded-lg bg-[#F7F5F2] dark:bg-[#22252E] border border-[#E8E5DF] dark:border-[#2D323F] hover:border-[#D5D0C7] dark:hover:border-[#3A404F] text-xs font-medium text-[#1A1A1A] dark:text-[#F3F4F6] transition-all max-w-[110px] xs:max-w-[150px] sm:max-w-[240px]"
                  aria-label="Switch profile"
                >
                  <span
                    className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: activeProfile.color || '#1A1A1A' }}
                  />
                  <span className="truncate">{activeProfile.name}</span>
                  {activeProfile.isLocked && (
                    <span title="PIN Protected Profile">
                      <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                    </span>
                  )}
                  {/* Currency hidden on mobile view per user requirement */}
                  <span className="text-[#6B7280] dark:text-[#9CA3AF] font-mono-num text-[11px] shrink-0 hidden sm:inline">
                    ({activeProfile.displayCurrency})
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF] shrink-0" />
                </button>

                {profileDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileDropdownOpen(false)}
                    />
                    <div className="absolute left-0 mt-2 w-64 rounded-xl bg-[#FFFFFF] dark:bg-[#282C37] border border-[#E8E5DF] dark:border-[#2D323F] shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-1.5 border-b border-[#E8E5DF] dark:border-[#2D323F] flex items-center justify-between text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] font-mono-num font-bold">
                        <span>Profiles</span>
                        <span>{profiles.length} Active</span>
                      </div>

                      <div className="max-h-60 overflow-y-auto py-1">
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
                              className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-[#F7F5F2] dark:hover:bg-[#22252E] transition-colors ${
                                isCurrent
                                  ? 'text-[#1A1A1A] dark:text-[#F3F4F6] font-bold bg-[#F7F5F2]/80 dark:bg-[#22252E]/80'
                                  : 'text-[#4B5563] dark:text-[#9CA3AF]'
                              }`}
                            >
                              <div className="flex items-center space-x-2 truncate mr-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                                  style={{ backgroundColor: p.color }}
                                />
                                <span className="truncate">{p.name}</span>
                              </div>

                              <div className="flex items-center space-x-1.5 shrink-0">
                                {p.isLocked && (
                                  <span
                                    title={isLockedForUser ? 'Locked with PIN' : 'Unlocked in this session'}
                                    className={`p-0.5 rounded ${
                                      isLockedForUser
                                        ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                                        : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                                    }`}
                                  >
                                    {isLockedForUser ? (
                                      <Lock className="w-3 h-3" />
                                    ) : (
                                      <Unlock className="w-3 h-3" />
                                    )}
                                  </span>
                                )}
                                <span className="font-mono-num text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                                  {p.displayCurrency}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Dropdown Actions */}
                      <div className="pt-1 mt-1 border-t border-[#E8E5DF] dark:border-[#2D323F] px-1 space-y-0.5">
                        {activeProfile.isLocked && (
                          <button
                            onClick={() => {
                              lockProfile(activeProfile.id);
                              setProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors font-medium"
                          >
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>Lock Active Profile Now</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            openCreateProfileModal();
                          }}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-[#1A1A1A] dark:text-[#F3F4F6] hover:bg-[#F7F5F2] dark:hover:bg-[#22252E] rounded-lg transition-colors font-semibold"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>+ Create New Profile</span>
                        </button>

                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            handleTabChange('settings');
                          }}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F7F5F2] dark:hover:bg-[#22252E] rounded-lg transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5 shrink-0" />
                          <span>Manage All Profiles</span>
                        </button>

                        {user && (
                          <div className="pt-2 mt-1.5 border-t border-[#E8E5DF] dark:border-[#2D323F]">
                            <div className="px-2.5 py-1.5 bg-[#FAF9F6] dark:bg-[#1E2330] rounded-lg mb-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-mono tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
                                  Account
                                </span>
                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.5 rounded">
                                  Paystack Linked
                                </span>
                              </div>
                              <div className="text-xs font-bold text-[#1A1A1A] dark:text-[#F3F4F6] truncate mt-0.5">
                                @{user.username}
                              </div>
                              <div className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] truncate">
                                {user.email}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                logout();
                              }}
                              className="w-full flex items-center justify-center space-x-1.5 px-2.5 py-1.5 text-xs text-[#B91C1C] dark:text-[#FCA5A5] bg-[#FEF2F2] dark:bg-[#450A0A]/30 border border-[#FCA5A5] dark:border-[#7F1D1D] hover:bg-[#FEE2E2] dark:hover:bg-[#450A0A]/50 rounded-lg transition-colors font-semibold"
                            >
                              <LogOut className="w-3.5 h-3.5 shrink-0" />
                              <span>Sign Out</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: Action Tools */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
            {/* Desktop-only: Admin God Mode button if user has role admin */}
            {user?.role === 'admin' && onOpenAdminModal && (
              <button
                onClick={onOpenAdminModal}
                title="Open God-Mode Administrative Console (Payouts, Vaults & System)"
                aria-label="Admin God Mode"
                className="hidden md:flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 shrink-0"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Admin God Mode</span>
              </button>
            )}

            {/* Desktop-only: Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle theme"
              className="hidden md:flex p-1.5 sm:p-2 rounded-lg bg-[#F7F5F2] dark:bg-[#22252E] hover:bg-[#E8E5DF] dark:hover:bg-[#2D323F] border border-[#E8E5DF] dark:border-[#2D323F] text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] transition-all"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-[#4B5563]" />
              )}
            </button>

            {/* Fima Voice Launcher - Hidden on mobile navbar per request, accessible via mobile drawer */}
            {onOpenLiveVoice && (
              <button
                onClick={onOpenLiveVoice}
                title="Talk with Voice Fima (Financial AI)"
                aria-label="Talk with Voice Fima"
                className="hidden md:flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-xs shrink-0"
              >
                <Mic className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-bold text-[11px] sm:text-xs">Voice Fima</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              </button>
            )}

            {/* Add Entry Button */}
            <button
              onClick={onOpenNewTx}
              aria-label="Add transaction entry"
              className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] dark:bg-[#F3F4F6] dark:hover:bg-[#E5E7EB] dark:text-[#111317] rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Add Entry</span>
            </button>

            {/* Desktop-only: Audit Logs */}
            {onOpenAuditLogs && (
              <button
                onClick={onOpenAuditLogs}
                title="System Audit & Fund Movement Log"
                aria-label="System audit log"
                className="p-1.5 sm:p-2 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] hover:bg-[#F7F5F2] dark:hover:bg-[#22252E] border border-transparent hover:border-[#E8E5DF] dark:border-[#2D323F] rounded-lg transition-colors hidden md:block"
              >
                <History className="w-4 h-4" />
              </button>
            )}

            {/* Desktop-only: Direct Sign Out Button */}
            {user && (
              <button
                onClick={() => logout()}
                title={`Sign out of account (@${user.username})`}
                aria-label="Sign out"
                className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#F7F5F2] dark:bg-[#22252E] hover:bg-[#FEF2F2] dark:hover:bg-[#450A0A]/40 border border-[#E8E5DF] dark:border-[#2D323F] hover:border-[#FCA5A5] dark:hover:border-[#7F1D1D] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#B91C1C] dark:hover:text-[#FCA5A5] text-xs font-medium transition-all"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs font-semibold">Sign Out</span>
              </button>
            )}

            {/* Mobile Hamburger Drawer Trigger - STRICTLY MOBILE VIEW ONLY */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open mobile navigation menu"
              className="md:hidden p-2 rounded-lg bg-[#F7F5F2] dark:bg-[#22252E] hover:bg-[#E8E5DF] dark:hover:bg-[#2D323F] border border-[#E8E5DF] dark:border-[#2D323F] text-[#4B5563] dark:text-[#9CA3AF] transition-all shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Tier: Primary Navigation Bar (DESKTOP ONLY - Hidden on Mobile) */}
        <div className="hidden md:block border-t border-[#E8E5DF] dark:border-[#2D323F]/80 py-1.5 sm:py-2">
          <nav className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto scrollbar-none" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = effectiveTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => handleTabChange(item.id)}
                  className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    isActive
                      ? 'bg-[#1A1A1A] text-[#FFFFFF] dark:bg-[#F3F4F6] dark:text-[#111317] shadow-xs'
                      : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] hover:bg-[#F7F5F2] dark:hover:bg-[#22252E]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Slide-Over Navigation Drawer - STRICTLY MOBILE ONLY */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Body - Full Height and Substantial Width */}
          <div className="relative w-80 sm:w-96 max-w-[88vw] h-full min-h-[100dvh] bg-[#FFFFFF] dark:bg-[#15181E] border-r border-[#E8E5DF] dark:border-[#2D323F] shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200">
            {/* Top drawer header */}
            <div className="p-4 border-b border-[#E8E5DF] dark:border-[#2D323F] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] dark:bg-[#F3F4F6] text-[#FFFFFF] dark:text-[#111317] flex items-center justify-center font-bold text-sm shadow-xs">
                  L
                </div>
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
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F7F5F2] dark:hover:bg-[#22252E] transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Middle nav list - Houses all Navigation Tabs in place of navbar on mobile */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {/* If Admin, prominent God Mode Quick Access */}
              {user?.role === 'admin' && onOpenAdminModal && (
                <button
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    onOpenAdminModal();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-xs mb-2 active:scale-98 transition-all"
                >
                  <div className="flex items-center space-x-2">
                    <Crown className="w-4 h-4" />
                    <span>Admin God Mode Portal</span>
                  </div>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">2% / 10% Fees</span>
                </button>
              )}

              <div className="text-[10px] font-mono-num font-bold uppercase tracking-wider text-[#9CA3AF] dark:text-[#6B7280] px-3 py-1">
                Main Navigation
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = effectiveTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#1A1A1A] text-white dark:bg-[#F3F4F6] dark:text-[#111317] shadow-xs'
                        : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F7F5F2] dark:hover:bg-[#22252E] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="pt-3 border-t border-[#E8E5DF] dark:border-[#2D323F] space-y-1">
                <div className="text-[10px] font-mono-num font-bold uppercase tracking-wider text-[#9CA3AF] dark:text-[#6B7280] px-3 py-1">
                  Actions &amp; Logs
                </div>
                {onOpenLiveVoice && (
                  <button
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      onOpenLiveVoice();
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Mic className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Live Voice Fima (AI)</span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  </button>
                )}
                {onOpenAuditLogs && (
                  <button
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      onOpenAuditLogs();
                    }}
                    className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F7F5F2] dark:hover:bg-[#22252E] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] transition-colors"
                  >
                    <History className="w-4 h-4" />
                    <span>Audit &amp; Movement Log</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Drawer User Footer */}
            <div className="p-3.5 border-t border-[#E8E5DF] dark:border-[#2D323F] bg-[#FDFCFB] dark:bg-[#111317] space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="text-xs">
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
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#22252E] text-[#4B5563] dark:text-[#9CA3AF] text-xs font-medium"
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
                    setMobileDrawerOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 font-semibold text-xs hover:bg-red-100 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
