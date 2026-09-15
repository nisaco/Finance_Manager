export interface User {
  id: string;
  username: string;
  name?: string;
  email: string;
  role: 'admin' | 'user';
  agreedToTermsAt: string;
  createdAt: string;
  hasOfflinePin?: boolean;
}

export interface Profile {
  id: string;
  userId?: string;
  name: string;
  color: string;
  displayCurrency: string;
  exchangeRates: Record<string, number>;
  type?: 'personal' | 'family' | 'business' | 'savings' | string;
  isLocked?: boolean;
  balanceResetAt?: string;
  balanceResetAmount?: number;
  autoMonthlyReset?: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  profileId: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  category: string;
  date: string;
  note: string;
  description?: string;
  recurring: 'none' | 'weekly' | 'monthly';
  createdAt: string;
  pendingSync?: boolean;
}

export interface Budget {
  id: string;
  profileId: string;
  category: string;
  limit: number;
  currency: string;
  spent?: number;
  percentage?: number;
  remaining?: number;
  rawSpent?: number;
  cappedSpent?: number;
  isExceeded?: boolean;
  status?: 'normal' | 'exceeded_locked';
}

export interface Goal {
  id: string;
  profileId: string;
  name: string;
  target: number;
  current: number;
  currency: string;
  deadline?: string;
  status?: 'active' | 'pending_withdrawal' | 'withdrawn' | 'locked';
  vaultType?: 'high_yield_vault' | 'locked_savings' | 'emergency_stash' | 'flexible_goal';
  interestRateApr?: number;
  isLocked?: boolean;
  lockPeriodDays?: number;
  paystackDestination: {
    type: 'paystack_recipient' | 'none';
    recipientCode?: string;
    accountLast4?: string;
    bankName?: string;
    bankCode?: string;
    accountName?: string;
    accountNumber?: string;
  };
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  profileId: string;
  goalId: string;
  goalName: string;
  vaultAmount: number;
  requestedAmount?: number;
  remainingVaultBalance?: number;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  isEarlyWithdrawal: boolean;
  standardFeePercent: number; // 2%
  earlyPenaltyPercent: number; // 10% if early, else 0%
  totalFeePercent: number; // 2% or 12%
  feeAmount: number;
  netPayoutAmount: number;
  currency: string;
  payoutDetails: {
    bankOrProvider: string;
    accountNumber: string;
    accountName: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  adminNotes?: string;
  approvedAt?: string;
  paystackTransferReference?: string;
  createdAt: string;
}

export interface AIMessageQuota {
  usedCount: number;
  maxCount: number; // 40
  remaining: number;
  remainingMessages?: number;
  windowHours: number; // 8
  cooldownHours: number; // 4
  isLocked: boolean;
  lockedUntil?: string | null;
  message?: string;
}

export interface Debt {
  id: string;
  profileId: string;
  direction: 'i_owe' | 'owed_to_me';
  person: string;
  amount: number;
  paid: number;
  currency: string;
  dueDate?: string;
  note: string;
  createdAt: string;
}

export interface FundTransfer {
  id: string;
  profileId: string;
  goalId: string;
  amount: number;
  currency: string;
  direction: 'deposit' | 'withdrawal';
  paystackReference: string;
  status: 'pending' | 'success' | 'failed';
  gatewayResponse?: string;
  rawWebhookPayload?: any;
  createdAt: string;
}

export interface SummaryReport {
  currency: string;
  netBalance: number;
  totalIncome: number;
  totalExpense: number;
  monthIncome: number;
  monthExpense: number;
  monthNet: number;
  savingsRate: number;
  totalSavedInGoals: number;
  totalIOwe: number;
  totalOwedToMe: number;
  transactionCount: number;
  allTimeNetBalance?: number;
  cycleNetBalance?: number;
  cycleMonth?: string;
  isMonthlyResetActive?: boolean;
  balanceResetAt?: string;
}

export interface MonthlyHistoryRecord {
  yearMonth: string; // e.g. "2026-09"
  label: string; // e.g. "September 2026"
  isCurrentMonth: boolean;
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
  transactionCount: number;
  transactions: Transaction[];
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface PaystackBank {
  id: number;
  name: string;
  code: string;
  active: boolean;
  type: string;
  currency: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, any>;
  createdAt: string;
}

export interface UserWithStats extends User {
  profilesCount: number;
  transactionsCount: number;
  totalBalance?: number;
  netBalance?: number;
  goalsCount?: number;
  totalVaultsSaved?: number;
}

export interface AdminPlatformStats {
  totalUsers: number;
  totalProfiles?: number;
  totalTransactions?: number;
  totalTransactionsCount?: number;
  pendingWithdrawalsCount: number;
  totalPendingWithdrawals?: number;
  totalApprovedWithdrawals?: number;
  totalSavingsVaultAmount: number;
  totalVaultsAmount?: number;
  totalFeesCollected: number;
  totalLedgerBalance?: number;
  totalBudgetsCount?: number;
  totalSavingsGoalsCount?: number;
}
