import React, { useState } from 'react';
import {
  Wallet,
  Receipt,
  PiggyBank,
  PieChart,
  Scale,
  Settings,
  ShieldCheck,
  Lock,
  History,
  Plus,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';

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
  const { profiles, activeProfile, setActiveProfileId } = useLedger();
  const { logout, setRequireAuthModal } = useAuth();
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
    <header className="sticky top-0 z-40 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#E8E5DF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand & Signature Logo */}
          <div className="flex items-center space-x-6">
            <button
              onClick={() => handleTabChange('overview')}
              className="flex items-center space-x-3 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-lg bg-[#1A1A1A] border border-[#1A1A1A] flex items-center justify-center text-[#FFFFFF] font-display text-xl font-bold tracking-tighter group-hover:bg-[#333333] transition-colors shadow-sm">
                L
              </div>
              <div>
                <span className="font-display text-lg font-bold tracking-tight text-[#1A1A1A] block leading-none">
                  Ledger
                </span>
                <span className="text-[10px] tracking-widest uppercase text-[#6B7280] font-mono-num block mt-0.5">
                  Editorial Edition
                </span>
              </div>
            </button>

            {/* Profile Selector Badge */}
            {activeProfile && (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#F7F5F2] border border-[#E8E5DF] hover:border-[#D5D0C7] text-xs font-medium text-[#1A1A1A] transition-all"
                  aria-label="Switch profile"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: activeProfile.color || '#1A1A1A' }}
                  />
                  <span>{activeProfile.name}</span>
                  <span className="text-[#6B7280] font-mono-num text-[11px] ml-1">
                    ({activeProfile.displayCurrency})
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
                </button>

                {profileDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setProfileDropdownOpen(false)}
                    />
                    <div className="absolute left-0 mt-2 w-52 rounded-lg bg-[#FFFFFF] border border-[#E8E5DF] shadow-xl py-1 z-20">
                      <div className="px-3 py-1.5 border-b border-[#E8E5DF] text-[10px] uppercase tracking-wider text-[#6B7280] font-mono-num">
                        Switch Profile
                      </div>
                      {profiles.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setActiveProfileId(p.id);
                            setProfileDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-[#F7F5F2] transition-colors ${
                            p.id === activeProfile.id ? 'text-[#1A1A1A] font-bold bg-[#F7F5F2]' : 'text-[#4B5563]'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: p.color }}
                            />
                            <span>{p.name}</span>
                          </div>
                          <span className="font-mono-num text-[11px] text-[#6B7280]">{p.displayCurrency}</span>
                        </button>
                      ))}
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
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#1A1A1A] text-[#FFFFFF] shadow-sm'
                      : 'text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F7F5F2]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onOpenNewTx}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] rounded-md text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Add Entry</span>
            </button>

            {onOpenAuditLogs && (
              <button
                onClick={onOpenAuditLogs}
                title="System Audit & Fund Movement Log"
                className="p-1.5 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F7F5F2] border border-transparent hover:border-[#E8E5DF] rounded-md transition-colors"
              >
                <History className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setRequireAuthModal(true)}
              title="Lock Ledger"
              className="p-1.5 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F7F5F2] border border-transparent hover:border-[#E8E5DF] rounded-md transition-colors"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden overflow-x-auto space-x-1 py-2 border-t border-[#E8E5DF] scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = effectiveTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-xs whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1A1A1A] text-[#FFFFFF]'
                    : 'text-[#6B7280] hover:text-[#1A1A1A]'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
