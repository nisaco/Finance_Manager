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
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  currentTab,
  setCurrentTab,
  onOpenNewTx,
  onOpenAuditLogs,
  onOpenLiveVoice,
}) => {
  const effectiveTab = activeTab || currentTab || 'overview';
  const handleTabChange = onTabChange || setCurrentTab || (() => {});
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
                  className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 py-1.5 rounded-lg bg-[#F7F5F2] dark:bg-[#22252E] border border-[#E8E5DF] dark:border-[#2D323F] hover:border-[#D5D0C7] dark:hover:border-[#3A404F] text-xs font-medium text-[#1A1A1A] dark:text-[#F3F4F6] transition-all max-w-[140px] xs:max-w-[180px] sm:max-w-[240px]"
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
                  <span className="text-[#6B7280] dark:text-[#9CA3AF] font-mono-num text-[11px] shrink-0">
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
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle theme"
              className="p-1.5 sm:p-2 rounded-lg bg-[#F7F5F2] dark:bg-[#22252E] hover:bg-[#E8E5DF] dark:hover:bg-[#2D323F] border border-[#E8E5DF] dark:border-[#2D323F] text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] transition-all"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-[#4B5563]" />
              )}
            </button>

            {/* Fima Voice Launcher */}
            {onOpenLiveVoice && (
              <button
                onClick={onOpenLiveVoice}
                title="Talk with Fima (Finance Manager AI)"
                aria-label="Talk with Fima"
                className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-2xs"
              >
                <Mic className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden md:inline">Voice Fima</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse hidden sm:inline" />
              </button>
            )}

            {/* Add Entry Button */}
            <button
              onClick={onOpenNewTx}
              aria-label="Add transaction entry"
              className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] dark:bg-[#F3F4F6] dark:hover:bg-[#E5E7EB] dark:text-[#111317] rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Add Entry</span>
            </button>

            {onOpenAuditLogs && (
              <button
                onClick={onOpenAuditLogs}
                title="System Audit & Fund Movement Log"
                aria-label="System audit log"
                className="p-1.5 sm:p-2 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] hover:bg-[#F7F5F2] dark:hover:bg-[#22252E] border border-transparent hover:border-[#E8E5DF] dark:hover:border-[#2D323F] rounded-lg transition-colors"
              >
                <History className="w-4 h-4" />
              </button>
            )}

            {/* Direct Sign Out Button */}
            {user && (
              <button
                onClick={() => logout()}
                title={`Sign out of account (@${user.username})`}
                aria-label="Sign out"
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#F7F5F2] dark:bg-[#22252E] hover:bg-[#FEF2F2] dark:hover:bg-[#450A0A]/40 border border-[#E8E5DF] dark:border-[#2D323F] hover:border-[#FCA5A5] dark:hover:border-[#7F1D1D] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#B91C1C] dark:hover:text-[#FCA5A5] text-xs font-medium transition-all"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline text-xs font-semibold">Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Tier: Primary Navigation Bar */}
        <div className="border-t border-[#E8E5DF] dark:border-[#2D323F]/80 py-1.5 sm:py-2">
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
    </header>
  );
};
