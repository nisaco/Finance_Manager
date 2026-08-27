import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { LedgerDatabase, Profile, Transaction, Budget, Goal, Debt, FundTransfer, AuditLog } from './types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'ledger.json');

// Default initial hash for PIN '1234' (can be updated via auth endpoints)
const DEFAULT_PIN = '1234';
const DEFAULT_PIN_HASH = bcrypt.hashSync(DEFAULT_PIN, 10);

const initialProfiles: Profile[] = [
  {
    id: 'prof_personal',
    name: 'Personal',
    color: '#C9A24B',
    displayCurrency: 'GHS',
    exchangeRates: {
      GHS: 1,
      USD: 15.5,
      EUR: 17.0,
      GBP: 19.5,
      NGN: 0.0098,
    },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'prof_business',
    name: 'Business',
    color: '#4FA878',
    displayCurrency: 'GHS',
    exchangeRates: {
      GHS: 1,
      USD: 15.5,
      EUR: 17.0,
      GBP: 19.5,
      NGN: 0.0098,
    },
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const now = new Date();
const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

const initialTransactions: Transaction[] = [
  {
    id: 'tx_1',
    profileId: 'prof_personal',
    type: 'income',
    amount: 12500,
    currency: 'GHS',
    category: 'Consulting & Retainer',
    date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
    note: 'Monthly client engineering retainer',
    recurring: 'monthly',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx_2',
    profileId: 'prof_personal',
    type: 'expense',
    amount: 1450,
    currency: 'GHS',
    category: 'Housing & Utilities',
    date: new Date(now.getFullYear(), now.getMonth(), 3).toISOString().split('T')[0],
    note: 'Electricity prepaid & fiber internet',
    recurring: 'monthly',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx_3',
    profileId: 'prof_personal',
    type: 'expense',
    amount: 820,
    currency: 'GHS',
    category: 'Groceries & Household',
    date: new Date(now.getFullYear(), now.getMonth(), 6).toISOString().split('T')[0],
    note: 'Weekly fresh market stocking',
    recurring: 'none',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx_4',
    profileId: 'prof_personal',
    type: 'expense',
    amount: 350,
    currency: 'GHS',
    category: 'Transport & Fuel',
    date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString().split('T')[0],
    note: 'Fuel tank refill',
    recurring: 'none',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx_5',
    profileId: 'prof_personal',
    type: 'income',
    amount: 2800,
    currency: 'GHS',
    category: 'Side Project Sales',
    date: new Date(now.getFullYear(), now.getMonth(), 14).toISOString().split('T')[0],
    note: 'Digital tool licenses payout',
    recurring: 'none',
    createdAt: new Date().toISOString(),
  },
];

const initialBudgets: Budget[] = [
  {
    id: 'bgt_1',
    profileId: 'prof_personal',
    category: 'Groceries & Household',
    limit: 2500,
    currency: 'GHS',
  },
  {
    id: 'bgt_2',
    profileId: 'prof_personal',
    category: 'Housing & Utilities',
    limit: 2000,
    currency: 'GHS',
  },
  {
    id: 'bgt_3',
    profileId: 'prof_personal',
    category: 'Transport & Fuel',
    limit: 1200,
    currency: 'GHS',
  },
  {
    id: 'bgt_4',
    profileId: 'prof_personal',
    category: 'Dining & Leisure',
    limit: 1000,
    currency: 'GHS',
  },
];

const initialGoals: Goal[] = [
  {
    id: 'goal_1',
    profileId: 'prof_personal',
    name: 'Emergency Reserve Fund',
    target: 30000,
    current: 12000,
    currency: 'GHS',
    deadline: new Date(now.getFullYear() + 1, 11, 31).toISOString().split('T')[0],
    paystackDestination: {
      type: 'paystack_recipient',
      recipientCode: 'RCP_test_safevault982',
      accountLast4: '4821',
      bankName: 'MTN Mobile Money Ghana',
      accountName: 'Personal Savings Vault',
      accountNumber: '0244000000',
    },
    createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'goal_2',
    profileId: 'prof_personal',
    name: 'Q4 Tech Equipment Upgrade',
    target: 15000,
    current: 4500,
    currency: 'GHS',
    deadline: new Date(now.getFullYear(), 10, 30).toISOString().split('T')[0],
    paystackDestination: {
      type: 'none',
    },
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const initialDebts: Debt[] = [
  {
    id: 'debt_1',
    profileId: 'prof_personal',
    direction: 'owed_to_me',
    person: 'Kwame (Contract Balance)',
    amount: 4500,
    paid: 1500,
    currency: 'GHS',
    dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 15).toISOString().split('T')[0],
    note: 'Second milestone payment for web app overhaul',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'debt_2',
    profileId: 'prof_personal',
    direction: 'i_owe',
    person: 'Hardware Supplier (Studio Setup)',
    amount: 2200,
    paid: 1000,
    currency: 'GHS',
    dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0],
    note: 'Remainder for monitor and desk delivery',
    createdAt: new Date().toISOString(),
  },
];

const initialTransfers: FundTransfer[] = [
  {
    id: 'txf_1',
    profileId: 'prof_personal',
    goalId: 'goal_1',
    amount: 2000,
    currency: 'GHS',
    direction: 'deposit',
    paystackReference: 'LEDGER_TXF_INIT_001',
    status: 'success',
    gatewayResponse: 'Successful automated Paystack transfer to savings vault',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const initialAuditLogs: AuditLog[] = [
  {
    id: 'audit_init',
    action: 'system.database.initialized',
    meta: { status: 'secure_engine_ready' },
    createdAt: new Date().toISOString(),
  },
];

class LedgerDatabaseManager {
  private db: LedgerDatabase;
  private isLoaded = false;

  constructor() {
    this.ensureDirectory();
    this.db = this.loadDatabase();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadDatabase(): LedgerDatabase {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.isLoaded = true;
        return {
          pinHash: parsed.pinHash || DEFAULT_PIN_HASH,
          profiles: parsed.profiles || initialProfiles,
          transactions: parsed.transactions || initialTransactions,
          budgets: parsed.budgets || initialBudgets,
          goals: parsed.goals || initialGoals,
          debts: parsed.debts || initialDebts,
          transfers: parsed.transfers || initialTransfers,
          auditLogs: parsed.auditLogs || initialAuditLogs,
        };
      }
    } catch (err) {
      console.error('Error loading database file, initializing defaults:', err);
    }

    const defaultDb: LedgerDatabase = {
      pinHash: process.env.APP_PIN_HASH || DEFAULT_PIN_HASH,
      profiles: initialProfiles,
      transactions: initialTransactions,
      budgets: initialBudgets,
      goals: initialGoals,
      debts: initialDebts,
      transfers: initialTransfers,
      auditLogs: initialAuditLogs,
    };

    this.saveToDisk(defaultDb);
    this.isLoaded = true;
    return defaultDb;
  }

  private saveToDisk(data: LedgerDatabase) {
    try {
      this.ensureDirectory();
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Failed to atomically write database file:', err);
    }
  }

  public getRaw(): LedgerDatabase {
    return this.db;
  }

  public persist() {
    this.saveToDisk(this.db);
  }

  // Audit Logger
  public logAudit(action: string, entity?: string, entityId?: string, meta?: Record<string, any>) {
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      action,
      entity,
      entityId,
      meta,
      createdAt: new Date().toISOString(),
    };
    this.db.auditLogs.unshift(log);
    if (this.db.auditLogs.length > 500) {
      this.db.auditLogs = this.db.auditLogs.slice(0, 500);
    }
    this.persist();
  }

  // Auth
  public getPinHash(): string {
    return this.db.pinHash || DEFAULT_PIN_HASH;
  }

  public setPinHash(hash: string) {
    this.db.pinHash = hash;
    this.logAudit('auth.pin.updated');
    this.persist();
  }

  // Profiles
  public getProfiles(): Profile[] {
    return this.db.profiles;
  }

  public getProfile(id: string): Profile | undefined {
    return this.db.profiles.find((p) => p.id === id);
  }

  public createProfile(name: string, color: string, displayCurrency = 'GHS'): Profile {
    const newProf: Profile = {
      id: `prof_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      color,
      displayCurrency,
      exchangeRates: {
        GHS: 1,
        USD: 15.5,
        EUR: 17.0,
        GBP: 19.5,
        NGN: 0.0098,
      },
      createdAt: new Date().toISOString(),
    };
    this.db.profiles.push(newProf);
    this.logAudit('profile.created', 'Profile', newProf.id, { name });
    this.persist();
    return newProf;
  }

  public updateProfile(id: string, updates: Partial<Profile>): Profile | null {
    const index = this.db.profiles.findIndex((p) => p.id === id);
    if (index === -1) return null;
    this.db.profiles[index] = { ...this.db.profiles[index], ...updates };
    this.logAudit('profile.updated', 'Profile', id, updates);
    this.persist();
    return this.db.profiles[index];
  }

  public deleteProfile(id: string): boolean {
    if (this.db.profiles.length <= 1) {
      throw new Error('Cannot delete the last remaining profile');
    }
    this.db.profiles = this.db.profiles.filter((p) => p.id !== id);
    this.db.transactions = this.db.transactions.filter((t) => t.profileId !== id);
    this.db.budgets = this.db.budgets.filter((b) => b.profileId !== id);
    this.db.goals = this.db.goals.filter((g) => g.profileId !== id);
    this.db.debts = this.db.debts.filter((d) => d.profileId !== id);
    this.db.transfers = this.db.transfers.filter((t) => t.profileId !== id);
    this.logAudit('profile.deleted', 'Profile', id);
    this.persist();
    return true;
  }

  // Transactions
  public getTransactions(profileId: string): Transaction[] {
    return this.db.transactions
      .filter((t) => t.profileId === profileId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public createTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
    const newTx: Transaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.db.transactions.push(newTx);
    this.logAudit('transaction.created', 'Transaction', newTx.id, {
      amount: newTx.amount,
      type: newTx.type,
      category: newTx.category,
    });
    this.persist();
    return newTx;
  }

  public updateTransaction(id: string, updates: Partial<Transaction>): Transaction | null {
    const index = this.db.transactions.findIndex((t) => t.id === id);
    if (index === -1) return null;
    this.db.transactions[index] = { ...this.db.transactions[index], ...updates };
    this.logAudit('transaction.updated', 'Transaction', id, updates);
    this.persist();
    return this.db.transactions[index];
  }

  public deleteTransaction(id: string): boolean {
    const tx = this.db.transactions.find((t) => t.id === id);
    if (!tx) return false;
    this.db.transactions = this.db.transactions.filter((t) => t.id !== id);
    this.logAudit('transaction.deleted', 'Transaction', id);
    this.persist();
    return true;
  }

  // Budgets
  public getBudgets(profileId: string): Budget[] {
    return this.db.budgets.filter((b) => b.profileId === profileId);
  }

  public upsertBudget(budget: Omit<Budget, 'id'>): Budget {
    const existingIndex = this.db.budgets.findIndex(
      (b) => b.profileId === budget.profileId && b.category.toLowerCase() === budget.category.toLowerCase()
    );
    if (existingIndex >= 0) {
      this.db.budgets[existingIndex] = {
        ...this.db.budgets[existingIndex],
        limit: budget.limit,
        currency: budget.currency,
      };
      this.logAudit('budget.updated', 'Budget', this.db.budgets[existingIndex].id, budget);
      this.persist();
      return this.db.budgets[existingIndex];
    } else {
      const newBudget: Budget = {
        ...budget,
        id: `bgt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      this.db.budgets.push(newBudget);
      this.logAudit('budget.created', 'Budget', newBudget.id, budget);
      this.persist();
      return newBudget;
    }
  }

  public deleteBudget(id: string): boolean {
    this.db.budgets = this.db.budgets.filter((b) => b.id !== id);
    this.logAudit('budget.deleted', 'Budget', id);
    this.persist();
    return true;
  }

  // Goals
  public getGoals(profileId: string): Goal[] {
    return this.db.goals.filter((g) => g.profileId === profileId);
  }

  public getGoal(id: string): Goal | undefined {
    return this.db.goals.find((g) => g.id === id);
  }

  public createGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'current'> & { current?: number }): Goal {
    const newGoal: Goal = {
      ...goal,
      current: goal.current || 0,
      id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.db.goals.push(newGoal);
    this.logAudit('goal.created', 'Goal', newGoal.id, { name: newGoal.name, target: newGoal.target });
    this.persist();
    return newGoal;
  }

  public updateGoal(id: string, updates: Partial<Goal>): Goal | null {
    const index = this.db.goals.findIndex((g) => g.id === id);
    if (index === -1) return null;
    const existing = this.db.goals[index];

    // Non-negotiable security requirement:
    // When a real-money destination (paystack_recipient) is configured, Goal.current cannot be altered directly via standard PATCH!
    if (existing.paystackDestination?.type === 'paystack_recipient' && updates.current !== undefined) {
      delete updates.current;
    }

    this.db.goals[index] = { ...existing, ...updates };
    this.logAudit('goal.updated', 'Goal', id, updates);
    this.persist();
    return this.db.goals[index];
  }

  public deleteGoal(id: string): boolean {
    this.db.goals = this.db.goals.filter((g) => g.id !== id);
    this.db.transfers = this.db.transfers.filter((t) => t.goalId !== id);
    this.logAudit('goal.deleted', 'Goal', id);
    this.persist();
    return true;
  }

  // Debts
  public getDebts(profileId: string): Debt[] {
    return this.db.debts.filter((d) => d.profileId === profileId);
  }

  public createDebt(debt: Omit<Debt, 'id' | 'createdAt' | 'paid'> & { paid?: number }): Debt {
    const newDebt: Debt = {
      ...debt,
      paid: debt.paid || 0,
      id: `debt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.db.debts.push(newDebt);
    this.logAudit('debt.created', 'Debt', newDebt.id, { person: newDebt.person, amount: newDebt.amount });
    this.persist();
    return newDebt;
  }

  public updateDebt(id: string, updates: Partial<Debt>): Debt | null {
    const index = this.db.debts.findIndex((d) => d.id === id);
    if (index === -1) return null;
    this.db.debts[index] = { ...this.db.debts[index], ...updates };
    this.logAudit('debt.updated', 'Debt', id, updates);
    this.persist();
    return this.db.debts[index];
  }

  public recordDebtPayment(id: string, paymentAmount: number): Debt | null {
    const index = this.db.debts.findIndex((d) => d.id === id);
    if (index === -1) return null;
    const debt = this.db.debts[index];
    debt.paid = Math.min(debt.amount, (debt.paid || 0) + paymentAmount);
    this.logAudit('debt.payment_recorded', 'Debt', id, { paymentAmount, newTotalPaid: debt.paid });
    this.persist();
    return debt;
  }

  public deleteDebt(id: string): boolean {
    this.db.debts = this.db.debts.filter((d) => d.id !== id);
    this.logAudit('debt.deleted', 'Debt', id);
    this.persist();
    return true;
  }

  // Fund Transfers (Real Money Paystack Audit Trail)
  public getTransfers(goalId?: string, profileId?: string): FundTransfer[] {
    let list = this.db.transfers;
    if (goalId) list = list.filter((t) => t.goalId === goalId);
    if (profileId) list = list.filter((t) => t.profileId === profileId);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getTransferByReference(reference: string): FundTransfer | undefined {
    return this.db.transfers.find((t) => t.paystackReference === reference);
  }

  public createTransfer(transfer: Omit<FundTransfer, 'id' | 'createdAt'>): FundTransfer {
    const newTx: FundTransfer = {
      ...transfer,
      id: `txf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.db.transfers.unshift(newTx);
    this.logAudit('fund_transfer.initiated', 'FundTransfer', newTx.id, {
      reference: newTx.paystackReference,
      amount: newTx.amount,
      currency: newTx.currency,
      status: newTx.status,
    });
    this.persist();
    return newTx;
  }

  public updateTransferStatus(
    reference: string,
    status: 'success' | 'failed' | 'pending',
    payload?: any,
    gatewayResponse?: string
  ): FundTransfer | null {
    const index = this.db.transfers.findIndex((t) => t.paystackReference === reference);
    if (index === -1) return null;
    const transfer = this.db.transfers[index];
    const previousStatus = transfer.status;
    transfer.status = status;
    if (payload) transfer.rawWebhookPayload = payload;
    if (gatewayResponse) transfer.gatewayResponse = gatewayResponse;

    // If successfully settled and wasn't previously credited, increase goal balance
    if (status === 'success' && previousStatus !== 'success') {
      const goalIndex = this.db.goals.findIndex((g) => g.id === transfer.goalId);
      if (goalIndex >= 0) {
        this.db.goals[goalIndex].current += transfer.amount;
        this.logAudit('goal.funded_confirmed', 'Goal', transfer.goalId, {
          creditedAmount: transfer.amount,
          newCurrent: this.db.goals[goalIndex].current,
          reference,
        });

        // Also record an automated expense/transfer transaction for the profile ledger
        this.createTransaction({
          profileId: transfer.profileId,
          type: 'expense',
          amount: transfer.amount,
          currency: transfer.currency,
          category: 'Savings & Investments',
          date: new Date().toISOString().split('T')[0],
          note: `Paystack transfer to goal: ${this.db.goals[goalIndex].name} (Ref: ${reference})`,
          recurring: 'none',
        });
      }
    }

    this.logAudit('fund_transfer.status_updated', 'FundTransfer', transfer.id, {
      reference,
      previousStatus,
      newStatus: status,
    });
    this.persist();
    return transfer;
  }

  // Bulk Import / Export & Reset
  public replaceAll(newData: Partial<LedgerDatabase>) {
    if (newData.profiles && newData.profiles.length > 0) this.db.profiles = newData.profiles;
    if (newData.transactions) this.db.transactions = newData.transactions;
    if (newData.budgets) this.db.budgets = newData.budgets;
    if (newData.goals) this.db.goals = newData.goals;
    if (newData.debts) this.db.debts = newData.debts;
    if (newData.transfers) this.db.transfers = newData.transfers;
    this.logAudit('system.database.restored_or_imported');
    this.persist();
  }
}

export const dbManager = new LedgerDatabaseManager();
