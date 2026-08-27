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
} from '../types';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
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
    // Notify auth context of expired session
    window.dispatchEvent(new CustomEvent('ledger:unauthorized'));
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
  login: (pin: string) => request<{ success: boolean; message: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ pin }) }),
  logout: () => request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  changePin: (currentPin: string, newPin: string) =>
    request<{ success: boolean; message?: string }>('/api/auth/change-pin', {
      method: 'POST',
      body: JSON.stringify({ currentPin, newPin }),
    }),

  // Profiles
  getProfiles: () => request<Profile[]>('/api/profiles'),
  createProfile: (data: { name: string; color?: string; displayCurrency?: string; type?: string } | string, color = '#C9A24B', displayCurrency = 'GHS') => {
    const body = typeof data === 'string'
      ? { name: data, color, displayCurrency, type: 'personal' }
      : { name: data.name, color: data.color || color, displayCurrency: data.displayCurrency || displayCurrency, type: data.type || 'personal' };
    return request<Profile>('/api/profiles', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  updateProfile: (id: string, updates: Partial<Profile>) =>
    request<Profile>(`/api/profiles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteProfile: (id: string) => request<{ success: boolean }>(`/api/profiles/${id}`, { method: 'DELETE' }),
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

  // Paystack
  getPaystackBanks: (country = 'ghana') => request<PaystackBank[]>(`/api/paystack/banks?country=${country}`),
  resolveAccount: (accountNumber: string, bankCode: string) =>
    request<{ accountName: string; accountNumber: string }>('/api/paystack/resolve-account', {
      method: 'POST',
      body: JSON.stringify({ accountNumber, bankCode }),
    }),
  createRecipient: (name: string, accountNumber: string, bankCode: string, currency = 'GHS') =>
    request<{ recipientCode: string; details: any }>('/api/paystack/recipient', {
      method: 'POST',
      body: JSON.stringify({ name, accountNumber, bankCode, currency }),
    }),
  verifyTransfer: (reference: string) => request<FundTransfer>(`/api/paystack/verify/${reference}`),

  // Settings & System
  getSettings: (profileId: string) =>
    request<{
      profile: Profile;
      paystack: { isConfigured: boolean; isLiveMode: boolean; publicKey: string };
    }>(`/api/settings?profileId=${profileId}`),
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
};
