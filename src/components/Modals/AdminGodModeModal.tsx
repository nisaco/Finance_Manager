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
  Copy,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { WithdrawalRequest, UserWithStats, AdminPlatformStats } from '../../types';
import { api } from '../../api/client';
import { useLedger } from '../../context/LedgerContext';
import { useAuth } from '../../context/AuthContext';
import { UserDetailsModal } from './UserDetailsModal';
import { formatCurrency } from '../../design/tokens';

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
          <AlertCircle className="w-10 h-10 text-neg mx-auto" />
          <h3 className="t-card">Admin Portal Encountered an Issue</h3>
          <p className="t-meta num">
            {this.state.error?.message || 'Failed to render administrative console.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="lg-btn lg-btn-solid lg-btn-sm"
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
  const [isProcessing, setIsProcessing] = useState(false);

  // Rejection modal state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // User detail drilldown modal
  const [inspectingUserId, setInspectingUserId] = useState<string | null>(null);

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
        notes: 'Approved and marked as paid by administrator',
      });
      showNotification('Savings vault withdrawal approved and marked as paid!', 'success');
      setApprovingId(null);
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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/75 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-5xl bg-surface rounded-t-[24px] sm:rounded-2xl border border-line shadow-2xl overflow-hidden text-ink max-h-[94vh] sm:max-h-[92vh] flex flex-col pt-[max(env(safe-area-inset-top,0px),0.25rem)] sm:pt-0 pb-[max(env(safe-area-inset-bottom,0px),0.5rem)] sm:pb-0">
        {/* Top Ribbon Banner */}
        <div className="px-6 py-4 border-b border-line bg-sunken flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-solid text-on-solid flex items-center justify-center shadow-xs">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="t-card">
                  Admin Portal — "God Mode"
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold num tracking-wide bg-amber-500/15 text-warn border border-warn/30">
                  SYSTEM OVERSEER
                </span>
              </div>
              <p className="t-meta num mt-0.5">
                Administered by: <strong>{currentAdmin?.email || 'jnkpappoe@gmail.com'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg-iconbtn"
            aria-label="Close admin modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global KPI stats summary */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 sm:p-6 bg-surface border-b border-line">
            <div className="p-3.5 rounded-xl bg-sunken border border-line">
              <div className="flex items-center justify-between t-eyebrow mb-1">
                <span>Total Users</span>
                <Users className="w-3.5 h-3.5 text-accent" />
              </div>
              <span className="text-xl font-bold num text-ink">{stats.totalUsers}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-sunken border border-line">
              <div className="flex items-center justify-between t-eyebrow text-warn mb-1">
                <span>Pending Payouts</span>
                <Clock className="w-3.5 h-3.5 text-warn" />
              </div>
              <span className="text-xl font-bold num text-warn">
                {stats.pendingWithdrawalsCount}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-sunken border border-line">
              <div className="flex items-center justify-between t-eyebrow text-pos mb-1">
                <span>Vaults Total Capital</span>
                <Building2 className="w-3.5 h-3.5 text-pos" />
              </div>
              <span className="text-xl font-bold num text-pos">
                {safeFmt(stats.totalSavingsVaultAmount ?? (stats as any).totalVaultsAmount ?? 0)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-sunken border border-line">
              <div className="flex items-center justify-between t-eyebrow text-accent mb-1">
                <span>Admin Fees Retained</span>
                <DollarSign className="w-3.5 h-3.5 text-accent" />
              </div>
              <span className="text-xl font-bold num text-accent">
                {safeFmt(stats.totalFeesCollected)}
              </span>
            </div>
          </div>
        )}

        {/* Tab Controls & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-b border-line bg-sunken">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'withdrawals'
                  ? 'bg-solid text-on-solid shadow-xs'
                  : 'text-ink-3 hover:text-ink hover:bg-surface'
              }`}
            >
              Withdrawal Queue ({withdrawals.filter((w) => w.status === 'pending').length} pending)
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-solid text-on-solid shadow-xs'
                  : 'text-ink-3 hover:text-ink hover:bg-surface'
              }`}
            >
              User Directory ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'stats'
                  ? 'bg-solid text-on-solid shadow-xs'
                  : 'text-ink-3 hover:text-ink hover:bg-surface'
              }`}
            >
              System Telemetry
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                type="text"
                placeholder="Search requests or users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface border border-line rounded-lg text-ink focus:outline-none focus:border-accent"
              />
            </div>

            {activeTab === 'withdrawals' && (
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-surface border border-line rounded-lg text-ink focus:outline-none focus:border-accent"
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
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-ink-3" />
              <p className="t-meta">Accessing system telemetry...</p>
            </div>
          ) : activeTab === 'withdrawals' ? (
            /* WITHDRAWALS QUEUE */
            filteredWithdrawals.length === 0 ? (
              <div className="py-12 text-center t-meta">
                No withdrawal requests found matching current criteria.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredWithdrawals.map((req) => (
                  <div
                    key={req.id}
                    className="bg-surface border border-line rounded-xl p-4 space-y-3 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-ink">
                            {req.userName} ({req.userEmail})
                          </span>
                          {req.isEarlyWithdrawal ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold num bg-amber-500/10 text-warn border border-warn/30">
                              EARLY BREAK (12% FEE)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold num bg-pos-soft text-pos border border-pos-soft">
                              MATURED (2% FEE)
                            </span>
                          )}
                        </div>
                        <p className="t-meta num mt-0.5">
                          Vault: <strong>{req.goalName}</strong> • Submitted:{' '}
                          {safeDate(req.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider num ${
                            req.status === 'pending'
                              ? 'bg-amber-500/10 text-warn border border-warn/30'
                              : req.status === 'approved'
                              ? 'bg-pos-soft text-pos border border-pos-soft'
                              : 'bg-neg-soft text-neg border border-neg-soft'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                    </div>

                    {/* Financial Figures and Bank Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-sunken border border-line space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-ink-3">Vault Balance:</span>
                          <span className="num font-semibold text-ink">
                            {req.currency} {safeFmt(req.vaultAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between text-neg">
                          <span>Platform Fee ({req.totalFeePercent}%):</span>
                          <span className="num font-semibold">
                            -{req.currency} {safeFmt(req.feeAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-line font-bold text-pos">
                          <span>DISBURSE TO USER:</span>
                          <span className="num text-sm">
                            {req.currency} {safeFmt(req.netPayoutAmount)}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-sunken border border-line space-y-1">
                        <span className="t-eyebrow block mb-1">
                          Recipient Payout Coordinates
                        </span>
                        <div className="text-xs">
                          <strong className="text-ink">Provider:</strong> {req.payoutDetails.bankOrProvider}
                        </div>
                        <div className="text-xs num">
                          <strong className="text-ink">Account No:</strong> {req.payoutDetails.accountNumber}
                        </div>
                        <div className="text-xs">
                          <strong className="text-ink">Account Name:</strong> {req.payoutDetails.accountName}
                        </div>
                        {req.paystackTransferReference && (
                          <div className="text-[11px] num text-pos pt-1">
                            Ref: {req.paystackTransferReference}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons if pending */}
                    {req.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => setRejectingId(req.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-neg hover:bg-neg-soft rounded-lg transition-colors border border-neg-soft cursor-pointer"
                        >
                          Reject Request
                        </button>
                        <button
                          onClick={() => setApprovingId(req.id)}
                          className="lg-btn lg-btn-solid lg-btn-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark as Sent (Manual Payout)</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'users' ? (
            /* USER DIRECTORY */
            <div className="space-y-2">
              <div className="t-meta sm:hidden">
                Swipe horizontally to access all account columns & controls
              </div>
              <div className="bg-surface border border-line rounded-xl overflow-x-auto overscroll-x-contain touch-pan-x shadow-xs">
                <table className="min-w-[740px] w-full text-left text-xs">
                  <thead className="bg-sunken border-b border-line text-ink-3 uppercase font-bold num text-[10px]">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Role</th>
                      <th className="p-3 text-center">Profiles</th>
                      <th className="p-3 text-center">Transactions</th>
                      <th className="p-3">Total Balance</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-sunken cursor-pointer group transition-colors"
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('select') || target.closest('button')) return;
                          setInspectingUserId(u.id);
                        }}
                      >
                        <td className="p-3">
                          <div className="font-semibold text-ink group-hover:text-accent transition-colors">
                            {u.username}
                          </div>
                          <div className="t-meta num truncate max-w-[180px]">
                            {u.email}
                          </div>
                        </td>
                        <td className="p-3">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                            className={`px-2 py-1 rounded text-xs font-bold num focus:outline-none cursor-pointer ${
                              u.role === 'admin'
                                ? 'bg-amber-500/10 text-warn border border-warn/30'
                                : 'bg-sunken text-ink border border-line'
                            }`}
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="p-3 num text-center font-semibold text-ink">{u.profilesCount}</td>
                        <td className="p-3 num text-center font-semibold text-ink">{u.transactionsCount}</td>
                        <td className="p-3 num font-bold text-ink">
                          GHS {safeFmt(u.netBalance ?? u.totalBalance ?? 0)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setInspectingUserId(u.id)}
                              title="Inspect user holdings & details"
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sunken hover:bg-surface text-ink border border-line transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              disabled={u.id === currentAdmin?.id}
                              className="p-1.5 text-neg hover:bg-neg-soft rounded-md transition-colors disabled:opacity-30 cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* SYSTEM TELEMETRY */
            stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-surface border border-line space-y-3">
                  <h3 className="t-eyebrow">
                    System Liquidity & Financial Volume
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-line">
                      <span className="text-ink-2">Total Cumulative Ledger Balance:</span>
                      <span className="num font-bold text-ink">
                        GHS {safeFmt(stats.totalLedgerBalance ?? (stats as any).totalVaultsAmount ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-line">
                      <span className="text-ink-2">Total Logged Transactions:</span>
                      <span className="num font-bold text-ink">{stats.totalTransactionsCount ?? (stats as any).totalTransactions ?? 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-line">
                      <span className="text-ink-2">Active Budgets Enforced:</span>
                      <span className="num font-bold text-ink">{stats.totalBudgetsCount ?? 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-line">
                      <span className="text-ink-2">Savings Vaults Created:</span>
                      <span className="num font-bold text-ink">{stats.totalSavingsGoalsCount ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-line space-y-3">
                  <h3 className="t-eyebrow">
                    Treasury & Administrative Revenue
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-line">
                      <span className="text-ink-2">Standard 2% Vault Fees Collected:</span>
                      <span className="num font-bold text-pos">
                        GHS {safeFmt(stats.totalFeesCollected)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-line">
                      <span className="text-ink-2">Database Engine:</span>
                      <span className="num text-pos font-bold">
                        MongoDB Atlas Cloud
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-line">
                      <span className="text-ink-2">Payment Gateway:</span>
                      <span className="num text-accent font-bold">Paystack Verified</span>
                    </div>
                  </div>
                </div>

                {/* Paystack Webhook Configuration Card */}
                <div className="p-4 rounded-xl bg-sunken border border-line space-y-3 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-pos animate-pulse" />
                      <h3 className="t-eyebrow text-ink">
                        Paystack Webhook Endpoint (Starter Business Mode)
                      </h3>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-pos-soft text-pos num font-bold">
                      Active
                    </span>
                  </div>

                  <p className="t-meta leading-relaxed">
                    Paste this Webhook URL into your <strong>Paystack Dashboard &rarr; Settings &rarr; Preferences &rarr; API Keys &amp; Webhooks</strong>. Every customer deposit will be instantly verified and auto-credited to their savings vault.
                  </p>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-2.5 rounded-xl bg-surface border border-line num text-xs text-ink truncate select-all">
                      {typeof window !== 'undefined' ? `${window.location.origin}/api/paystack/webhook` : '/api/paystack/webhook'}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/api/paystack/webhook`;
                        navigator.clipboard.writeText(url);
                        setCopiedWebhook(true);
                        showNotification('Paystack Webhook URL copied to clipboard!', 'success');
                        setTimeout(() => setCopiedWebhook(false), 3000);
                      }}
                      className="lg-btn lg-btn-solid lg-btn-sm shrink-0"
                    >
                      {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWebhook ? 'Copied!' : 'Copy URL'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-line bg-surface flex items-center justify-between text-xs t-meta">
          <span>Security Protocol: Role Enforcement Guarded</span>
          <button
            onClick={onClose}
            className="lg-btn lg-btn-solid lg-btn-sm"
          >
            Close Portal
          </button>
        </div>
      </div>

      {/* Approval Sub-Modal */}
      {approvingId && (() => {
        const approvingReq = withdrawals.find((w) => w.id === approvingId);
        return (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 animate-in fade-in">
            <div className="w-full max-w-md bg-surface rounded-2xl border border-line p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="t-card flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-pos" />
                  <span>Approve Withdrawal</span>
                </h3>
                <button
                  onClick={() => setApprovingId(null)}
                  className="lg-iconbtn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="t-body leading-relaxed">
                Are you sure you want to approve this withdrawal request?
              </p>

              {approvingReq && (
                <div className="p-3.5 rounded-xl bg-sunken border border-line space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-ink-3">Account Holder:</span>
                    <span className="font-bold text-ink">
                      {approvingReq.accountName || approvingReq.userName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-ink-3">Payout Destination:</span>
                    <span className="font-semibold num text-ink">
                      {approvingReq.bankName} • {approvingReq.accountNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-ink-3">Vault Name:</span>
                    <span className="text-ink font-medium">
                      {approvingReq.goalName}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-line flex justify-between items-baseline">
                    <span className="font-bold text-ink">Net Payout to Send:</span>
                    <span className="num text-sm font-bold text-pos">
                      {formatCurrency(approvingReq.netPayoutAmount, approvingReq.currency)}
                    </span>
                  </div>
                </div>
              )}

              <p className="t-meta leading-relaxed">
                The money was deducted straight from the person's vault when requested. Clicking confirm will mark this withdrawal as approved and paid.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovingId(null)}
                  className="lg-btn lg-btn-quiet lg-btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="lg-btn lg-btn-solid lg-btn-sm disabled:opacity-50"
                >
                  {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Yes, Approve &amp; Mark as Paid</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Rejection Sub-Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 animate-in fade-in">
          <div className="w-full max-w-md bg-surface rounded-2xl border border-line p-5 space-y-4 shadow-2xl">
            <h3 className="t-card text-neg">Reject Withdrawal Request</h3>
            <p className="t-meta">
              Specify the reason for rejection. The user's vault balance will remain intact and will return to active status.
            </p>

            <div>
              <label className="block t-eyebrow mb-1">Reason for Rejection</label>
              <input
                type="text"
                placeholder="e.g. Account name mismatch, incorrect mobile money number"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingId(null)}
                className="lg-btn lg-btn-quiet lg-btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="lg-btn lg-btn-danger lg-btn-sm disabled:opacity-50"
              >
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Reject Request</span>
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
