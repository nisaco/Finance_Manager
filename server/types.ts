export interface Profile {
  id: string;
  name: string;
  color: string;
  displayCurrency: string;
  exchangeRates: Record<string, number>; // Value of 1 unit in GHS
  type?: 'personal' | 'family' | 'business' | 'savings' | string;
  isLocked?: boolean;
  pinHash?: string;
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
}

export interface Goal {
  id: string;
  profileId: string;
  name: string;
  target: number;
  current: number;
  currency: string;
  deadline?: string;
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
