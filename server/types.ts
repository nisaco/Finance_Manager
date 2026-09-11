export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  agreedToTermsAt: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  userId?: string;
  name: string;
  color: string;
  displayCurrency: string;
  exchangeRates: Record<string, number>; // Value of 1 unit in GHS
  type?: 'personal' | 'family' | 'business' | 'savings' | string;
  isLocked?: boolean;
  pinHash?: string;
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
  recurring: 'none' | 'weekly' | 'monthly';
  createdAt: string;
}

export interface Budget {
  id: string;
  profileId: string;
  category: string;
  limit: number;
  currency: string;
  isExceeded?: boolean;
  cappedSpent?: number;
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
    accountName?: string;
    accountNumber?: string;
  };
  createdAt: string;
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

export interface AuditLog {
  id: string;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, any>;
  createdAt: string;
}

export interface LedgerDatabase {
  pinHash: string;
  profiles: Profile[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  debts: Debt[];
  transfers: FundTransfer[];
  auditLogs: AuditLog[];
}
