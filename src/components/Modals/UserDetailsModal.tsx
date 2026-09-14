import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  PiggyBank,
  Calendar,
  RefreshCw,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-line flex items-start justify-between gap-3 bg-surface">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${
                user?.role === 'admin'
                  ? 'bg-amber-500/20 text-warn border border-warn/30'
                  : 'bg-sunken text-ink border border-line'
              }`}
            >
              {user?.username ? user.username.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="t-card truncate">
                  {user?.username || 'User Profile'}
                </h2>
                {user?.role === 'admin' ? (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-warn border border-warn/30 text-[10px] font-bold uppercase tracking-wider num">
                    Admin
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-pos-soft text-pos border border-pos-soft text-[10px] font-semibold">
                    Standard User
                  </span>
                )}
                {isCurrentAdmin && (
                  <span className="px-2 py-0.5 rounded-md bg-solid text-on-solid text-[10px] num">
                    You
                  </span>
                )}
              </div>
              <p className="t-meta num truncate mt-0.5">
                {user?.email || 'Loading credentials...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="lg-iconbtn"
              aria-label="Close user details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center border-b border-line px-4 sm:px-5 bg-sunken overflow-x-auto no-scrollbar touch-pan-x gap-2 py-1.5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'overview'
                ? 'bg-surface text-ink font-bold shadow-xs'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            Overview &amp; Holdings
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'profiles'
                ? 'bg-surface text-ink font-bold shadow-xs'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            Profiles ({profiles.length})
          </button>
          <button
            onClick={() => setActiveTab('vaults')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'vaults'
                ? 'bg-surface text-ink font-bold shadow-xs'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            Savings Vaults ({goals.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'transactions'
                ? 'bg-surface text-ink font-bold shadow-xs'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            Recent Transactions ({transactions.length})
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-7 h-7 text-ink-3 animate-spin" />
              <p className="t-meta">
                Retrieving ledger snapshot and transaction volume...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-neg-soft border border-neg-soft text-neg text-xs">
              {error}
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  {/* Financial KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-sunken border border-line">
                      <span className="t-eyebrow block mb-1">
                        Net Ledger Balance
                      </span>
                      <div className="text-sm sm:text-base font-bold num text-ink">
                        {formatCurrency(stats?.totalLedgerBalance || 0)}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-sunken border border-line">
                      <span className="t-eyebrow text-pos block mb-1">
                        Total Inflow
                      </span>
                      <div className="text-sm sm:text-base font-bold num text-pos">
                        {formatCurrency(stats?.totalInflow || 0)}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-sunken border border-line">
                      <span className="t-eyebrow text-neg block mb-1">
                        Total Outflow
                      </span>
                      <div className="text-sm sm:text-base font-bold num text-neg">
                        {formatCurrency(stats?.totalOutflow || 0)}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-sunken border border-line">
                      <span className="t-eyebrow text-accent block mb-1">
                        Saved in Vaults
                      </span>
                      <div className="text-sm sm:text-base font-bold num text-accent">
                        {formatCurrency(stats?.totalVaults || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Account Metadata Bar */}
                  <div className="p-3.5 rounded-xl bg-sunken border border-line grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="t-eyebrow block mb-0.5">User ID</span>
                      <span className="num font-semibold text-ink">
                        {user?.id}
                      </span>
                    </div>
                    <div>
                      <span className="t-eyebrow block mb-0.5">Joined Date</span>
                      <span className="num font-semibold text-ink">
                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="t-eyebrow block mb-0.5">Active Profiles</span>
                      <span className="num font-semibold text-ink">
                        {profiles.length} Profile{profiles.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>

                  {/* Profile Balances Breakdown */}
                  <div className="space-y-2.5">
                    <h3 className="t-eyebrow">
                      Profiles &amp; Holdings
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {profiles.map((p: any) => (
                        <div
                          key={p.id}
                          className="p-3.5 rounded-xl border border-line bg-surface space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="t-card">
                              {p.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-sunken text-[10px] num font-semibold border border-line">
                              {p.displayCurrency || 'GHS'}
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="t-meta">Net Balance:</span>
                            <span className="text-sm font-bold num text-ink">
                              {formatCurrency(p.netBalance || 0, p.displayCurrency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between t-meta num pt-1.5 border-t border-line">
                            <span className="text-pos">+{formatCurrency(p.totalIncome || 0, p.displayCurrency)}</span>
                            <span className="text-neg">-{formatCurrency(p.totalExpense || 0, p.displayCurrency)}</span>
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
                    <p className="t-meta py-8 text-center">
                      No active profiles found for this account.
                    </p>
                  ) : (
                    profiles.map((p: any) => (
                      <div
                        key={p.id}
                        className="p-4 rounded-xl border border-line bg-surface space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-3.5 h-3.5 rounded-full shrink-0"
                              style={{ backgroundColor: p.color || 'var(--lg-ink)' }}
                            />
                            <span className="t-card">
                              {p.name}
                            </span>
                          </div>
                          <span className="text-xs num font-bold px-2.5 py-1 rounded-lg bg-sunken border border-line">
                            {p.displayCurrency || 'GHS'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2.5 border-t border-line">
                          <div>
                            <span className="t-eyebrow block mb-0.5">
                              Net Balance
                            </span>
                            <span className="num font-bold text-ink">
                              {formatCurrency(p.netBalance || 0, p.displayCurrency)}
                            </span>
                          </div>
                          <div>
                            <span className="t-eyebrow text-pos block mb-0.5">Total Inflow</span>
                            <span className="num font-semibold text-pos">
                              {formatCurrency(p.totalIncome || 0, p.displayCurrency)}
                            </span>
                          </div>
                          <div>
                            <span className="t-eyebrow text-neg block mb-0.5">Total Outflow</span>
                            <span className="num font-semibold text-neg">
                              {formatCurrency(p.totalExpense || 0, p.displayCurrency)}
                            </span>
                          </div>
                          <div>
                            <span className="t-eyebrow block mb-0.5">
                              Transactions
                            </span>
                            <span className="num font-semibold text-ink">
                              {p.transactionCount || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: SAVINGS & VAULTS (Strictly Zero Progress Bars) */}
              {activeTab === 'vaults' && (
                <div className="space-y-3">
                  {goals.length === 0 ? (
                    <p className="t-meta py-8 text-center">
                      No savings vaults or goals created yet.
                    </p>
                  ) : (
                    goals.map((g: any) => {
                      const percent = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
                      const remaining = Math.max(0, (g.target || 0) - (g.current || 0));
                      return (
                        <div
                          key={g.id}
                          className="p-4 rounded-xl border border-line bg-surface space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <PiggyBank className="w-4 h-4 text-pos" />
                              <span className="t-card">
                                {g.name}
                              </span>
                            </div>
                            <span className="t-meta num font-bold text-pos">
                              {percent}% funded
                            </span>
                          </div>

                          {/* Zero progress bar: Discrete figures */}
                          <div className="flex items-center justify-between text-xs num py-1 bg-sunken px-3 rounded-lg border border-line">
                            <span className="text-ink-2">
                              Saved: <strong className="text-ink">{formatCurrency(g.current || 0, g.currency)}</strong>
                            </span>
                            <span className="text-ink-2">
                              Target: <strong className="text-ink">{formatCurrency(g.target || 0, g.currency)}</strong>
                            </span>
                            <span className="text-ink-3">
                              Left: <strong className="text-ink-2">{formatCurrency(remaining, g.currency)}</strong>
                            </span>
                          </div>

                          {g.deadline && (
                            <div className="t-meta num flex items-center gap-1">
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
                    <p className="t-meta py-8 text-center">
                      No recorded transactions for this user.
                    </p>
                  ) : (
                    <div className="overflow-x-auto overscroll-x-contain touch-pan-x border border-line rounded-xl">
                      <table className="min-w-[620px] w-full text-left text-xs divide-y divide-line">
                        <thead className="bg-sunken text-ink-3 uppercase num text-[10px] font-bold">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Description / Note</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line text-ink bg-surface">
                          {transactions.map((tx: any) => {
                            const isIncome = tx.type === 'income';
                            return (
                              <tr
                                key={tx.id}
                                className="hover:bg-sunken transition-colors"
                              >
                                <td className="py-2.5 px-3 num text-[11px] whitespace-nowrap text-ink-3">
                                  {tx.date ? new Date(tx.date).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="py-2.5 px-3 font-medium max-w-[200px] truncate">
                                  {tx.note || tx.description || 'Transaction'}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded-md bg-sunken text-[10px] text-ink-3 num border border-line">
                                    {tx.category || 'General'}
                                  </span>
                                </td>
                                <td
                                  className={`py-2.5 px-3 text-right num font-bold whitespace-nowrap ${
                                    isIncome
                                      ? 'text-pos'
                                      : 'text-neg'
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
        <div className="p-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface">
          <div className="t-meta num">
            Administrative control center for @{user?.username || 'user'}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {!isCurrentAdmin && user && (
              <button
                type="button"
                onClick={handleRoleToggle}
                disabled={isUpdatingRole}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  user.role === 'admin'
                    ? 'border-warn/30 bg-amber-500/10 text-warn hover:bg-amber-500/20'
                    : 'border-line bg-sunken text-ink hover:bg-surface'
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
              className="lg-btn lg-btn-solid lg-btn-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
