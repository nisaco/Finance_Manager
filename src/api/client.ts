import {
  Profile,
  Transaction,
  Budget,
  Goal,
  Debt,
  FundTransfer,
  SummaryReport,
  CategoryBreakdown,
  MonthlyTrend,
  PaystackBank,
  AuditLog,
  WithdrawalRequest,
  UserWithStats,
  AdminPlatformStats,
  AIMessageQuota,
  User,
  MonthlyHistoryRecord,
} from '../types';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('ledger_token') : null;
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include',
  });

  if (response.status === 401) {
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    let errorMsg = `Request failed: ${response.status}`;
    try {
      const errData = await response.json();
      errorMsg = errData.error || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    return (await response.text()) as unknown as T;
  }

  return response.json();
}

export const api = {
  // Auth
  checkAuthStatus: () => request<{ authenticated: boolean }>('/api/auth/status'),
  getAuthConfig: () => request<{ googleClientId: string }>('/api/auth/config'),
  login: (pin: string) => request<{ success: boolean; message: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ pin }) }),
  logout: () => request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  forgotPassword: (identifier: string) =>
    request<{ success: boolean; message: string; email: string; username?: string; resetCode?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    }),
  resetPassword: (data: { email?: string; identifier?: string; code: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  changePin: (currentPin: string, newPin: string) =>
    request<{ success: boolean; message?: string }>('/api/auth/change-pin', {
      method: 'POST',
      body: JSON.stringify({ currentPin, newPin }),
    }),
  loginWithGoogle: (data: { credential?: string; email?: string; name?: string; requestedUsername?: string }) =>
    request<{ success: boolean; token: string; user: User; isNewUser: boolean }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateUsername: (username: string) =>
    request<{ success: boolean; user: User }>('/api/auth/username', {
      method: 'PUT',
      body: JSON.stringify({ username }),
    }),

  // Profiles
  getProfiles: () => request<Profile[]>('/api/profiles'),
  createProfile: (
    data:
      | {
          name: string;
          color?: string;
          displayCurrency?: string;
          type?: string;
          isLocked?: boolean;
          pin?: string;
        }
      | string,
    color = '#1A1A1A',
    displayCurrency = 'GHS'
  ) => {
    const body =
      typeof data === 'string'
        ? { name: data, color, displayCurrency, type: 'personal' }
        : {
            name: data.name,
            color: data.color || color,
            displayCurrency: data.displayCurrency || displayCurrency,
            type: data.type || 'personal',
            isLocked: Boolean(data.isLocked),
            pin: data.pin,
          };
    return request<Profile>('/api/profiles', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  updateProfile: (
    id: string,
    updates: Partial<Profile> & { pin?: string; newPin?: string; currentPin?: string }
  ) =>
    request<Profile>(`/api/profiles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  verifyProfilePin: (id: string, pin: string) =>
    request<{ success: boolean; message?: string }>(`/api/profiles/${id}/verify-pin`, {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),
  deleteProfile: (id: string) => request<{ success: boolean }>(`/api/profiles/${id}`, { method: 'DELETE' }),
  resetProfileBalance: (profileId: string, notes?: string) =>
    request<{ success: boolean; message: string; profile: Profile }>(`/api/profiles/${profileId}/reset-balance`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  updateRates: (profileId: string, exchangeRates: Record<string, number>) =>
    request<Profile>(`/api/profiles/${profileId}`, {
      method: 'PATCH',
      body: JSON.stringify({ exchangeRates }),
    }),

  // Transactions
  getTransactions: (profileId: string, params?: Record<string, string>) => {
    const query = new URLSearchParams({ profileId, ...(params || {}) });
    return request<Transaction[]>(`/api/transactions?${query.toString()}`);
  },
  createTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) =>
    request<Transaction>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(tx),
    }),
  updateTransaction: (id: string, updates: Partial<Transaction>) =>
    request<Transaction>(`/api/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteTransaction: (id: string) => request<{ success: boolean }>(`/api/transactions/${id}`, { method: 'DELETE' }),
  exportTransactionsCsv: (profileId: string) => request<string>(`/api/transactions/export?profileId=${profileId}`),
  importTransactionsCsv: (profileId: string, csvData: string) =>
    request<{ success: boolean; count: number; message: string }>('/api/transactions/import', {
      method: 'POST',
      body: JSON.stringify({ profileId, csvData }),
    }),

  // Budgets
  getBudgets: (profileId: string) => request<Budget[]>(`/api/budgets?profileId=${profileId}`),
  upsertBudget: (budget: Omit<Budget, 'id'>) =>
    request<Budget>('/api/budgets', {
      method: 'POST',
      body: JSON.stringify(budget),
    }),
  deleteBudget: (id: string) => request<{ success: boolean }>(`/api/budgets/${id}`, { method: 'DELETE' }),

  // Goals
  getGoals: (profileId: string) => request<Goal[]>(`/api/goals?profileId=${profileId}`),
  createGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) =>
    request<Goal>('/api/goals', {
      method: 'POST',
      body: JSON.stringify(goal),
    }),
  updateGoal: (id: string, updates: Partial<Goal>) =>
    request<Goal>(`/api/goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteGoal: (id: string) => request<{ success: boolean }>(`/api/goals/${id}`, { method: 'DELETE' }),
  fundGoal: (goalId: string, amount: number, currency: string) =>
    request<{
      success: boolean;
      mode: string;
      reference?: string;
      simulated?: boolean;
      message: string;
      transfer?: FundTransfer;
      goal?: Goal;
    }>(`/api/goals/${goalId}/fund`, {
      method: 'POST',
      body: JSON.stringify({ amount, currency }),
    }),
  getGoalTransfers: (goalId: string) => request<FundTransfer[]>(`/api/goals/${goalId}/transfers`),

  // Debts
  getDebts: (profileId: string) => request<Debt[]>(`/api/debts?profileId=${profileId}`),
  createDebt: (debt: Omit<Debt, 'id' | 'createdAt'>) =>
    request<Debt>('/api/debts', {
      method: 'POST',
      body: JSON.stringify(debt),
    }),
  updateDebt: (id: string, updates: Partial<Debt>) =>
    request<Debt>(`/api/debts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  recordDebtPayment: (debtId: string, amount: number) =>
    request<{ success: boolean; debt: Debt }>(`/api/debts/${debtId}/payment`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
  deleteDebt: (id: string) => request<{ success: boolean }>(`/api/debts/${id}`, { method: 'DELETE' }),

  // Reports
  getSummaryReport: (profileId: string) => request<SummaryReport>(`/api/reports/summary?profileId=${profileId}`),
  getCategoryBreakdown: (profileId: string, type: 'expense' | 'income' = 'expense', month?: string) => {
    const q = new URLSearchParams({ profileId, type, ...(month ? { month } : {}) });
    return request<{ currency: string; total: number; breakdown: CategoryBreakdown[] }>(
      `/api/reports/category-breakdown?${q.toString()}`
    );
  },
  getTrendReport: (profileId: string, months = 6) =>
    request<{ currency: string; trend: MonthlyTrend[] }>(`/api/reports/trend?profileId=${profileId}&months=${months}`),
  getMonthlyHistory: (profileId: string) =>
    request<{ currency: string; months: MonthlyHistoryRecord[] }>(`/api/reports/monthly-history?profileId=${profileId}`),

  // Paystack
  getPaystackBanks: (country = 'ghana') => request<PaystackBank[]>(`/api/paystack/banks?country=${country}`),
  resolveAccount: (accountNumber: string, bankCode: string) =>
    request<{ accountName: string; accountNumber: string; verified?: boolean }>('/api/paystack/resolve-account', {
      method: 'POST',
      body: JSON.stringify({ accountNumber, bankCode }),
    }),
  createRecipient: (name: string, accountNumber: string, bankCode: string, currency = 'GHS') =>
    request<{ recipientCode: string; details: any }>('/api/paystack/recipient', {
      method: 'POST',
      body: JSON.stringify({ name, accountNumber, bankCode, currency }),
    }),
  verifyTransfer: (reference: string) => request<FundTransfer>(`/api/paystack/verify/${reference}`),
  initializeDeposit: (data: { email?: string; amount: number; currency?: string; goalId: string; profileId: string; callbackUrl?: string }) =>
    request<{ authorizationUrl: string; accessCode: string; reference: string; simulated: boolean }>('/api/paystack/initialize-deposit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  verifyDeposit: (reference: string) =>
    request<{ status: 'success' | 'failed' | 'pending'; message: string; transfer: FundTransfer | null; goal?: any }>(
      `/api/paystack/verify-deposit/${reference}`
    ),

  // Settings & System
  getSettings: (profileId: string) =>
    request<{
      profile: Profile;
      database?: {
        connected: boolean;
        databaseName: string;
        counts: {
          profiles: number;
          transactions: number;
          budgets: number;
          goals: number;
          debts: number;
          transfers: number;
        };
      };
      paystack: { isConfigured: boolean; isLiveMode: boolean; publicKey: string };
    }>(`/api/settings?profileId=${profileId}`),
  getDbStatus: () =>
    request<{
      connected: boolean;
      databaseName: string;
      counts: {
        profiles: number;
        transactions: number;
        budgets: number;
        goals: number;
        debts: number;
        transfers: number;
      };
    }>('/api/db/status'),
  cleanSampleData: () =>
    request<{
      success: boolean;
      message: string;
      deleted: {
        deletedTransactions: number;
        deletedBudgets: number;
        deletedGoals: number;
        deletedDebts: number;
      };
    }>('/api/db/clean-sample-data', { method: 'POST' }),
  wipeAllData: (keepProfiles = true) =>
    request<{ success: boolean; message: string }>('/api/db/wipe-all', {
      method: 'POST',
      body: JSON.stringify({ keepProfiles }),
    }),
  getAuditLogs: () => request<AuditLog[]>('/api/audit-logs'),
  getBackup: () => request<any>('/api/export-all'),
  restoreBackup: (payload: any) =>
    request<{ success: boolean; message: string }>('/api/migrate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  migrateData: (payload: any) =>
    request<{ success: boolean; message: string }>('/api/migrate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  setPin: (currentPin: string, newPin: string) =>
    request<{ success: boolean; message?: string }>('/api/auth/change-pin', {
      method: 'POST',
      body: JSON.stringify({ currentPin, newPin }),
    }),

  // Gemini AI Advisor & Search Grounding
  sendAIChat: (data: {
    messages: {
      role: 'user' | 'model';
      content: string;
      attachments?: { name: string; type: string; size?: number; data: string }[];
    }[];
    model?: string;
    enableSearch?: boolean;
    profileContext?: any;
    profileId?: string;
  }) =>
    request<{
      text: string;
      modelUsed: string;
      groundingSources?: { title?: string; uri?: string }[];
      searchQueries?: string[];
      quota?: AIMessageQuota;
    }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getAIQuota: (profileId?: string) =>
    request<AIMessageQuota>(`/api/ai/quota${profileId ? `?profileId=${encodeURIComponent(profileId)}` : ''}`),

  // Stealth Admin Clearance
  stealthAdminAuth: (secretKey: string) =>
    request<{
      success: boolean;
      message: string;
      token?: string;
      user?: User;
    }>('/api/auth/stealth-admin', {
      method: 'POST',
      body: JSON.stringify({ secretKey }),
    }),

  // Savings Vault Withdrawals
  requestVaultWithdrawal: (
    goalId: string,
    payoutDetails: {
      amount?: number;
      bankOrProvider: string;
      accountNumber: string;
      accountName: string;
    }
  ) =>
    request<WithdrawalRequest>(`/api/goals/${goalId}/withdraw-request`, {
      method: 'POST',
      body: JSON.stringify(payoutDetails),
    }),
  getWithdrawals: (all?: boolean) =>
    request<WithdrawalRequest[]>(`/api/withdrawals${all ? '?all=true' : ''}`),

  // User Role Management
  setMyRole: (role: 'admin' | 'user') =>
    request<{ success: boolean; role: 'admin' | 'user'; user: User }>('/api/user/role', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  // Admin "God Mode"
  getAdminStats: () => request<AdminPlatformStats>('/api/admin/stats'),
  getAdminUsers: () => request<UserWithStats[]>('/api/admin/users'),
  getAdminUserDetails: (id: string) => request<any>(`/api/admin/users/${id}/details`),
  updateUserRole: (id: string, role: 'admin' | 'user') =>
    request<{ success: boolean; role: 'admin' | 'user' }>(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  deleteUser: (id: string) =>
    request<{ success: boolean }>(`/api/admin/users/${id}`, {
      method: 'DELETE',
    }),
  getAdminWithdrawals: () => request<WithdrawalRequest[]>('/api/admin/withdrawals'),
  approveAdminWithdrawal: (id: string, data: { paystackReference?: string; notes?: string }) =>
    request<{ success: boolean; request: WithdrawalRequest }>(`/api/admin/withdrawals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  rejectAdminWithdrawal: (id: string, reason?: string) =>
    request<{ success: boolean; request: WithdrawalRequest }>(`/api/admin/withdrawals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};
