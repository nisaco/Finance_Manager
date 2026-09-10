import React, { useState, useEffect } from 'react';
import {
  Crown,
  ShieldCheck,
  RefreshCw,
  Users,
  PiggyBank,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  ArrowUpRight,
  UserCheck,
  Trash2,
  ExternalLink,
  DollarSign,
  Activity,
  Layers,
  Sparkles,
  X,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';
import { AdminPlatformStats, UserWithStats, WithdrawalRequest } from '../types';
import { OverviewSkeleton } from '../components/SkeletonLoader';
import { formatCurrency } from '../design/tokens';

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
  const [paystackRef, setPaystackRef] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Rejection modal state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Copied reference state
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

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
        paystackReference: paystackRef.trim() || undefined,
        notes: adminNote.trim() || undefined,
      });
      showNotification('Savings vault withdrawal approved and payout recorded', 'success');
      setApprovingId(null);
      setPaystackRef('');
      setAdminNote('');
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
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Monarch-Style Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E8E5DF] dark:border-[#2D323F] pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] dark:bg-[#F3F4F6] text-[#FFFFFF] dark:text-[#111317] flex items-center justify-center shadow-xs">
              <Crown className="w-4 h-4" />
            </div>
            <h1 className="font-display text-2xl font-bold text-[#1A1A1A] dark:text-[#F3F4F6] tracking-tight">
              Admin
            </h1>
            <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Console</span>
            </span>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            System overview, savings vault approvals, platform revenue, and user directory.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={loadAdminData}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] bg-[#FFFFFF] dark:bg-[#1A1D24] text-[#1A1A1A] dark:text-[#F3F4F6] hover:bg-[#F7F5F2] dark:hover:bg-[#22252E] shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
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
          {/* KPI Cards (Monarch Money Style) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Vaulted Savings */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#161920] border border-[#E8E5DF] dark:border-[#2D323F] shadow-2xs">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#9CA3AF] mb-2">
            <span className="text-xs font-medium uppercase tracking-wider font-mono">Vaulted Savings</span>
            <PiggyBank className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-[#1A1A1A] dark:text-[#F3F4F6]">
            {stats ? formatCurrency(stats.totalSavingsVaultAmount, 'GHS') : '—'}
          </div>
          <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Across {stats ? stats.totalUsers : users.length} registered user accounts
          </p>
        </div>

        {/* Platform Revenue & Fees */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#161920] border border-[#E8E5DF] dark:border-[#2D323F] shadow-2xs">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#9CA3AF] mb-2">
            <span className="text-xs font-medium uppercase tracking-wider font-mono">Platform Revenue</span>
            <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-[#1A1A1A] dark:text-[#F3F4F6]">
            {stats ? formatCurrency(stats.totalFeesCollected, 'GHS') : '—'}
          </div>
          <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            2% standard fees + 10% early withdrawal penalties
          </p>
        </div>

        {/* Total Platform Users */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#161920] border border-[#E8E5DF] dark:border-[#2D323F] shadow-2xs">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#9CA3AF] mb-2">
            <span className="text-xs font-medium uppercase tracking-wider font-mono">Total Users</span>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-[#1A1A1A] dark:text-[#F3F4F6]">
            {stats ? stats.totalUsers : users.length}
          </div>
          <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Active platform account records
          </p>
        </div>

        {/* Pending Payout Approvals */}
        <div className={`p-4 sm:p-5 rounded-xl border shadow-2xs ${
          pendingCount > 0
            ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-300 dark:border-amber-700/60'
            : 'bg-[#FFFFFF] dark:bg-[#161920] border-[#E8E5DF] dark:border-[#2D323F]'
        }`}>
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#9CA3AF] mb-2">
            <span className="text-xs font-medium uppercase tracking-wider font-mono">Pending Payouts</span>
            <Clock className={`w-4 h-4 ${pendingCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[#9CA3AF]'}`} />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-[#1A1A1A] dark:text-[#F3F4F6]">
              {pendingCount}
            </span>
            {pendingCount > 0 && (
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Action Required</span>
            )}
          </div>
          <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Awaiting manual Paystack payout transfer
          </p>
        </div>
      </div>

      {/* Navigation Switcher Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#E8E5DF] dark:border-[#2D323F] pt-2">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'withdrawals'
                ? 'border-[#1A1A1A] dark:border-[#F3F4F6] text-[#1A1A1A] dark:text-[#F3F4F6]'
                : 'border-transparent text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6]'
            }`}
          >
            <span>Withdrawal Requests</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-white">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'users'
                ? 'border-[#1A1A1A] dark:border-[#F3F4F6] text-[#1A1A1A] dark:text-[#F3F4F6]'
                : 'border-transparent text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6]'
            }`}
          >
            <span>User Directory</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#E8E5DF] dark:bg-[#2D323F] text-[#4B5563] dark:text-[#9CA3AF]">
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'analytics'
                ? 'border-[#1A1A1A] dark:border-[#F3F4F6] text-[#1A1A1A] dark:text-[#F3F4F6]'
                : 'border-transparent text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6]'
            }`}
          >
            <span>Platform Revenue &amp; Audits</span>
          </button>
        </div>

        {/* Global Search Bar */}
        {(activeTab === 'withdrawals' || activeTab === 'users') && (
          <div className="relative mb-2 w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'withdrawals' ? 'Search applicant, goal, acc...' : 'Search user or email...'}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] bg-[#FFFFFF] dark:bg-[#161920] text-[#1A1A1A] dark:text-[#F3F4F6] placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] dark:focus:ring-[#F3F4F6]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: WITHDRAWAL REQUESTS */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          {/* Status Filter Pills */}
          <div className="flex items-center space-x-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-[#1A1A1A] dark:bg-[#F3F4F6] text-[#FFFFFF] dark:text-[#111317]'
                    : 'bg-[#F5F4F0] dark:bg-[#1B202C] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6]'
                }`}
              >
                {filter}
              </button>
            ))}
            <span className="text-xs text-[#9CA3AF] font-mono ml-auto">
              Showing {filteredWithdrawals.length} request{filteredWithdrawals.length === 1 ? '' : 's'}
            </span>
          </div>

          {filteredWithdrawals.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#FFFFFF] dark:bg-[#161920] border border-[#E8E5DF] dark:border-[#2D323F]">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-60" />
              <div className="text-sm font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                No withdrawal requests found
              </div>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1 max-w-sm mx-auto">
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
                    className="p-4 sm:p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#161920] border border-[#E8E5DF] dark:border-[#2D323F] hover:border-[#D1D5DB] dark:hover:border-[#374151] transition-all shadow-2xs"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Applicant & Target Goal Details */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#F5F4F0] dark:bg-[#252C3D] flex items-center justify-center font-bold text-xs text-[#1A1A1A] dark:text-[#F3F4F6]">
                            {req.userName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#1A1A1A] dark:text-[#F3F4F6] flex items-center gap-2">
                              <span>{req.userName}</span>
                              <span className="text-[11px] font-normal text-[#6B7280] dark:text-[#9CA3AF]">
                                ({req.userEmail})
                              </span>
                            </div>
                            <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] flex items-center space-x-2 mt-0.5">
                              <span>Target: <strong>{req.goalName}</strong></span>
                              <span>•</span>
                              <span>Requested {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>

                        {/* Payout Bank Details */}
                        <div className="p-2.5 rounded-lg bg-[#FAF9F6] dark:bg-[#111317] border border-[#E8E5DF] dark:border-[#2D323F] text-xs font-mono space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-[#9CA3AF] text-[10px] uppercase font-sans font-bold">Bank/Momo:</span>
                            <span className="font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">{req.payoutDetails.bankOrProvider}</span>
                            <span className="text-[#9CA3AF] text-[10px] uppercase font-sans font-bold ml-3">Account No:</span>
                            <span className="font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">{req.payoutDetails.accountNumber}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-[11px]">
                            <span className="text-[#9CA3AF] text-[10px] uppercase font-sans font-bold">Account Name:</span>
                            <span className="text-[#1A1A1A] dark:text-[#F3F4F6]">{req.payoutDetails.accountName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amounts, Status & Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:text-right">
                        {/* Breakdown */}
                        <div className="space-y-1 text-xs">
                          <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                            Vault Amount: <span className="font-mono">{formatCurrency(req.vaultAmount, req.currency)}</span>
                          </div>
                          <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                            Fees &amp; Deductions: <span className="font-mono text-emerald-600 dark:text-emerald-400">-{formatCurrency(req.feeAmount, req.currency)} ({req.totalFeePercent}%)</span>
                          </div>
                          {req.isEarlyWithdrawal && (
                            <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                              Early Penalty Included ({req.earlyPenaltyPercent}%)
                            </div>
                          )}
                          <div className="text-sm font-bold font-mono text-[#1A1A1A] dark:text-[#F3F4F6] pt-0.5 border-t border-[#E8E5DF] dark:border-[#2D323F]">
                            Net Payout: {formatCurrency(req.netPayoutAmount, req.currency)}
                          </div>
                        </div>

                        {/* Status badge & Action buttons */}
                        <div className="flex flex-col gap-2 min-w-[140px]">
                          {isPending && (
                            <>
                              <div className="inline-flex items-center justify-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                <Clock className="w-3 h-3" />
                                <span>Awaiting Approval</span>
                              </div>
                              <div className="flex items-center space-x-1.5 mt-1">
                                <button
                                  onClick={() => {
                                    setApprovingId(req.id);
                                    setPaystackRef('');
                                    setAdminNote('');
                                  }}
                                  className="flex-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingId(req.id);
                                    setRejectReason('');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            </>
                          )}

                          {isApproved && (
                            <div className="space-y-1 text-left sm:text-right">
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Approved &amp; Paid</span>
                              </span>
                              {req.paystackTransferReference && (
                                <div className="text-[10px] font-mono text-[#6B7280] dark:text-[#9CA3AF] flex items-center justify-start sm:justify-end space-x-1 mt-1">
                                  <span>Ref: {req.paystackTransferReference.slice(0, 12)}...</span>
                                  <button
                                    onClick={() => copyToClipboard(req.paystackTransferReference!)}
                                    title="Copy full reference"
                                    className="p-1 hover:text-[#1A1A1A] dark:hover:text-white"
                                  >
                                    {copiedRef === req.paystackTransferReference ? (
                                      <Check className="w-3 h-3 text-emerald-500" />
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
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                <XCircle className="w-3 h-3" />
                                <span>Rejected</span>
                              </span>
                              {req.adminNotes && (
                                <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] italic">
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
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              All registered accounts with active profiles and permissions.
            </span>
            <span className="text-xs font-mono text-[#9CA3AF]">
              {filteredUsers.length} Account{filteredUsers.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] bg-[#FFFFFF] dark:bg-[#161920] shadow-2xs">
            <table className="min-w-full divide-y divide-[#E8E5DF] dark:divide-[#2D323F] text-left text-xs">
              <thead className="bg-[#FAF9F6] dark:bg-[#111317] text-[#6B7280] dark:text-[#9CA3AF] uppercase font-mono text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Profiles</th>
                  <th className="py-3 px-4 hidden md:table-cell">Transactions</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5DF] dark:divide-[#2D323F] text-[#1A1A1A] dark:text-[#F3F4F6]">
                {filteredUsers.map((u) => {
                  const isCurrent = u.id === currentAdmin?.id;
                  const isAdminRole = u.role === 'admin';

                  return (
                    <tr key={u.id} className="hover:bg-[#FAF9F6]/80 dark:hover:bg-[#1A1E27]/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            isAdminRole
                              ? 'bg-amber-500 text-white'
                              : 'bg-[#F0EEE6] dark:bg-[#252C3D] text-[#1A1A1A] dark:text-[#F3F4F6]'
                          }`}>
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold flex items-center space-x-1.5">
                              <span>{u.username}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#1A1A1A] dark:bg-[#F3F4F6] text-white dark:text-[#111317] font-mono">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 hidden sm:table-cell font-mono">
                        {u.profilesCount}
                      </td>

                      <td className="py-3 px-4 hidden md:table-cell font-mono">
                        {u.transactionsCount}
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={u.role || 'user'}
                          disabled={isCurrent}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                          className={`text-xs font-semibold rounded-lg px-2.5 py-1 border transition-colors cursor-pointer ${
                            isAdminRole
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold'
                              : 'bg-[#F5F4F0] dark:bg-[#1E2330] text-[#4B5563] dark:text-[#9CA3AF] border-[#D1D5DB] dark:border-[#374151]'
                          } disabled:opacity-75 disabled:cursor-not-allowed`}
                        >
                          <option value="user">Standard User</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {!isCurrent && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            title="Delete user account"
                            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
            <div className="p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#161920] border border-[#E8E5DF] dark:border-[#2D323F] space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block">
                Standard Withdrawal Fees (2%)
              </span>
              <div className="text-2xl font-bold font-mono text-[#1A1A1A] dark:text-[#F3F4F6]">
                {stats ? formatCurrency(stats.totalFeesCollected, 'GHS') : '—'}
              </div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                Automatically deducted on mature target unlocks
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#161920] border border-[#E8E5DF] dark:border-[#2D323F] space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block">
                Total Fees &amp; Penalties Collected
              </span>
              <div className="text-2xl font-bold font-mono text-[#1A1A1A] dark:text-[#F3F4F6]">
                {stats ? formatCurrency(stats.totalFeesCollected, 'GHS') : '—'}
              </div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                Automatically retained from completed vault payouts
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#161920] border border-[#E8E5DF] dark:border-[#2D323F] space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Platform Vault Balance
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {stats ? formatCurrency(stats.totalSavingsVaultAmount, 'GHS') : '—'}
              </div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                Liquid capital held across user lockboxes
              </p>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#161920] border border-[#E8E5DF] dark:border-[#2D323F] space-y-3">
            <h3 className="text-sm font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
              Paystack Automated Payout Integration
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
              When a user submits a savings vault withdrawal request, it enters the <strong>Withdrawal Requests</strong> queue. As an administrator, you verify the requested payout destination, perform the bank/momo transfer (via Paystack Transfer or banking dashboard), and key in the transfer reference to mark the request completed.
            </p>
          </div>
        </div>
      )}
        </>
      )}

      {/* APPROVAL MODAL */}
      {approvingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#161920] rounded-2xl border border-[#E8E5DF] dark:border-[#2D323F] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] dark:border-[#2D323F] pb-3">
              <h3 className="font-display font-bold text-base text-[#1A1A1A] dark:text-[#F3F4F6] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Confirm Vault Payout</span>
              </h3>
              <button
                onClick={() => setApprovingId(null)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#1A1A1A] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
              Record confirmation of the bank/momo transfer sent to the user. This updates the user's savings vault status to <strong>Unlocked</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] mb-1">
                  Paystack / Bank Transfer Reference
                </label>
                <input
                  type="text"
                  value={paystackRef}
                  onChange={(e) => setPaystackRef(e.target.value)}
                  placeholder="e.g. TRF_29482942048 or Bank Ref"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D1D5DB] dark:border-[#2D323F] bg-[#FAF9F6] dark:bg-[#1E2330] text-[#1A1A1A] dark:text-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] dark:focus:ring-[#F3F4F6] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] mb-1">
                  Admin Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="e.g. Sent via Paystack Transfer API to MTN Momo"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D1D5DB] dark:border-[#2D323F] bg-[#FAF9F6] dark:bg-[#1E2330] text-[#1A1A1A] dark:text-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] dark:focus:ring-[#F3F4F6]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setApprovingId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F5F4F0] dark:hover:bg-[#1E2330] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleApprove}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Confirm & Mark Paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#161920] rounded-2xl border border-[#E8E5DF] dark:border-[#2D323F] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] dark:border-[#2D323F] pb-3">
              <h3 className="font-display font-bold text-base text-[#1A1A1A] dark:text-[#F3F4F6] flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Reject Withdrawal Request</span>
              </h3>
              <button
                onClick={() => setRejectingId(null)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#1A1A1A] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
              State the reason for rejection (e.g., incorrect momo number or mismatched account name). The funds will remain in the user's savings vault.
            </p>

            <div>
              <label className="block text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] mb-1">
                Rejection Reason
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Account number could not be resolved by Paystack. Please update and re-submit."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#D1D5DB] dark:border-[#2D323F] bg-[#FAF9F6] dark:bg-[#1E2330] text-[#1A1A1A] dark:text-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F5F4F0] dark:hover:bg-[#1E2330] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing || !rejectReason.trim()}
                onClick={handleReject}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
