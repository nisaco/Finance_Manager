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
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  currentTab?: string;
  setCurrentTab?: (tab: string) => void;
  onOpenNewTx: () => void;
  onOpenAuditLogs?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  currentTab,
  setCurrentTab,
  onOpenNewTx,
  onOpenAuditLogs,
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
  const { resolvedTheme, toggleTheme } = useTheme();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Wallet },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'budgets', label: 'Budgets', icon: Scale },
    { id: 'goals', label: 'Savings Goals', icon: PiggyBank },
    { id: 'debts', label: 'Debts', icon: Layers },
    { id: 'reports', label: 'Reports', icon: PieChart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF]/90 dark:bg-[#181A20]/90 backdrop-blur-md border-b border-[#E8E5DF] dark:border-[#2D323F] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand & Signature Logo */}
          <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6 min-w-0">
            <button
              onClick={() => handleTabChange('overview')}
              className="flex items-center space-x-2 sm:space-x-3 text-left group focus:outline-none shrink-0"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#1A1A1A] dark:bg-[#F3F4F6] border border-[#1A1A1A] dark:border-[#F3F4F6] flex items-center justify-center text-[#FFFFFF] dark:text-[#111317] font-display text-lg sm:text-xl font-bold tracking-tighter group-hover:bg-[#333333] dark:group-hover:bg-[#E5E7EB] transition-colors shadow-sm">
                L
              </div>
              <div>
                <span className="font-display text-base sm:text-lg font-bold tracking-tight text-[#1A1A1A] dark:text-[#F3F4F6] block leading-none">
                  Ledger
                </span>
                <span className="text-[10px] tracking-widest uppercase text-[#6B7280] dark:text-[#9CA3AF] font-mono-num hidden sm:block mt-0.5">
                  Editorial Edition
                </span>
              </div>
            </button>

            {/* Profile Selector Badge */}
            {activeProfile && (
              <div className="relative min-w-0">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-1.5 rounded-lg bg-[#F7F5F2] dark:bg-[#22252E] border border-[#E8E5DF] dark:border-[#2D323F] hover:border-[#D5D0C7] dark:hover:border-[#3A404F] text-xs font-medium text-[#1A1A1A] dark:text-[#F3F4F6] transition-all max-w-[140px] xs:max-w-[170px] sm:max-w-none"
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
                  <span className="text-[#6B7280] dark:text-[#9CA3AF] font-mono-num text-[11px] ml-0.5 hidden md:inline shrink-0">
                    ({activeProfile.displayCurrency})
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF] shrink-0" />
                </button>

                {profileDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setProfileDropdownOpen(false)}
                    />
                    <div className="absolute left-0 mt-2 w-60 rounded-xl bg-[#FFFFFF] dark:bg-[#282C37] border border-[#E8E5DF] dark:border-[#2D323F] shadow-2xl py-1.5 z-20 animate-in fade-in zoom-in-95 duration-100">
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
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = effectiveTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`flex items-center space-x-1.5 lg:space-x-2 px-2.5 lg:px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#1A1A1A] text-[#FFFFFF] dark:bg-[#F3F4F6] dark:text-[#111317] shadow-sm'
                      : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] hover:bg-[#F7F5F2] dark:hover:bg-[#22252E]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
            {/* MongoDB Online Indicator */}
            <button
              onClick={() => handleTabChange('settings')}
              title="Database: MongoDB Atlas (Online)"
              className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-[#F7F5F2] dark:bg-[#22252E] hover:bg-[#E8E5DF] dark:hover:bg-[#2D323F] border border-[#E8E5DF] dark:border-[#2D323F] text-[11px] font-mono-num text-[#4B5563] dark:text-[#9CA3AF] transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>MongoDB Online</span>
            </button>

            {/* Theme Toggle (Light / Dark mode) */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle theme"
              className="p-1.5 sm:p-2 rounded-md bg-[#F7F5F2] dark:bg-[#22252E] hover:bg-[#E8E5DF] dark:hover:bg-[#2D323F] border border-[#E8E5DF] dark:border-[#2D323F] text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] transition-all"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-[#4B5563]" />
              )}
            </button>

            {/* Add Entry Button */}
            <button
              onClick={onOpenNewTx}
              aria-label="Add transaction entry"
              className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] dark:bg-[#F3F4F6] dark:hover:bg-[#E5E7EB] dark:text-[#111317] rounded-md text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Add Entry</span>
            </button>

            {onOpenAuditLogs && (
              <button
                onClick={onOpenAuditLogs}
                title="System Audit & Fund Movement Log"
                aria-label="System audit log"
                className="p-1.5 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] hover:bg-[#F7F5F2] dark:hover:bg-[#22252E] border border-transparent hover:border-[#E8E5DF] dark:hover:border-[#2D323F] rounded-md transition-colors"
              >
                <History className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden overflow-x-auto space-x-1 py-2 border-t border-[#E8E5DF] dark:border-[#2D323F] scrollbar-none -mx-4 px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = effectiveTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                  isActive
                    ? 'bg-[#1A1A1A] text-[#FFFFFF] dark:bg-[#F3F4F6] dark:text-[#111317] shadow-xs'
                    : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
