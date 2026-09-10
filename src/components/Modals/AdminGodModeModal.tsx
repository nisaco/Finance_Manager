import React, { Component, useState, useEffect } from 'react';
import {
  X,
  Crown,
  ShieldAlert,
  Users,
  Building2,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Search,
  Filter,
  Trash2,
  ShieldCheck,
  Check,
  Loader2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { WithdrawalRequest, UserWithStats, AdminPlatformStats } from '../../types';
import { api } from '../../api/client';
import { useLedger } from '../../context/LedgerContext';
import { useAuth } from '../../context/AuthContext';

const safeFmt = (num: any, decimals = 2): string => {
  if (typeof num === 'number' && !isNaN(num)) {
    return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  const parsed = Number(num);
  if (!isNaN(parsed)) {
    return parsed.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  return '0.00';
};

const safeDate = (val: any): string => {
  if (!val) return 'N/A';
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
  } catch {
    return 'N/A';
  }
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ModalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: any, errorInfo: any) {
    console.error('AdminGodModeModal ErrorBoundary caught:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-[#1A1A1A] dark:text-white">Admin Portal Encountered an Issue</h3>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] font-mono">
            {this.state.error?.message || 'Failed to render administrative console.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-[#1A1A1A] dark:bg-white text-white dark:text-[#111317] rounded-xl text-xs font-bold cursor-pointer"
          >
            Retry Loading Console
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface AdminGodModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminGodModeModal: React.FC<AdminGodModeModalProps> = ({ isOpen, onClose }) => {
  const { showNotification, loadData } = useLedger();
  const { user: currentAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'withdrawals' | 'users' | 'stats'>('withdrawals');
  const [stats, setStats] = useState<AdminPlatformStats | null>(null);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    if (isOpen) {
      loadAdminData();
    }
  }, [isOpen]);

  const loadAdminData = async () => {
    setIsLoading(true);
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
      showNotification('Failed to load admin management data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approvingId) return;
    setIsProcessing(true);
    try {
      await api.approveAdminWithdrawal(approvingId, {
        paystackReference: paystackRef || undefined,
        notes: adminNote || undefined,
      });
      showNotification('Savings vault withdrawal approved and payout confirmed!', 'success');
      setApprovingId(null);
      setPaystackRef('');
      setAdminNote('');
      await loadAdminData();
      await loadData();
    } catch (err: any) {
      showNotification(err?.response?.data?.error || 'Failed to approve withdrawal', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    setIsProcessing(true);
    try {
      await api.rejectAdminWithdrawal(rejectingId, rejectReason);
      showNotification('Withdrawal request rejected. Vault unlocked.', 'info');
      setRejectingId(null);
      setRejectReason('');
      await loadAdminData();
      await loadData();
    } catch (err: any) {
      showNotification(err?.response?.data?.error || 'Failed to reject withdrawal', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      await api.updateUserRole(userId, newRole);
      showNotification(`User role updated to ${newRole}`, 'success');
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      showNotification(err?.response?.data?.error || 'Failed to update user role', 'error');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${username}"?`)) {
      return;
    }
    try {
      await api.deleteUser(userId);
      showNotification(`User ${username} deleted`, 'success');
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      showNotification(err?.response?.data?.error || 'Failed to delete user', 'error');
    }
  };

  if (!isOpen) return null;

  const filteredWithdrawals = withdrawals.filter((w) => {
    const matchesFilter = statusFilter === 'all' || w.status === statusFilter;
    const matchesSearch =
      !searchTerm ||
      w.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.goalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.payoutDetails.accountNumber.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  const filteredUsers = users.filter(
    (u) =>
      !searchTerm ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#FDFCFB] dark:bg-[#15171C] rounded-2xl border border-amber-500/40 dark:border-amber-500/30 shadow-2xl overflow-hidden text-[#1A1A1A] dark:text-[#F3F4F6] max-h-[92vh] flex flex-col">
        <ModalErrorBoundary>
        {/* Top Gold Ribbon Banner */}
        <div className="px-6 py-4 border-b border-[#E8E5DF] dark:border-[#2D323F] bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-transparent flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-display font-bold text-lg text-[#1A1A1A] dark:text-white">
                  Admin Portal — "God Mode"
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wide bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40">
                  SYSTEM OVERSEER
                </span>
              </div>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                Administered by: <strong>{currentAdmin?.email || 'jnkpappoe@gmail.com'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#1A1A1A] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#252830] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global KPI stats summary */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 sm:p-6 bg-white dark:bg-[#1A1D24] border-b border-[#E8E5DF] dark:border-[#2D323F]">
            <div className="p-3 rounded-xl bg-[#FDFCFB] dark:bg-[#15171C] border border-[#E8E5DF] dark:border-[#2D323F]">
              <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                <span>Total Users</span>
                <Users className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <span className="text-xl font-bold font-mono-num">{stats.totalUsers}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#FDFCFB] dark:bg-[#15171C] border border-[#E8E5DF] dark:border-[#2D323F]">
              <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                <span>Pending Payouts</span>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <span className="text-xl font-bold font-mono-num text-amber-600 dark:text-amber-400">
                {stats.pendingWithdrawalsCount}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#FDFCFB] dark:bg-[#15171C] border border-[#E8E5DF] dark:border-[#2D323F]">
              <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                <span>Vaults Total Capital</span>
                <Building2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <span className="text-xl font-bold font-mono-num text-emerald-600 dark:text-emerald-400">
                {safeFmt(stats.totalSavingsVaultAmount ?? (stats as any).totalVaultsAmount ?? 0)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#FDFCFB] dark:bg-[#15171C] border border-[#E8E5DF] dark:border-[#2D323F]">
              <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                <span>Admin Fees Retained</span>
                <DollarSign className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <span className="text-xl font-bold font-mono-num text-purple-600 dark:text-purple-400">
                {safeFmt(stats.totalFeesCollected)}
              </span>
            </div>
          </div>
        )}

        {/* Tab Controls & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-b border-[#E8E5DF] dark:border-[#2D323F] bg-[#F7F5F2] dark:bg-[#181A20]">
          <div className="flex items-center space-x-1.5 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'withdrawals'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-[#6B7280] dark:text-[#9CA3AF] hover:bg-white dark:hover:bg-[#252830]'
              }`}
            >
              Withdrawal Queue ({withdrawals.filter((w) => w.status === 'pending').length} pending)
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'users'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-[#6B7280] dark:text-[#9CA3AF] hover:bg-white dark:hover:bg-[#252830]'
              }`}
            >
              User Directory ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'stats'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-[#6B7280] dark:text-[#9CA3AF] hover:bg-white dark:hover:bg-[#252830]'
              }`}
            >
              System Telemetry
            </button>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search requests or users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] rounded-lg focus:outline-hidden"
              />
            </div>

            {activeTab === 'withdrawals' && (
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-[#1E2128] border border-[#E8E5DF] dark:border-[#2D323F] rounded-lg focus:outline-hidden"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            )}
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Accessing God Mode system logs...</p>
            </div>
          ) : activeTab === 'withdrawals' ? (
            /* WITHDRAWALS QUEUE */
            filteredWithdrawals.length === 0 ? (
              <div className="py-12 text-center text-[#6B7280] dark:text-[#9CA3AF] text-xs">
                No withdrawal requests found matching current criteria.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredWithdrawals.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-[#1A1D24] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl p-4 space-y-3 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E5DF] dark:border-[#2D323F] pb-2.5">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-xs text-[#1A1A1A] dark:text-white">
                            {req.userName} ({req.userEmail})
                          </span>
                          {req.isEarlyWithdrawal ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              EARLY BREAK (12% FEE)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              MATURED (2% FEE)
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] font-mono-num">
                          Vault: <strong>{req.goalName}</strong> • Submitted:{' '}
                          {safeDate(req.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider font-mono ${
                            req.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : req.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                    </div>

                    {/* Financial Figures and Bank Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-[#FDFCFB] dark:bg-[#15171C] border border-[#E8E5DF] dark:border-[#2D323F] space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-[#6B7280] dark:text-[#9CA3AF]">Vault Balance:</span>
                          <span className="font-mono-num font-semibold">
                            {req.currency} {safeFmt(req.vaultAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between text-rose-600 dark:text-rose-400">
                          <span>Platform Fee ({req.totalFeePercent}%):</span>
                          <span className="font-mono-num font-semibold">
                            -{req.currency} {safeFmt(req.feeAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-[#E8E5DF] dark:border-[#2D323F] font-bold text-emerald-600 dark:text-emerald-400">
                          <span>DISBURSE TO USER:</span>
                          <span className="font-mono-num text-sm">
                            {req.currency} {safeFmt(req.netPayoutAmount)}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-[#FDFCFB] dark:bg-[#15171C] border border-[#E8E5DF] dark:border-[#2D323F] space-y-1">
                        <span className="text-[10px] font-bold uppercase text-[#6B7280] dark:text-[#9CA3AF] block">
                          Recipient Payout Coordinates
                        </span>
                        <div className="text-xs">
                          <strong>Provider:</strong> {req.payoutDetails.bankOrProvider}
                        </div>
                        <div className="text-xs font-mono">
                          <strong>Account No:</strong> {req.payoutDetails.accountNumber}
                        </div>
                        <div className="text-xs">
                          <strong>Account Name:</strong> {req.payoutDetails.accountName}
                        </div>
                        {req.paystackTransferReference && (
                          <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 pt-1">
                            Ref: {req.paystackTransferReference}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons if pending */}
                    {req.status === 'pending' && (
                      <div className="flex items-center justify-end space-x-2 pt-1">
                        <button
                          onClick={() => setRejectingId(req.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-200 dark:border-rose-900"
                        >
                          Reject Request
                        </button>
                        <button
                          onClick={() => setApprovingId(req.id)}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-all flex items-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Authorize Payout</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'users' ? (
            /* USER DIRECTORY */
            <div className="bg-white dark:bg-[#1A1D24] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F5F2] dark:bg-[#181A20] border-b border-[#E8E5DF] dark:border-[#2D323F] text-[#6B7280] dark:text-[#9CA3AF] uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Profiles</th>
                    <th className="p-3">Transactions</th>
                    <th className="p-3">Total Balance</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E5DF] dark:divide-[#2D323F]">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#FDFCFB] dark:hover:bg-[#15171C]">
                      <td className="p-3">
                        <div className="font-semibold text-[#1A1A1A] dark:text-white">
                          {u.username}
                        </div>
                        <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">{u.email}</div>
                      </td>
                      <td className="p-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                          className={`px-2 py-1 rounded text-xs font-bold font-mono focus:outline-hidden ${
                            u.role === 'admin'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="p-3 font-mono-num">{u.profilesCount}</td>
                      <td className="p-3 font-mono-num">{u.transactionsCount}</td>
                      <td className="p-3 font-mono-num font-semibold">
                        GHS {safeFmt(u.netBalance ?? u.totalBalance ?? 0)}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          disabled={u.id === currentAdmin?.id}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md transition-colors disabled:opacity-30"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* SYSTEM TELEMETRY */
            stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white dark:bg-[#1A1D24] border border-[#E8E5DF] dark:border-[#2D323F] space-y-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
                    System Liquidity & Financial Volume
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#E8E5DF]/50 dark:border-[#2D323F]/50">
                      <span>Total Cumulative Ledger Balance:</span>
                      <span className="font-mono-num font-bold">
                        GHS {safeFmt(stats.totalLedgerBalance ?? (stats as any).totalVaultsAmount ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E8E5DF]/50 dark:border-[#2D323F]/50">
                      <span>Total Logged Transactions:</span>
                      <span className="font-mono-num font-bold">{stats.totalTransactionsCount ?? (stats as any).totalTransactions ?? 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E8E5DF]/50 dark:border-[#2D323F]/50">
                      <span>Active Budgets Enforced:</span>
                      <span className="font-mono-num font-bold">{stats.totalBudgetsCount ?? 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E8E5DF]/50 dark:border-[#2D323F]/50">
                      <span>Savings Vaults Created:</span>
                      <span className="font-mono-num font-bold">{stats.totalSavingsGoalsCount ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-[#1A1D24] border border-[#E8E5DF] dark:border-[#2D323F] space-y-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
                    Treasury & Administrative Revenue
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#E8E5DF]/50 dark:border-[#2D323F]/50">
                      <span>Standard 2% Vault Fees Collected:</span>
                      <span className="font-mono-num font-bold text-emerald-600 dark:text-emerald-400">
                        GHS {safeFmt(stats.totalFeesCollected)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E8E5DF]/50 dark:border-[#2D323F]/50">
                      <span>Database Engine:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        MongoDB Atlas Cloud
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E8E5DF]/50 dark:border-[#2D323F]/50">
                      <span>Payment Gateway:</span>
                      <span className="font-mono text-blue-500 font-bold">Paystack Verified</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#15171C] flex items-center justify-between text-xs text-[#6B7280] dark:text-[#9CA3AF]">
          <span>Security Protocol: Role Enforcement Guarded</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-[#1A1A1A] dark:bg-white text-white dark:text-[#1A1A1A] transition-colors"
          >
            Close Portal
          </button>
        </div>
        </ModalErrorBoundary>
      </div>

      {/* Approval Sub-Modal */}
      {approvingId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8E5DF] dark:border-[#2D323F] p-5 space-y-4 shadow-2xl">
            <h3 className="font-display font-bold text-sm">Approve Savings Vault Payout</h3>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              Confirm that the disbursement has been initiated or executed via Paystack or local bank transfer.
            </p>

            <div>
              <label className="block text-xs font-medium mb-1">Paystack / Bank Transfer Reference (Optional)</label>
              <input
                type="text"
                placeholder="e.g. TRF_20260907_123456"
                value={paystackRef}
                onChange={(e) => setPaystackRef(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FDFCFB] dark:bg-[#15171C] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl font-mono focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Admin Audit Notes</label>
              <input
                type="text"
                placeholder="e.g. Disbursed via MTN Mobile Money"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FDFCFB] dark:bg-[#15171C] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setApprovingId(null)}
                className="px-3 py-1.5 text-xs font-medium border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center space-x-1"
              >
                {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Confirm Payout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Sub-Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8E5DF] dark:border-[#2D323F] p-5 space-y-4 shadow-2xl">
            <h3 className="font-display font-bold text-sm text-rose-600">Reject Withdrawal Request</h3>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              Specify the reason for rejection. The user's vault balance will remain intact and will return to active status.
            </p>

            <div>
              <label className="block text-xs font-medium mb-1">Reason for Rejection</label>
              <input
                type="text"
                placeholder="e.g. Account name mismatch, incorrect mobile money number"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FDFCFB] dark:bg-[#15171C] border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setRejectingId(null)}
                className="px-3 py-1.5 text-xs font-medium border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center space-x-1"
              >
                {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Reject Request</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
