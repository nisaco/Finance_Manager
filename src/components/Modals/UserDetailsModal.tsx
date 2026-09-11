import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  PiggyBank,
  Receipt,
  Layers,
  Calendar,
  Clock,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { api } from '../../api/client';
import { formatCurrency } from '../../design/tokens';
import { useAuth } from '../../context/AuthContext';
import { useLedger } from '../../context/LedgerContext';

interface UserDetailsModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRoleChanged?: () => void;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  userId,
  isOpen,
  onClose,
  onRoleChanged,
}) => {
  const { user: currentAdmin } = useAuth();
  const { showNotification } = useLedger();

  const [activeTab, setActiveTab] = useState<'overview' | 'profiles' | 'vaults' | 'transactions'>('overview');
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api
      .getAdminUserDetails(userId)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setIsLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || 'Failed to fetch user details.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleRoleToggle = async () => {
    if (!data?.user) return;
    const newRole = data.user.role === 'admin' ? 'user' : 'admin';
    const confirmText =
      newRole === 'admin'
        ? `Grant Administrator privileges to @${data.user.username}?`
        : `Demote @${data.user.username} to standard User?`;

    if (!window.confirm(confirmText)) return;

    try {
      setIsUpdatingRole(true);
      await api.updateUserRole(data.user.id, newRole);
      setData((prev: any) => ({
        ...prev,
        user: { ...prev.user, role: newRole },
      }));
      showNotification(`Role updated to ${newRole === 'admin' ? 'Administrator' : 'Standard User'}`);
      if (onRoleChanged) onRoleChanged();
    } catch (err: any) {
      showNotification(err.message || 'Failed to change role');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const user = data?.user;
  const stats = data?.stats;
  const profiles = data?.profiles || [];
  const goals = data?.goals || [];
  const transactions = data?.transactions || [];

  const isCurrentAdmin = user?.id === currentAdmin?.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-[#161920] border border-[#E8E5DF] dark:border-[#2D323F] rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8E5DF] dark:border-[#2D323F] flex items-start justify-between gap-3 bg-[#FAF9F6] dark:bg-[#111317]">
          <div className="flex items-center space-x-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${
                user?.role === 'admin'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-[#1A1A1A] dark:bg-[#F3F4F6] text-white dark:text-[#111317]'
              }`}
            >
              {user?.username ? user.username.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A] dark:text-[#F3F4F6] truncate">
                  {user?.username || 'User Profile'}
                </h2>
                {user?.role === 'admin' ? (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider font-mono">
                    Admin
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold">
                    Standard User
                  </span>
                )}
                {isCurrentAdmin && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#1A1A1A] dark:bg-[#F3F4F6] text-white dark:text-[#111317] text-[10px] font-mono">
                    You
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] truncate">
                {user?.email || 'Loading credentials...'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-[#E8E5DF] dark:hover:bg-[#2D323F] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] transition-colors cursor-pointer"
              aria-label="Close user details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center border-b border-[#E8E5DF] dark:border-[#2D323F] px-4 sm:px-5 bg-white dark:bg-[#161920] overflow-x-auto no-scrollbar touch-pan-x">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 border-b-2 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-white'
            }`}
          >
            Overview & Holdings
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`py-3 px-3 border-b-2 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'profiles'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-white'
            }`}
          >
            Profiles ({profiles.length})
          </button>
          <button
            onClick={() => setActiveTab('vaults')}
            className={`py-3 px-3 border-b-2 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'vaults'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-white'
            }`}
          >
            Savings Vaults ({goals.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-3 px-3 border-b-2 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'transactions'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-white'
            }`}
          >
            Recent Transactions ({transactions.length})
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin" />
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                Retrieving ledger snapshot and transaction volume...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  {/* Financial KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#FAF9F6] dark:bg-[#1B1F2A] border border-[#E8E5DF] dark:border-[#2D323F]">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block mb-1">
                        Net Ledger Balance
                      </span>
                      <div className="text-sm sm:text-base font-bold font-mono text-[#1A1A1A] dark:text-[#F3F4F6]">
                        {formatCurrency(stats?.totalLedgerBalance || 0)}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#FAF9F6] dark:bg-[#1B1F2A] border border-[#E8E5DF] dark:border-[#2D323F]">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                        Total Inflow
                      </span>
                      <div className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(stats?.totalInflow || 0)}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#FAF9F6] dark:bg-[#1B1F2A] border border-[#E8E5DF] dark:border-[#2D323F]">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                        Total Outflow
                      </span>
                      <div className="text-sm sm:text-base font-bold font-mono text-rose-600 dark:text-rose-400">
                        {formatCurrency(stats?.totalOutflow || 0)}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#FAF9F6] dark:bg-[#1B1F2A] border border-[#E8E5DF] dark:border-[#2D323F]">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                        Saved in Vaults
                      </span>
                      <div className="text-sm sm:text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                        {formatCurrency(stats?.totalVaults || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Account Metadata Bar */}
                  <div className="p-3.5 rounded-xl bg-[#FAF9F6] dark:bg-[#1B1F2A] border border-[#E8E5DF] dark:border-[#2D323F] grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] block">User ID</span>
                      <span className="font-mono text-[11px] font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">
                        {user?.id}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] block">Joined Date</span>
                      <span className="font-mono text-[11px] font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">
                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] block">Active Profiles</span>
                      <span className="font-mono text-[11px] font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">
                        {profiles.length} Profile{profiles.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>

                  {/* Profile Balances Breakdown */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
                      Profiles & Holdings
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {profiles.map((p: any) => (
                        <div
                          key={p.id}
                          className="p-3 rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#161920] space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                              {p.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-[#FAF9F6] dark:bg-[#252C3D] text-[10px] font-mono font-semibold">
                              {p.displayCurrency || 'GHS'}
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Net Balance:</span>
                            <span className="text-sm font-bold font-mono text-[#1A1A1A] dark:text-[#F3F4F6]">
                              {formatCurrency(p.netBalance || 0, p.displayCurrency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[#6B7280] dark:text-[#9CA3AF] pt-1 border-t border-[#E8E5DF]/50 dark:border-[#2D323F]/50">
                            <span>+{formatCurrency(p.totalIncome || 0, p.displayCurrency)}</span>
                            <span>-{formatCurrency(p.totalExpense || 0, p.displayCurrency)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PROFILES */}
              {activeTab === 'profiles' && (
                <div className="space-y-3">
                  {profiles.length === 0 ? (
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] py-6 text-center">
                      No active profiles found for this account.
                    </p>
                  ) : (
                    profiles.map((p: any) => (
                      <div
                        key={p.id}
                        className="p-4 rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#161920] space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: p.color || '#1A1A1A' }}
                            />
                            <span className="text-sm font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                              {p.name}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#FAF9F6] dark:bg-[#252C3D]">
                            {p.displayCurrency || 'GHS'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2 border-t border-[#E8E5DF] dark:border-[#2D323F]">
                          <div>
                            <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] block">
                              Net Balance
                            </span>
                            <span className="font-mono font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                              {formatCurrency(p.netBalance || 0, p.displayCurrency)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-600 block">Total Inflow</span>
                            <span className="font-mono font-semibold text-emerald-600">
                              {formatCurrency(p.totalIncome || 0, p.displayCurrency)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-rose-600 block">Total Outflow</span>
                            <span className="font-mono font-semibold text-rose-600">
                              {formatCurrency(p.totalExpense || 0, p.displayCurrency)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] block">
                              Transactions
                            </span>
                            <span className="font-mono font-semibold">
                              {p.transactionCount || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: SAVINGS & VAULTS */}
              {activeTab === 'vaults' && (
                <div className="space-y-3">
                  {goals.length === 0 ? (
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] py-6 text-center">
                      No savings vaults or goals created yet.
                    </p>
                  ) : (
                    goals.map((g: any) => {
                      const percent = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
                      return (
                        <div
                          key={g.id}
                          className="p-4 rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#161920] space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <PiggyBank className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                                {g.name}
                              </span>
                            </div>
                            <span className="text-xs font-mono font-bold text-emerald-600">
                              {percent}%
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-2 rounded-full bg-[#FAF9F6] dark:bg-[#252C3D] overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[#6B7280] dark:text-[#9CA3AF]">
                              Saved: <strong className="text-[#1A1A1A] dark:text-[#F3F4F6]">{formatCurrency(g.current || 0, g.currency)}</strong>
                            </span>
                            <span className="text-[#6B7280] dark:text-[#9CA3AF]">
                              Target: <strong className="text-[#1A1A1A] dark:text-[#F3F4F6]">{formatCurrency(g.target || 0, g.currency)}</strong>
                            </span>
                          </div>

                          {g.deadline && (
                            <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] flex items-center space-x-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Target date: {new Date(g.deadline).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 4: RECENT TRANSACTIONS */}
              {activeTab === 'transactions' && (
                <div className="space-y-2">
                  {transactions.length === 0 ? (
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] py-6 text-center">
                      No recorded transactions for this user.
                    </p>
                  ) : (
                    <div className="overflow-x-auto overscroll-x-contain touch-pan-x border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl">
                      <table className="min-w-[620px] w-full text-left text-xs divide-y divide-[#E8E5DF] dark:divide-[#2D323F]">
                        <thead className="bg-[#FAF9F6] dark:bg-[#111317] text-[#6B7280] dark:text-[#9CA3AF] uppercase font-mono text-[10px] font-bold">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Description / Note</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E5DF] dark:divide-[#2D323F] text-[#1A1A1A] dark:text-[#F3F4F6]">
                          {transactions.map((tx: any) => {
                            const isIncome = tx.type === 'income';
                            return (
                              <tr
                                key={tx.id}
                                className="hover:bg-[#FAF9F6] dark:hover:bg-[#1A1E27] transition-colors"
                              >
                                <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap text-[#6B7280] dark:text-[#9CA3AF]">
                                  {tx.date ? new Date(tx.date).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="py-2.5 px-3 font-medium max-w-[200px] truncate">
                                  {tx.note || tx.description || 'Transaction'}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className="px-1.5 py-0.5 rounded bg-[#FAF9F6] dark:bg-[#252C3D] text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">
                                    {tx.category || 'General'}
                                  </span>
                                </td>
                                <td
                                  className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                                    isIncome
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {isIncome ? '+' : '-'}
                                  {formatCurrency(tx.amount || 0, tx.currency)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer / Administrative Controls */}
        <div className="p-4 border-t border-[#E8E5DF] dark:border-[#2D323F] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FAF9F6] dark:bg-[#111317]">
          <div className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Administrative control center for @{user?.username || 'user'}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            {!isCurrentAdmin && user && (
              <button
                type="button"
                onClick={handleRoleToggle}
                disabled={isUpdatingRole}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  user.role === 'admin'
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 hover:bg-amber-100'
                    : 'border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#1A1D24] text-[#1A1A1A] dark:text-[#F3F4F6] hover:bg-[#F0EEE6]'
                } disabled:opacity-50`}
              >
                {isUpdatingRole
                  ? 'Updating...'
                  : user.role === 'admin'
                  ? 'Demote to Standard User'
                  : 'Promote to Administrator'}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1A1A1A] dark:bg-[#F3F4F6] text-white dark:text-[#111317] text-xs font-bold transition-all hover:opacity-90 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
