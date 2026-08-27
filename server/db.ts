import { MongoClient, Db } from 'mongodb';
import {
  Profile,
  Transaction,
  Budget,
  Goal,
  Debt,
  FundTransfer,
  AuditLog,
  LedgerDatabase,
} from './types.js';

let client: MongoClient | null = null;
let dbInstance: Db | null = null;

const initialProfiles: Profile[] = [
  {
    id: 'prof_personal',
    name: 'Personal',
    color: '#1A1A1A',
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

export class LedgerMongoDbManager {
  private async getDb(): Promise<Db> {
    if (dbInstance) return dbInstance;

    const uri = process.env.MONGODB_URI;
    if (!uri || uri.trim() === '') {
      throw new Error(
        'MONGODB_URI environment variable is required to connect to MongoDB Atlas. Refusing to use insecure local file storage.'
      );
    }

    try {
      client = new MongoClient(uri, {
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 10000,
      });
      await client.connect();
      dbInstance = client.db();
      console.log(' Successfully connected to MongoDB Atlas database cluster');

      await this.initDatabase(dbInstance);
      return dbInstance;
    } catch (err: any) {
      console.error(' MongoDB Atlas connection error:', err?.message || err);
      throw err;
    }
  }

  private async initDatabase(db: Db): Promise<void> {
    try {
      // Create indexes
      await Promise.all([
        db.collection('profiles').createIndex({ id: 1 }, { unique: true }),
        db.collection('transactions').createIndex({ id: 1 }, { unique: true }),
        db.collection('transactions').createIndex({ profileId: 1, date: -1 }),
        db.collection('budgets').createIndex({ id: 1 }, { unique: true }),
        db.collection('budgets').createIndex({ profileId: 1, category: 1 }),
        db.collection('goals').createIndex({ id: 1 }, { unique: true }),
        db.collection('goals').createIndex({ profileId: 1 }),
        db.collection('debts').createIndex({ id: 1 }, { unique: true }),
        db.collection('debts').createIndex({ profileId: 1 }),
        db.collection('transfers').createIndex({ paystackReference: 1 }, { unique: true }),
        db.collection('transfers').createIndex({ goalId: 1 }),
        db.collection('audit_logs').createIndex({ createdAt: -1 }),
      ]);

      // Seed initial data if profiles collection is completely empty
      const profileCount = await db.collection('profiles').countDocuments();
      if (profileCount === 0) {
        console.log(' Initializing MongoDB Atlas with starter financial records and categories...');
        await db.collection('profiles').insertMany(initialProfiles as any);
        await db.collection('transactions').insertMany(initialTransactions as any);
        await db.collection('budgets').insertMany(initialBudgets as any);
        await db.collection('goals').insertMany(initialGoals as any);
        await db.collection('debts').insertMany(initialDebts as any);
        await db.collection('transfers').insertMany(initialTransfers as any);
        await db.collection('audit_logs').insertOne({
          id: 'audit_init',
          action: 'system.mongodb.atlas_initialized',
          meta: { status: 'mongodb_atlas_ready' },
          createdAt: new Date().toISOString(),
        } as any);

        if (process.env.APP_PIN_HASH) {
          await db.collection('app_config').updateOne(
            { _id: 'pin_config' as any },
            { $set: { pinHash: process.env.APP_PIN_HASH, updatedAt: new Date().toISOString() } },
            { upsert: true }
          );
        }
      }
    } catch (err) {
      console.warn('Index creation or seeding notice:', err);
    }
  }

  // Audit Logger
  public async logAudit(action: string, entity?: string, entityId?: string, meta?: Record<string, any>): Promise<void> {
    try {
      const db = await this.getDb();
      const log: AuditLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        action,
        entity,
        entityId,
        meta,
        createdAt: new Date().toISOString(),
      };
      await db.collection('audit_logs').insertOne(log as any);
    } catch (err) {
      console.error('Failed to write audit log to MongoDB:', err);
    }
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    const db = await this.getDb();
    return db
      .collection<AuditLog>('audit_logs')
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(300)
      .toArray();
  }

  // Authentication & PIN
  public async getPinHash(): Promise<string> {
    const db = await this.getDb();
    const config = await db.collection('app_config').findOne({ _id: 'pin_config' as any });
    if (config?.pinHash) {
      return config.pinHash;
    }
    const envHash = process.env.APP_PIN_HASH;
    if (!envHash || envHash.trim() === '') {
      throw new Error('APP_PIN_HASH is not configured. Server refuses insecure default PIN.');
    }
    return envHash;
  }

  public async setPinHash(hash: string): Promise<void> {
    const db = await this.getDb();
    await db.collection('app_config').updateOne(
      { _id: 'pin_config' as any },
      { $set: { pinHash: hash, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    await this.logAudit('auth.pin.updated');
  }

  // Profiles
  public async getProfiles(): Promise<Profile[]> {
    const db = await this.getDb();
    return db.collection<Profile>('profiles').find({}, { projection: { _id: 0 } }).toArray();
  }

  public async getProfile(id: string): Promise<Profile | null> {
    const db = await this.getDb();
    return db.collection<Profile>('profiles').findOne({ id }, { projection: { _id: 0 } });
  }

  public async createProfile(name: string, color: string, displayCurrency = 'GHS'): Promise<Profile> {
    const db = await this.getDb();
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
    await db.collection('profiles').insertOne(newProf as any);
    await this.logAudit('profile.created', 'Profile', newProf.id, { name });
    return newProf;
  }

  public async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | null> {
    const db = await this.getDb();
    const { _id, ...safeUpdates } = updates as any;
    await db.collection('profiles').updateOne({ id }, { $set: safeUpdates });
    await this.logAudit('profile.updated', 'Profile', id, safeUpdates);
    return this.getProfile(id);
  }

  public async deleteProfile(id: string): Promise<boolean> {
    const db = await this.getDb();
    const count = await db.collection('profiles').countDocuments();
    if (count <= 1) {
      throw new Error('Cannot delete the last remaining profile');
    }
    await Promise.all([
      db.collection('profiles').deleteOne({ id }),
      db.collection('transactions').deleteMany({ profileId: id }),
      db.collection('budgets').deleteMany({ profileId: id }),
      db.collection('goals').deleteMany({ profileId: id }),
      db.collection('debts').deleteMany({ profileId: id }),
      db.collection('transfers').deleteMany({ profileId: id }),
    ]);
    await this.logAudit('profile.deleted', 'Profile', id);
    return true;
  }

  // Transactions
  public async getTransactions(profileId: string): Promise<Transaction[]> {
    const db = await this.getDb();
    return db
      .collection<Transaction>('transactions')
      .find({ profileId }, { projection: { _id: 0 } })
      .sort({ date: -1, createdAt: -1 })
      .toArray();
  }

  public async createTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const db = await this.getDb();
    const newTx: Transaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    await db.collection('transactions').insertOne(newTx as any);
    await this.logAudit('transaction.created', 'Transaction', newTx.id, {
      amount: newTx.amount,
      type: newTx.type,
      category: newTx.category,
    });
    return newTx;
  }

  public async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    const db = await this.getDb();
    const { _id, ...safeUpdates } = updates as any;
    await db.collection('transactions').updateOne({ id }, { $set: safeUpdates });
    await this.logAudit('transaction.updated', 'Transaction', id, safeUpdates);
    return db.collection<Transaction>('transactions').findOne({ id }, { projection: { _id: 0 } });
  }

  public async deleteTransaction(id: string): Promise<boolean> {
    const db = await this.getDb();
    const result = await db.collection('transactions').deleteOne({ id });
    if (result.deletedCount > 0) {
      await this.logAudit('transaction.deleted', 'Transaction', id);
      return true;
    }
    return false;
  }

  // Budgets
  public async getBudgets(profileId: string): Promise<Budget[]> {
    const db = await this.getDb();
    return db.collection<Budget>('budgets').find({ profileId }, { projection: { _id: 0 } }).toArray();
  }

  public async upsertBudget(budget: Omit<Budget, 'id'>): Promise<Budget> {
    const db = await this.getDb();
    const existing = await db.collection<Budget>('budgets').findOne({
      profileId: budget.profileId,
      category: { $regex: new RegExp(`^${budget.category}$`, 'i') },
    });

    if (existing) {
      await db.collection('budgets').updateOne(
        { id: existing.id },
        { $set: { limit: budget.limit, currency: budget.currency } }
      );
      await this.logAudit('budget.updated', 'Budget', existing.id, budget);
      return { ...existing, limit: budget.limit, currency: budget.currency };
    } else {
      const newBudget: Budget = {
        ...budget,
        id: `bgt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      await db.collection('budgets').insertOne(newBudget as any);
      await this.logAudit('budget.created', 'Budget', newBudget.id, budget);
      return newBudget;
    }
  }

  public async deleteBudget(id: string): Promise<boolean> {
    const db = await this.getDb();
    const result = await db.collection('budgets').deleteOne({ id });
    if (result.deletedCount > 0) {
      await this.logAudit('budget.deleted', 'Budget', id);
      return true;
    }
    return false;
  }

  // Goals
  public async getGoals(profileId: string): Promise<Goal[]> {
    const db = await this.getDb();
    return db.collection<Goal>('goals').find({ profileId }, { projection: { _id: 0 } }).toArray();
  }

  public async getGoal(id: string): Promise<Goal | null> {
    const db = await this.getDb();
    return db.collection<Goal>('goals').findOne({ id }, { projection: { _id: 0 } });
  }

  public async createGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'current'> & { current?: number }): Promise<Goal> {
    const db = await this.getDb();
    const newGoal: Goal = {
      ...goal,
      current: goal.current || 0,
      id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    await db.collection('goals').insertOne(newGoal as any);
    await this.logAudit('goal.created', 'Goal', newGoal.id, { name: newGoal.name, target: newGoal.target });
    return newGoal;
  }

  public async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | null> {
    const db = await this.getDb();
    const existing = await this.getGoal(id);
    if (!existing) return null;

    const safeUpdates = { ...updates } as any;
    delete safeUpdates._id;

    // Protection rule: When paystack_recipient is enabled, do not allow arbitrary direct PATCH to current balance
    if (existing.paystackDestination?.type === 'paystack_recipient' && safeUpdates.current !== undefined) {
      delete safeUpdates.current;
    }

    await db.collection('goals').updateOne({ id }, { $set: safeUpdates });
    await this.logAudit('goal.updated', 'Goal', id, safeUpdates);
    return this.getGoal(id);
  }

  public async deleteGoal(id: string): Promise<boolean> {
    const db = await this.getDb();
    const result = await db.collection('goals').deleteOne({ id });
    if (result.deletedCount > 0) {
      await db.collection('transfers').deleteMany({ goalId: id });
      await this.logAudit('goal.deleted', 'Goal', id);
      return true;
    }
    return false;
  }

  // Debts
  public async getDebts(profileId: string): Promise<Debt[]> {
    const db = await this.getDb();
    return db.collection<Debt>('debts').find({ profileId }, { projection: { _id: 0 } }).toArray();
  }

  public async getDebt(id: string): Promise<Debt | null> {
    const db = await this.getDb();
    return db.collection<Debt>('debts').findOne({ id }, { projection: { _id: 0 } });
  }

  public async createDebt(debt: Omit<Debt, 'id' | 'createdAt' | 'paid'> & { paid?: number }): Promise<Debt> {
    const db = await this.getDb();
    const newDebt: Debt = {
      ...debt,
      paid: debt.paid || 0,
      id: `debt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    await db.collection('debts').insertOne(newDebt as any);
    await this.logAudit('debt.created', 'Debt', newDebt.id, { person: newDebt.person, amount: newDebt.amount });
    return newDebt;
  }

  public async updateDebt(id: string, updates: Partial<Debt>): Promise<Debt | null> {
    const db = await this.getDb();
    const { _id, ...safeUpdates } = updates as any;
    await db.collection('debts').updateOne({ id }, { $set: safeUpdates });
    await this.logAudit('debt.updated', 'Debt', id, safeUpdates);
    return this.getDebt(id);
  }

  public async recordDebtPayment(id: string, paymentAmount: number): Promise<Debt | null> {
    const db = await this.getDb();
    const debt = await this.getDebt(id);
    if (!debt) return null;

    const newPaid = Math.min(debt.amount, (debt.paid || 0) + paymentAmount);
    await db.collection('debts').updateOne({ id }, { $set: { paid: newPaid } });
    await this.logAudit('debt.payment_recorded', 'Debt', id, { paymentAmount, newTotalPaid: newPaid });
    return this.getDebt(id);
  }

  public async deleteDebt(id: string): Promise<boolean> {
    const db = await this.getDb();
    const result = await db.collection('debts').deleteOne({ id });
    if (result.deletedCount > 0) {
      await this.logAudit('debt.deleted', 'Debt', id);
      return true;
    }
    return false;
  }

  // Fund Transfers (Real Money Paystack Audit Trail)
  public async getTransfers(goalId?: string, profileId?: string): Promise<FundTransfer[]> {
    const db = await this.getDb();
    const filter: Record<string, any> = {};
    if (goalId) filter.goalId = goalId;
    if (profileId) filter.profileId = profileId;

    return db
      .collection<FundTransfer>('transfers')
      .find(filter, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
  }

  public async getTransferByReference(reference: string): Promise<FundTransfer | null> {
    const db = await this.getDb();
    return db.collection<FundTransfer>('transfers').findOne({ paystackReference: reference }, { projection: { _id: 0 } });
  }

  public async createTransfer(transfer: Omit<FundTransfer, 'id' | 'createdAt'>): Promise<FundTransfer> {
    const db = await this.getDb();
    const newTx: FundTransfer = {
      ...transfer,
      id: `txf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    await db.collection('transfers').insertOne(newTx as any);
    await this.logAudit('fund_transfer.initiated', 'FundTransfer', newTx.id, {
      reference: newTx.paystackReference,
      amount: newTx.amount,
      currency: newTx.currency,
      status: newTx.status,
    });
    return newTx;
  }

  public async updateTransferStatus(
    reference: string,
    status: 'success' | 'failed' | 'pending',
    payload?: any,
    gatewayResponse?: string
  ): Promise<FundTransfer | null> {
    const db = await this.getDb();
    const transfer = await this.getTransferByReference(reference);
    if (!transfer) return null;

    const previousStatus = transfer.status;
    const updates: Record<string, any> = { status };
    if (payload) updates.rawWebhookPayload = payload;
    if (gatewayResponse) updates.gatewayResponse = gatewayResponse;

    await db.collection('transfers').updateOne({ paystackReference: reference }, { $set: updates });

    // When status becomes 'success' and wasn't previously 'success', credit goal balance and record transaction
    if (status === 'success' && previousStatus !== 'success') {
      const goal = await this.getGoal(transfer.goalId);
      if (goal) {
        const newCurrent = (goal.current || 0) + transfer.amount;
        await db.collection('goals').updateOne({ id: transfer.goalId }, { $set: { current: newCurrent } });
        await this.logAudit('goal.funded_confirmed', 'Goal', transfer.goalId, {
          creditedAmount: transfer.amount,
          newCurrent,
          reference,
        });

        // Record expense transaction in profile ledger
        await this.createTransaction({
          profileId: transfer.profileId,
          type: 'expense',
          amount: transfer.amount,
          currency: transfer.currency,
          category: 'Savings & Investments',
          date: new Date().toISOString().split('T')[0],
          note: `Paystack transfer to goal: ${goal.name} (Ref: ${reference})`,
          recurring: 'none',
        });
      }
    }

    await this.logAudit('fund_transfer.status_updated', 'FundTransfer', transfer.id, {
      reference,
      previousStatus,
      newStatus: status,
    });

    return this.getTransferByReference(reference);
  }

  // Backup & Restore
  public async exportAll(): Promise<Partial<LedgerDatabase>> {
    const db = await this.getDb();
    const [profiles, transactions, budgets, goals, debts, transfers] = await Promise.all([
      db.collection<Profile>('profiles').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection<Transaction>('transactions').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection<Budget>('budgets').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection<Goal>('goals').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection<Debt>('debts').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection<FundTransfer>('transfers').find({}, { projection: { _id: 0 } }).toArray(),
    ]);

    return {
      profiles,
      transactions,
      budgets,
      goals,
      debts,
      transfers,
    };
  }

  public async replaceAll(newData: Partial<LedgerDatabase>): Promise<void> {
    const db = await this.getDb();
    if (newData.profiles && newData.profiles.length > 0) {
      await db.collection('profiles').deleteMany({});
      await db.collection('profiles').insertMany(newData.profiles as any);
    }
    if (newData.transactions) {
      await db.collection('transactions').deleteMany({});
      if (newData.transactions.length > 0) await db.collection('transactions').insertMany(newData.transactions as any);
    }
    if (newData.budgets) {
      await db.collection('budgets').deleteMany({});
      if (newData.budgets.length > 0) await db.collection('budgets').insertMany(newData.budgets as any);
    }
    if (newData.goals) {
      await db.collection('goals').deleteMany({});
      if (newData.goals.length > 0) await db.collection('goals').insertMany(newData.goals as any);
    }
    if (newData.debts) {
      await db.collection('debts').deleteMany({});
      if (newData.debts.length > 0) await db.collection('debts').insertMany(newData.debts as any);
    }
    if (newData.transfers) {
      await db.collection('transfers').deleteMany({});
      if (newData.transfers.length > 0) await db.collection('transfers').insertMany(newData.transfers as any);
    }
    await this.logAudit('system.database.restored_or_imported');
  }
}

export const dbManager = new LedgerMongoDbManager();
