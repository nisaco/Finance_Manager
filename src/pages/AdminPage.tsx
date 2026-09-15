import React, { useState, useEffect } from 'react';
import {
  Crown,
  ShieldCheck,
  RefreshCw,
  Users,
  PiggyBank,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Trash2,
  X,
  Copy,
  Check,
  Eye,
  Loader2,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';
import { AdminPlatformStats, UserWithStats, WithdrawalRequest } from '../types';
import { OverviewSkeleton } from '../components/SkeletonLoader';
import { formatCurrency } from '../design/tokens';
import { UserDetailsModal } from '../components/Modals/UserDetailsModal';

export const AdminPage: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const { showNotification, loadData } = useLedger();

  const [activeTab, setActiveTab] = useState<'withdrawals' | 'users' | 'analytics'>('withdrawals');
  const [stats, setStats] = useState<AdminPlatformStats | null>(null);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Approval modal state
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Rejection modal state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Copied reference state
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // User detail drilldown modal
  const [inspectingUserId, setInspectingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setIsRefreshing(true);
    try {
      const [statsData, usersData, withdrawalsData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminWithdrawals(),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setWithdrawals(withdrawalsData);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      showNotification('Unable to fetch latest administration data', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleApprove = async () => {
    if (!approvingId) return;
    setIsProcessing(true);
    try {
      await api.approveAdminWithdrawal(approvingId, {
        notes: 'Approved and marked as paid by administrator',
      });
      showNotification('Savings vault withdrawal approved and marked as paid!', 'success');
      setApprovingId(null);
      await loadAdminData();
      await loadData();
    } catch (err: any) {
      showNotification(err?.response?.data?.error || err.message || 'Failed to approve withdrawal', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    setIsProcessing(true);
    try {
      await api.rejectAdminWithdrawal(rejectingId, rejectReason.trim());
      showNotification('Withdrawal request rejected. Vault unlocked for user.', 'info');
      setRejectingId(null);
      setRejectReason('');
      await loadAdminData();
      await loadData();
    } catch (err: any) {
      showNotification(err?.response?.data?.error || err.message || 'Failed to reject withdrawal', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      await api.updateUserRole(userId, newRole);
      showNotification(`Role updated to ${newRole}`, 'success');
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      showNotification(err?.response?.data?.error || err.message || 'Failed to update user role', 'error');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${username}" and all their profiles?`)) {
      return;
    }
    try {
      await api.deleteUser(userId);
      showNotification(`User "${username}" deleted`, 'success');
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      showNotification(err?.response?.data?.error || err.message || 'Failed to delete user', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const filteredWithdrawals = withdrawals.filter((w) => {
    const matchesFilter = statusFilter === 'all' || w.status === statusFilter;
    const matchesSearch =
      !searchTerm ||
      (w.userName && w.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      w.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.goalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.payoutDetails.accountNumber.includes(searchTerm) ||
      (w.paystackTransferReference && w.paystackTransferReference.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const filteredUsers = users.filter(
    (u) =>
      !searchTerm ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = withdrawals.filter((w) => w.status === 'pending').length;

  return (
    <div className="space-y-6 pb-[max(env(safe-area-inset-bottom,0px),2rem)] animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-solid text-on-solid flex items-center justify-center shadow-xs">
              <Crown className="w-4 h-4" />
            </div>
            <h1 className="t-title">
              Admin Portal Console
            </h1>
            <span className="lg-tag lg-tag-pos text-[10px]">
              Live Console
            </span>
          </div>
          <p className="t-meta mt-1">
            System overview, savings vault approvals, platform revenue, and user directory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAdminData}
            disabled={isRefreshing}
            className="lg-btn lg-btn-quiet lg-btn-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <OverviewSkeleton />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Total Vaulted Savings */}
            <div className="lg-card p-4 sm:p-5">
              <div className="flex items-center justify-between text-ink-3 mb-2">
                <span className="t-eyebrow text-[10px]">Vaulted Savings</span>
                <PiggyBank className="w-4 h-4 text-pos" />
              </div>
              <div className="text-2xl font-bold font-mono-num num tracking-tight text-ink">
                {stats ? formatCurrency(stats.totalSavingsVaultAmount, 'GHS') : '—'}
              </div>
              <p className="t-meta text-[11px] mt-1">
                Across {stats ? stats.totalUsers : users.length} registered accounts
              </p>
            </div>

            {/* Platform Revenue & Fees */}
            <div className="lg-card p-4 sm:p-5">
              <div className="flex items-center justify-between text-ink-3 mb-2">
                <span className="t-eyebrow text-[10px]">Platform Revenue</span>
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              <div className="text-2xl font-bold font-mono-num num tracking-tight text-ink">
                {stats ? formatCurrency(stats.totalFeesCollected, 'GHS') : '—'}
              </div>
              <p className="t-meta text-[11px] mt-1">
                2% standard fees + 10% early penalties
              </p>
            </div>

            {/* Total Platform Users */}
            <div className="lg-card p-4 sm:p-5">
              <div className="flex items-center justify-between text-ink-3 mb-2">
                <span className="t-eyebrow text-[10px]">Total Users</span>
                <Users className="w-4 h-4 text-accent" />
              </div>
              <div className="text-2xl font-bold font-mono-num num tracking-tight text-ink">
                {stats ? stats.totalUsers : users.length}
              </div>
              <p className="t-meta text-[11px] mt-1">
                Active platform account records
              </p>
            </div>

            {/* Pending Payout Approvals */}
            <div className={`lg-card p-4 sm:p-5 ${
              pendingCount > 0
                ? 'border-warn/40 bg-warn-soft'
                : ''
            }`}>
              <div className="flex items-center justify-between text-ink-3 mb-2">
                <span className="t-eyebrow text-[10px]">Pending Payouts</span>
                <Clock className={`w-4 h-4 ${pendingCount > 0 ? 'text-warn' : 'text-ink-4'}`} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono-num num tracking-tight text-ink">
                  {pendingCount}
                </span>
                {pendingCount > 0 && (
                  <span className="lg-tag text-[10px] bg-warn text-on-solid">Action Required</span>
                )}
              </div>
              <p className="t-meta text-[11px] mt-1">
                Awaiting administrative payout transfer
              </p>
            </div>
          </div>

          {/* Navigation Switcher Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-line pt-2">
            <div className="lg-seg">
              <button
                type="button"
                onClick={() => setActiveTab('withdrawals')}
                className={`lg-seg-btn flex items-center gap-1.5 ${activeTab === 'withdrawals' ? 'active' : ''}`}
              >
                <span>Withdrawals</span>
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono-num num font-bold bg-warn text-on-solid">
                    {pendingCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`lg-seg-btn flex items-center gap-1.5 ${activeTab === 'users' ? 'active' : ''}`}
              >
                <span>Users</span>
                <span className="text-[10px] font-mono-num num text-ink-3">
                  ({users.length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className={`lg-seg-btn flex items-center gap-1.5 ${activeTab === 'analytics' ? 'active' : ''}`}
              >
                <span>Revenue &amp; Policy</span>
              </button>
            </div>

            {/* Search Bar */}
            {(activeTab === 'withdrawals' || activeTab === 'users') && (
              <div className="relative mb-2 w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-ink-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={activeTab === 'withdrawals' ? 'Search applicant, goal...' : 'Search user or email...'}
                  className="lg-input pl-8 pr-8 py-1.5 text-xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* TAB 1: WITHDRAWAL REQUESTS */}
          {activeTab === 'withdrawals' && (
            <div className="space-y-4">
              {/* Status Filter Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    className={`lg-btn lg-btn-sm text-xs capitalize ${
                      statusFilter === filter ? 'lg-btn-solid' : 'lg-btn-quiet'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
                <span className="t-meta num ml-auto text-xs">
                  Showing {filteredWithdrawals.length} request{filteredWithdrawals.length === 1 ? '' : 's'}
                </span>
              </div>

              {filteredWithdrawals.length === 0 ? (
                <div className="p-10 text-center rounded-2xl bg-surface border border-line">
                  <ShieldCheck className="w-10 h-10 text-pos mx-auto mb-3 opacity-60" />
                  <div className="t-card font-bold">
                    No withdrawal requests found
                  </div>
                  <p className="t-meta text-xs mt-1 max-w-sm mx-auto">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your search criteria or status filter.'
                      : 'All user savings vault withdrawals have been processed and cleared.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredWithdrawals.map((req) => {
                    const isPending = req.status === 'pending';
                    const isApproved = req.status === 'approved';
                    const isRejected = req.status === 'rejected';

                    return (
                      <div
                        key={req.id}
                        className="lg-card p-4 sm:p-5"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Applicant & Target Details */}
                          <div className="space-y-2 min-w-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-sunken border border-line flex items-center justify-center font-bold text-xs text-ink shrink-0">
                                {req.userName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-ink flex items-center gap-2 flex-wrap">
                                  <span>{req.userName}</span>
                                  <span className="text-[11px] font-normal text-ink-3 truncate">
                                    ({req.userEmail})
                                  </span>
                                </div>
                                <div className="t-meta text-[11px] flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span>Target: <strong>{req.goalName}</strong></span>
                                  <span>•</span>
                                  <span className="font-mono-num num">
                                    {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Payout Bank Details */}
                            <div className="p-3 rounded-xl bg-sunken border border-line text-xs font-mono-num space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="t-eyebrow text-[10px]">Channel:</span>
                                <span className="font-semibold text-ink">{req.payoutDetails.bankOrProvider}</span>
                                <span className="t-eyebrow text-[10px] ml-2">Account:</span>
                                <span className="font-bold text-ink num">{req.payoutDetails.accountNumber}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] flex-wrap">
                                <span className="t-eyebrow text-[10px]">Account Name:</span>
                                <span className="text-ink font-medium">{req.payoutDetails.accountName}</span>
                              </div>
                            </div>
                          </div>

                          {/* Amounts, Status & Actions */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:text-right shrink-0">
                            <div className="space-y-1 text-xs">
                              <div className="t-meta text-[11px]">
                                Requested: <span className="font-mono-num num font-semibold text-ink">{formatCurrency(req.requestedAmount || req.vaultAmount, req.currency)}</span>
                              </div>
                              {req.remainingVaultBalance !== undefined && req.remainingVaultBalance > 0 && (
                                <div className="text-[10px] text-accent font-medium font-mono-num num">
                                  Partial • Vault Keeps: {formatCurrency(req.remainingVaultBalance, req.currency)}
                                </div>
                              )}
                              <div className="t-meta text-[11px]">
                                Fees &amp; Deductions: <span className="font-mono-num num text-pos">-{formatCurrency(req.feeAmount, req.currency)} ({req.totalFeePercent}%)</span>
                              </div>
                              {req.isEarlyWithdrawal && (
                                <div className="text-[11px] text-neg font-medium font-mono-num num">
                                  Early Penalty Included ({req.earlyPenaltyPercent}%)
                                </div>
                              )}
                              <div className="text-sm font-bold font-mono-num num text-ink pt-1 border-t border-line">
                                Net Payout: {formatCurrency(req.netPayoutAmount, req.currency)}
                              </div>
                            </div>

                            {/* Status badge & Action buttons */}
                            <div className="flex flex-col gap-2 min-w-[140px]">
                              {isPending && (
                                <>
                                  <div className="lg-tag text-[10px] justify-center py-1 bg-warn-soft text-warn border border-warn-soft">
                                    <Clock className="w-3 h-3 mr-1" />
                                    <span>Awaiting Approval</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <button
                                      type="button"
                                      onClick={() => setApprovingId(req.id)}
                                      className="lg-btn lg-btn-solid lg-btn-sm flex-1 text-xs"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRejectingId(req.id);
                                        setRejectReason('');
                                      }}
                                      className="lg-btn lg-btn-quiet lg-btn-sm text-xs text-neg"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </>
                              )}

                              {isApproved && (
                                <div className="space-y-1 text-left sm:text-right">
                                  <span className="lg-tag lg-tag-pos text-[10px]">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    <span>Approved &amp; Paid</span>
                                  </span>
                                  {req.paystackTransferReference && (
                                    <div className="t-meta text-[10px] font-mono-num flex items-center justify-start sm:justify-end gap-1 mt-1">
                                      <span>Ref: {req.paystackTransferReference.slice(0, 12)}...</span>
                                      <button
                                        type="button"
                                        onClick={() => copyToClipboard(req.paystackTransferReference!)}
                                        title="Copy full reference"
                                        className="p-1 hover:text-ink"
                                      >
                                        {copiedRef === req.paystackTransferReference ? (
                                          <Check className="w-3 h-3 text-pos" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {isRejected && (
                                <div className="space-y-1 text-left sm:text-right">
                                  <span className="lg-tag text-[10px] bg-neg-soft text-neg border border-neg-soft">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    <span>Rejected</span>
                                  </span>
                                  {req.adminNotes && (
                                    <p className="t-meta text-[10px] italic">
                                      "{req.adminNotes}"
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: USER DIRECTORY */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="t-meta text-xs">
                  All registered accounts with active profiles, ledger holdings, and permissions.
                </span>
                <span className="t-meta text-xs font-mono-num num">
                  {filteredUsers.length} Account{filteredUsers.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Mobile Card View (< md) */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {filteredUsers.map((u) => {
                  const isCurrent = u.id === currentAdmin?.id;
                  const isAdminRole = u.role === 'admin';

                  return (
                    <div
                      key={u.id}
                      className="lg-card p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isAdminRole
                                ? 'bg-accent text-on-solid'
                                : 'bg-sunken border border-line text-ink'
                            }`}
                          >
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-ink flex items-center gap-1.5">
                              <span className="truncate">{u.username}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-solid text-on-solid font-mono-num shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="t-meta text-[11px] truncate">
                              {u.email}
                            </div>
                          </div>
                        </div>

                        <select
                          value={u.role || 'user'}
                          disabled={isCurrent}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                          className="lg-select text-xs py-1 px-2.5 shrink-0"
                          aria-label={`Change role for ${u.username}`}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-sunken border border-line text-center text-xs">
                        <div>
                          <span className="t-eyebrow text-[9px] block">Profiles</span>
                          <span className="font-mono-num num font-bold text-ink">{u.profilesCount}</span>
                        </div>
                        <div>
                          <span className="t-eyebrow text-[9px] block">Transactions</span>
                          <span className="font-mono-num num font-bold text-ink">{u.transactionsCount}</span>
                        </div>
                        <div>
                          <span className="t-eyebrow text-[9px] block">Holdings</span>
                          <span className="font-mono-num num font-bold text-ink text-[11px] truncate block">
                            {formatCurrency(u.netBalance || (u as any).totalBalance || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-line">
                        <button
                          type="button"
                          onClick={() => setInspectingUserId(u.id)}
                          className="lg-btn lg-btn-quiet lg-btn-sm text-xs flex-1 justify-center"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          <span>Inspect Ledger</span>
                        </button>

                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="lg-btn lg-btn-quiet lg-btn-sm text-xs text-neg px-2.5"
                            aria-label={`Delete user ${u.username}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-line bg-surface shadow-xs">
                <table className="w-full divide-y divide-line text-left text-xs">
                  <thead className="bg-sunken text-ink-3 uppercase font-mono-num text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4 text-center">Profiles</th>
                      <th className="py-3 px-4 text-center">Transactions</th>
                      <th className="py-3 px-4">Net Holdings</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-ink">
                    {filteredUsers.map((u) => {
                      const isCurrent = u.id === currentAdmin?.id;
                      const isAdminRole = u.role === 'admin';

                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-sunken/60 transition-colors cursor-pointer group"
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.closest('select') || target.closest('button')) return;
                            setInspectingUserId(u.id);
                          }}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isAdminRole
                                    ? 'bg-accent text-on-solid'
                                    : 'bg-sunken border border-line text-ink'
                                }`}
                              >
                                {u.username.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold flex items-center gap-1.5">
                                  <span className="group-hover:text-accent transition-colors">
                                    {u.username}
                                  </span>
                                  {isCurrent && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-solid text-on-solid font-mono-num">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="t-meta text-[11px] truncate max-w-[180px]">
                                  {u.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <select
                              value={u.role || 'user'}
                              disabled={isCurrent}
                              onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                              className="lg-select text-xs py-1"
                              aria-label={`Role for ${u.username}`}
                            >
                              <option value="user">Standard User</option>
                              <option value="admin">Administrator</option>
                            </select>
                          </td>

                          <td className="py-3 px-4 text-center font-mono-num num font-semibold">
                            {u.profilesCount}
                          </td>

                          <td className="py-3 px-4 text-center font-mono-num num font-semibold">
                            {u.transactionsCount}
                          </td>

                          <td className="py-3 px-4 font-mono-num num font-bold text-xs text-ink">
                            {formatCurrency(u.netBalance || (u as any).totalBalance || 0)}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setInspectingUserId(u.id)}
                                title="Inspect user holdings & ledger"
                                className="lg-btn lg-btn-quiet lg-btn-sm text-xs"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                <span>Inspect</span>
                              </button>

                              {!isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id, u.username)}
                                  title="Delete user account"
                                  className="lg-btn lg-btn-quiet lg-btn-sm text-xs text-neg px-2"
                                  aria-label={`Delete user ${u.username}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PLATFORM REVENUE & AUDITS */}
          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="lg-card p-5 space-y-2">
                  <span className="t-eyebrow text-[10px] block">
                    Standard Withdrawal Fees (2%)
                  </span>
                  <div className="text-2xl font-bold font-mono-num num text-ink">
                    {stats ? formatCurrency(stats.totalFeesCollected, 'GHS') : '—'}
                  </div>
                  <p className="t-meta text-[11px]">
                    Automatically deducted on mature target unlocks
                  </p>
                </div>

                <div className="lg-card p-5 space-y-2">
                  <span className="t-eyebrow text-[10px] block">
                    Total Fees &amp; Penalties Collected
                  </span>
                  <div className="text-2xl font-bold font-mono-num num text-ink">
                    {stats ? formatCurrency(stats.totalFeesCollected, 'GHS') : '—'}
                  </div>
                  <p className="t-meta text-[11px]">
                    Automatically retained from completed vault payouts
                  </p>
                </div>

                <div className="lg-card p-5 space-y-2">
                  <span className="t-eyebrow text-[10px] text-pos block">
                    Platform Vault Balance
                  </span>
                  <div className="text-2xl font-bold font-mono-num num text-pos">
                    {stats ? formatCurrency(stats.totalSavingsVaultAmount, 'GHS') : '—'}
                  </div>
                  <p className="t-meta text-[11px]">
                    Liquid capital held across user lockboxes
                  </p>
                </div>
              </div>

              <div className="lg-card p-5 space-y-2">
                <h3 className="t-card text-xs font-bold uppercase tracking-wider">
                  Withdrawal &amp; Payout Policy
                </h3>
                <p className="t-meta text-xs leading-relaxed">
                  When users submit a withdrawal request, the amount is immediately deducted from their savings vault. Disburse the payout to their specified Mobile Money or Bank account and click <strong>Approve</strong> to mark the request as paid.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* APPROVAL CONFIRMATION MODAL */}
      {approvingId && (() => {
        const approvingReq = withdrawals.find((w) => w.id === approvingId);
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in" role="dialog" aria-modal="true">
            <div className="w-full max-w-md lg-card p-6 space-y-4 rounded-t-[24px] sm:rounded-2xl pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] sm:pb-6">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="t-card font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-pos" />
                  <span>Approve Withdrawal</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setApprovingId(null)}
                  className="lg-iconbtn"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-ink font-medium leading-relaxed">
                Are you sure you want to approve this withdrawal request?
              </p>

              {approvingReq && (
                <div className="p-3.5 rounded-xl bg-sunken border border-line space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="t-meta text-[11px]">Account Holder:</span>
                    <span className="font-bold text-ink">
                      {approvingReq.accountName || approvingReq.userName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="t-meta text-[11px]">Payout Destination:</span>
                    <span className="font-semibold font-mono-num text-ink">
                      {approvingReq.bankName} • {approvingReq.accountNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="t-meta text-[11px]">Savings Vault:</span>
                    <span className="text-ink font-medium">
                      {approvingReq.goalName}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-line flex justify-between items-baseline">
                    <span className="text-xs font-bold text-ink">Net Payout to Send:</span>
                    <span className="text-sm font-bold font-mono-num num text-pos">
                      {formatCurrency(approvingReq.netPayoutAmount, approvingReq.currency)}
                    </span>
                  </div>
                </div>
              )}

              <p className="t-meta text-[11px] leading-relaxed">
                The funds were already deducted from the user's vault upon submission. Clicking confirm will mark this payout as completed and paid.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovingId(null)}
                  className="lg-btn lg-btn-quiet text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleApprove}
                  className="lg-btn lg-btn-solid text-xs flex items-center gap-1.5"
                >
                  {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Yes, Approve &amp; Mark as Paid</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* REJECTION MODAL */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in" role="dialog" aria-modal="true">
          <div className="w-full max-w-md lg-card p-6 space-y-4 rounded-t-[24px] sm:rounded-2xl pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] sm:pb-6">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="t-card font-bold flex items-center gap-2">
                <XCircle className="w-4 h-4 text-neg" />
                <span>Reject Withdrawal Request</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="lg-iconbtn"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="t-meta text-xs leading-relaxed">
              State the reason for rejection. The funds will remain safely in the user's savings vault.
            </p>

            <div>
              <label className="lg-label" htmlFor="reject-reason-input">
                Rejection Reason
              </label>
              <textarea
                id="reject-reason-input"
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Account number could not be resolved by Mobile Money provider."
                className="w-full lg-input text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="lg-btn lg-btn-quiet text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing || !rejectReason.trim()}
                onClick={handleReject}
                className="lg-btn lg-btn-danger text-xs"
              >
                {isProcessing ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Drilldown Modal */}
      <UserDetailsModal
        isOpen={Boolean(inspectingUserId)}
        userId={inspectingUserId}
        onClose={() => setInspectingUserId(null)}
        onRoleChanged={loadAdminData}
      />
    </div>
  );
};
