import { MongoClient, Db } from 'mongodb';
import bcrypt from 'bcryptjs';
import {
  User,
  Profile,
  Transaction,
  Budget,
  Goal,
  Debt,
  FundTransfer,
  AuditLog,
  WithdrawalRequest,
  LedgerDatabase,
} from './types.js';

let client: MongoClient | null = null;
let dbInstance: Db | null = null;

export class LedgerMongoDbManager {
  // In-memory fallback stores (initialized completely empty so no sample data ever appears)
  private memUsers: User[] = [];
  private memProfiles: Profile[] = [
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
      createdAt: new Date().toISOString(),
    },
  ];
  private memTransactions: Transaction[] = [];
  private memBudgets: Budget[] = [];
  private memGoals: Goal[] = [];
  private memDebts: Debt[] = [];
  private memTransfers: FundTransfer[] = [];
  private memWithdrawals: WithdrawalRequest[] = [];
  private memAIMessages: { userId: string; timestamp: number }[] = [];
  private memAuditLogs: AuditLog[] = [];
  private memPinHash: string = '';

  public async getDb(): Promise<Db | null> {
    if (dbInstance) return dbInstance;

    const uri = process.env.MONGODB_URI;
    if (!uri || uri.trim() === '') {
      return null;
    }

    try {
      if (!client) {
        client = new MongoClient(uri, {
          maxPoolSize: 20,
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 6000,
        });
        await client.connect();
      }
      dbInstance = client.db();
      console.log(`[DATABASE] Connected to MongoDB Atlas: ${dbInstance.databaseName}`);

      await this.initDatabase(dbInstance);
      return dbInstance;
    } catch (err: any) {
      console.warn('[DATABASE] MongoDB connection notice:', err?.message || err);
      client = null;
      dbInstance = null;
      return null;
    }
  }

  private async initDatabase(db: Db): Promise<void> {
    try {
      await Promise.all([
        db.collection('users').createIndex({ id: 1 }, { unique: true }),
        db.collection('users').createIndex({ username: 1 }, { unique: true }),
        db.collection('users').createIndex({ email: 1 }, { unique: true }),
        db.collection('profiles').createIndex({ id: 1 }, { unique: true }),
        db.collection('profiles').createIndex({ userId: 1 }),
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

      // Remove any historical sample documents if present
      const sampleTxIds = ['tx_1', 'tx_2', 'tx_3', 'tx_4', 'tx_5'];
      const sampleBgtIds = ['bgt_1', 'bgt_2', 'bgt_3', 'bgt_4'];
      const sampleGoalIds = ['goal_1', 'goal_2'];
      const sampleDebtIds = ['debt_1', 'debt_2'];

      await Promise.all([
        db.collection('transactions').deleteMany({ id: { $in: sampleTxIds } }),
        db.collection('budgets').deleteMany({ id: { $in: sampleBgtIds } }),
        db.collection('goals').deleteMany({ id: { $in: sampleGoalIds } }),
        db.collection('debts').deleteMany({ id: { $in: sampleDebtIds } }),
        db.collection('transfers').deleteMany({
          $or: [
            { id: { $in: ['txf_1'] } },
            { paystackReference: 'LEDGER_TXF_INIT_001' },
            { goalId: { $in: sampleGoalIds } },
          ],
        }),
        db.collection('audit_logs').deleteMany({ id: 'audit_init' }),
      ]);

      const profileCount = await db.collection('profiles').countDocuments();
      if (profileCount === 0) {
        console.log('[DATABASE] Initializing default fresh profile in MongoDB...');
        const defaultProfile: Profile = {
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
          createdAt: new Date().toISOString(),
        };
        await db.collection('profiles').insertOne(defaultProfile as any);
      }
    } catch (err) {
      console.warn('[DATABASE] Collection index configuration note:', err);
    }
  }

  // Database status and diagnostic summary
  public async getDbStatus(): Promise<{
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
  }> {
    try {
      const db = await this.getDb();
      if (db) {
        const [profiles, transactions, budgets, goals, debts, transfers] = await Promise.all([
          db.collection('profiles').countDocuments(),
          db.collection('transactions').countDocuments(),
          db.collection('budgets').countDocuments(),
          db.collection('goals').countDocuments(),
          db.collection('debts').countDocuments(),
          db.collection('transfers').countDocuments(),
        ]);
        return {
          connected: true,
          databaseName: db.databaseName,
          counts: { profiles, transactions, budgets, goals, debts, transfers },
        };
      }
    } catch {}

    return {
      connected: false,
      databaseName: 'In-Memory Store',
      counts: {
        profiles: this.memProfiles.length,
        transactions: this.memTransactions.length,
        budgets: this.memBudgets.length,
        goals: this.memGoals.length,
        debts: this.memDebts.length,
        transfers: this.memTransfers.length,
      },
    };
  }

  // Clean remaining sample data
  public async cleanSampleData(): Promise<{
    deletedTransactions: number;
    deletedBudgets: number;
    deletedGoals: number;
    deletedDebts: number;
  }> {
    const sampleTxIds = ['tx_1', 'tx_2', 'tx_3', 'tx_4', 'tx_5'];
    const sampleBgtIds = ['bgt_1', 'bgt_2', 'bgt_3', 'bgt_4'];
    const sampleGoalIds = ['goal_1', 'goal_2'];
    const sampleDebtIds = ['debt_1', 'debt_2'];

    this.memTransactions = this.memTransactions.filter((t) => !sampleTxIds.includes(t.id));
    this.memBudgets = this.memBudgets.filter((b) => !sampleBgtIds.includes(b.id));
    this.memGoals = this.memGoals.filter((g) => !sampleGoalIds.includes(g.id));
    this.memDebts = this.memDebts.filter((d) => !sampleDebtIds.includes(d.id));
    this.memTransfers = this.memTransfers.filter(
      (tf) => tf.id !== 'txf_1' && tf.paystackReference !== 'LEDGER_TXF_INIT_001' && !sampleGoalIds.includes(tf.goalId)
    );

    let deletedTransactions = 0;
    let deletedBudgets = 0;
    let deletedGoals = 0;
    let deletedDebts = 0;

    try {
      const db = await this.getDb();
      if (db) {
        const [tRes, bRes, gRes, dRes] = await Promise.all([
          db.collection('transactions').deleteMany({ id: { $in: sampleTxIds } }),
          db.collection('budgets').deleteMany({ id: { $in: sampleBgtIds } }),
          db.collection('goals').deleteMany({ id: { $in: sampleGoalIds } }),
          db.collection('debts').deleteMany({ id: { $in: sampleDebtIds } }),
          db.collection('transfers').deleteMany({
            $or: [
              { id: { $in: ['txf_1'] } },
              { paystackReference: 'LEDGER_TXF_INIT_001' },
              { goalId: { $in: sampleGoalIds } },
            ],
          }),
        ]);
        deletedTransactions = tRes.deletedCount;
        deletedBudgets = bRes.deletedCount;
        deletedGoals = gRes.deletedCount;
        deletedDebts = dRes.deletedCount;
      }
    } catch (err) {
      console.error('Error cleaning sample records:', err);
    }

    await this.logAudit('database.clean_sample_data', undefined, undefined, {
      deletedTransactions,
      deletedBudgets,
      deletedGoals,
      deletedDebts,
    });

    return { deletedTransactions, deletedBudgets, deletedGoals, deletedDebts };
  }

  // Wipe all data to start 100% completely fresh
  public async wipeAllData(keepProfiles = true): Promise<void> {
    this.memTransactions = [];
    this.memBudgets = [];
    this.memGoals = [];
    this.memDebts = [];
    this.memTransfers = [];

    try {
      const db = await this.getDb();
      if (db) {
        await Promise.all([
          db.collection('transactions').deleteMany({}),
          db.collection('budgets').deleteMany({}),
          db.collection('goals').deleteMany({}),
          db.collection('debts').deleteMany({}),
          db.collection('transfers').deleteMany({}),
        ]);

        if (!keepProfiles) {
          await db.collection('profiles').deleteMany({});
          const defaultProf: Profile = {
            id: 'prof_personal',
            name: 'Personal',
            color: '#1A1A1A',
            displayCurrency: 'GHS',
            exchangeRates: { GHS: 1, USD: 15.5, EUR: 17.0, GBP: 19.5, NGN: 0.0098 },
            createdAt: new Date().toISOString(),
          };
          await db.collection('profiles').insertOne(defaultProf as any);
        }
      }
    } catch (err) {
      console.error('Error wiping database:', err);
    }

    await this.logAudit('database.wiped_fresh');
  }

  // Audit Logger
  public async logAudit(action: string, entity?: string, entityId?: string, meta?: Record<string, any>): Promise<void> {
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      action,
      entity,
      entityId,
      meta,
      createdAt: new Date().toISOString(),
    };
    this.memAuditLogs.unshift(log);
    if (this.memAuditLogs.length > 500) this.memAuditLogs.pop();

    try {
      const db = await this.getDb();
      if (db) {
        await db.collection('audit_logs').insertOne(log as any);
      }
    } catch {
      // Non-blocking
    }
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const db = await this.getDb();
      if (db) {
        return await db
          .collection<AuditLog>('audit_logs')
          .find({}, { projection: { _id: 0 } })
          .sort({ createdAt: -1 })
          .limit(300)
          .toArray();
      }
    } catch {}
    return this.memAuditLogs;
  }

  // Authentication & PIN
  public async getPinHash(): Promise<string> {
    try {
      const db = await this.getDb();
      if (db) {
        const config = await db.collection('app_config').findOne({ _id: 'pin_config' as any });
        if (config?.pinHash) return config.pinHash;
      }
    } catch {}
    return this.memPinHash || process.env.APP_PIN_HASH || '';
  }

  public async setPinHash(hash: string): Promise<void> {
    this.memPinHash = hash;
    try {
      const db = await this.getDb();
      if (db) {
        await db.collection('app_config').updateOne(
          { _id: 'pin_config' as any },
          { $set: { pinHash: hash, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      }
    } catch {}
    await this.logAudit('auth.pin.updated');
  }

  // ==========================================
  // MULTI-USER MANAGEMENT & AUTHENTICATION
  // ==========================================
  private normalizeUser(user: User | null): User | null {
    if (!user) return null;
    const isOwner = user.email.toLowerCase() === 'jnkpappoe@gmail.com' || user.role === 'admin';
    return {
      ...user,
      role: isOwner ? 'admin' : 'user',
    };
  }

  public async findUserById(id: string): Promise<User | null> {
    try {
      const db = await this.getDb();
      if (db) {
        const user = await db.collection<User>('users').findOne({ id }, { projection: { _id: 0 } });
        if (user) return this.normalizeUser(user);
      }
    } catch (err) {
      console.error('[DATABASE] findUserById error:', err);
    }
    const mem = this.memUsers.find((u) => u.id === id) || null;
    return this.normalizeUser(mem);
  }

  public async findUserByUsername(username: string): Promise<User | null> {
    const cleanUsername = username.trim().toLowerCase();
    try {
      const db = await this.getDb();
      if (db) {
        const user = await db
          .collection<User>('users')
          .findOne({ username: { $regex: `^${cleanUsername}$`, $options: 'i' } }, { projection: { _id: 0 } });
        if (user) return this.normalizeUser(user);
      }
    } catch (err) {
      console.error('[DATABASE] findUserByUsername error:', err);
    }
    const mem = this.memUsers.find((u) => u.username.toLowerCase() === cleanUsername) || null;
    return this.normalizeUser(mem);
  }

  public async findUserByEmail(email: string): Promise<User | null> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const db = await this.getDb();
      if (db) {
        const user = await db
          .collection<User>('users')
          .findOne({ email: { $regex: `^${cleanEmail}$`, $options: 'i' } }, { projection: { _id: 0 } });
        if (user) return this.normalizeUser(user);
      }
    } catch (err) {
      console.error('[DATABASE] findUserByEmail error:', err);
    }
    const mem = this.memUsers.find((u) => u.email.toLowerCase() === cleanEmail) || null;
    return this.normalizeUser(mem);
  }

  public async findUserByUsernameOrEmail(identifier: string): Promise<User | null> {
    const clean = identifier.trim().toLowerCase();
    const byEmail = await this.findUserByEmail(clean);
    if (byEmail) return byEmail;
    return await this.findUserByUsername(clean);
  }

  public async createUser(
    username: string,
    email: string,
    passwordHash: string,
    agreedToTermsAt: string
  ): Promise<User> {
    const count = await this.getUsersCount();
    const isFirstUserOrAdminEmail = email.trim().toLowerCase() === 'jnkpappoe@gmail.com' || count === 0;

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: isFirstUserOrAdminEmail ? 'admin' : 'user',
      agreedToTermsAt,
      createdAt: new Date().toISOString(),
    };

    this.memUsers.push(newUser);

    try {
      const db = await this.getDb();
      if (db) {
        await db.collection('users').insertOne(newUser as any);
      }
    } catch (err) {
      console.error('[DATABASE] createUser MongoDB error:', err);
    }

    // Automatically create a default initial "Personal" profile for this user
    await this.createProfile('Personal', '#1A1A1A', 'GHS', 'personal', false, undefined, newUser.id);
    await this.logAudit('user.registered', 'user', newUser.id, { username: newUser.username, email: newUser.email, role: newUser.role });

    return newUser;
  }

  public async updateUsername(userId: string, newUsername: string): Promise<User | null> {
    const cleanUsername = newUsername.trim().toLowerCase();
    const existing = await this.findUserByUsername(cleanUsername);
    if (existing && existing.id !== userId) {
      throw new Error('This username is already taken by another user');
    }

    const idx = this.memUsers.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      this.memUsers[idx].username = cleanUsername;
    }

    try {
      const db = await this.getDb();
      if (db) {
        await db.collection('users').updateOne(
          { id: userId },
          { $set: { username: cleanUsername } }
        );
      }
    } catch (err) {
      console.error('[DATABASE] updateUsername MongoDB error:', err);
    }

    return await this.findUserById(userId);
  }

  public async updateUserPassword(userId: string, newPasswordHash: string): Promise<boolean> {
    const idx = this.memUsers.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      this.memUsers[idx].passwordHash = newPasswordHash;
    }

    try {
      const db = await this.getDb();
      if (db) {
        await db.collection('users').updateOne(
          { id: userId },
          { $set: { passwordHash: newPasswordHash, updatedAt: new Date().toISOString() } }
        );
      }
    } catch (err) {
      console.error('[DATABASE] updateUserPassword MongoDB error:', err);
      return false;
    }

    return true;
  }

  public async setUserResetCode(email: string, code: string, expiresAt: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await this.findUserByEmail(cleanEmail);
    if (!user) return false;

    const idx = this.memUsers.findIndex((u) => u.email.toLowerCase() === cleanEmail);
    if (idx !== -1) {
      this.memUsers[idx].resetCode = code;
      this.memUsers[idx].resetCodeExpiresAt = expiresAt;
    }

    try {
      const db = await this.getDb();
      if (db) {
        await db.collection('users').updateOne(
          { email: cleanEmail },
          { $set: { resetCode: code, resetCodeExpiresAt: expiresAt } }
        );
      }
    } catch (err) {
      console.error('[DATABASE] setUserResetCode MongoDB error:', err);
    }
    return true;
  }

  public async resetUserPassword(
    identifier: string,
    code: string,
    newPasswordHash: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const cleanIdentifier = (identifier || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();

    if (!cleanCode || cleanCode.length < 6) {
      return { success: false, error: 'Please enter a valid 6-digit verification code.' };
    }

    let user: User | null = null;

    // 1. If not masked with '*', try finding by exact email or username
    if (cleanIdentifier && !cleanIdentifier.includes('*')) {
      user = await this.findUserByUsernameOrEmail(cleanIdentifier);
    }

    // 2. If not found or if identifier was masked (e.g. j***e@gmail.com), find by active reset code
    if (!user) {
      const now = Date.now();
      // Search in memory for an active unexpired reset code
      const memMatch = this.memUsers.find(
        (u) =>
          u.resetCode === cleanCode &&
          (!u.resetCodeExpiresAt || new Date(u.resetCodeExpiresAt).getTime() >= now)
      );
      if (memMatch) {
        user = this.normalizeUser(memMatch);
      }

      // If still not found and DB exists, search MongoDB
      if (!user) {
        try {
          const db = await this.getDb();
          if (db) {
            const dbMatch = await db.collection<User>('users').findOne({
              resetCode: cleanCode,
              $or: [
                { resetCodeExpiresAt: { $exists: false } },
                { resetCodeExpiresAt: { $gte: new Date().toISOString() } },
              ],
            });
            if (dbMatch) {
              user = this.normalizeUser(dbMatch);
            }
          }
        } catch (err) {
          console.error('[DATABASE] resetUserPassword code search error:', err);
        }
      }
    }

    if (!user) {
      return { success: false, error: 'Invalid or expired verification code. Please request a new one.' };
    }

    if (!user.resetCode || user.resetCode !== cleanCode) {
      return { success: false, error: 'Invalid reset code. Please check your email and try again.' };
    }

    if (user.resetCodeExpiresAt && new Date(user.resetCodeExpiresAt).getTime() < Date.now()) {
      return { success: false, error: 'Reset code has expired. Please request a new one.' };
    }

    const idx = this.memUsers.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      this.memUsers[idx].passwordHash = newPasswordHash;
      delete this.memUsers[idx].resetCode;
      delete this.memUsers[idx].resetCodeExpiresAt;
    }

    try {
      const db = await this.getDb();
      if (db) {
        await db.collection('users').updateOne(
          { id: user.id },
          {
            $set: { passwordHash: newPasswordHash, updatedAt: new Date().toISOString() },
            $unset: { resetCode: '', resetCodeExpiresAt: '' },
          }
        );
      }
    } catch (err) {
      console.error('[DATABASE] resetUserPassword MongoDB error:', err);
    }

    await this.logAudit('user.password_reset', 'user', user.id, { email: user.email, username: user.username });
    const updatedUser = await this.findUserById(user.id);
    return { success: true, user: updatedUser || user };
  }

  public async getUsersCount(): Promise<number> {
    try {
      const db = await this.getDb();
      if (db) {
        return await db.collection('users').countDocuments();
      }
    } catch {}
    return this.memUsers.length;
  }

  // Admin User Management ("God Mode")
  public async getAllUsersWithStats(): Promise<any[]> {
    let allUsers: User[] = [];
    try {
      const db = await this.getDb();
      if (db) {
        const users = await db.collection<User>('users').find({}, { projection: { passwordHash: 0, _id: 0 } }).toArray();
        allUsers = users.map(u => this.normalizeUser(u)!);
      }
    } catch (err) {
      console.error('getAllUsersWithStats DB error:', err);
    }

    if (allUsers.length === 0) {
      allUsers = this.memUsers.map(u => {
        const { passwordHash, ...safe } = u;
        return this.normalizeUser(safe as User)!;
      });
    }

    // Enhance each user with their stats
    const enriched = await Promise.all(
      allUsers.map(async (u) => {
        const userProfiles = await this.getProfiles(u.id);
        const profileIds = userProfiles.map(p => p.id);

        let txCount = 0;
        let totalVaults = 0;
        let goalCount = 0;
        let netBalance = 0;

        try {
          const db = await this.getDb();
          if (db && profileIds.length > 0) {
            txCount = await db.collection('transactions').countDocuments({ profileId: { $in: profileIds } });
            const goals = await db.collection<Goal>('goals').find({ profileId: { $in: profileIds } }).toArray();
            goalCount = goals.length;
            totalVaults = goals.reduce((sum, g) => sum + (g.current || 0), 0);
            const txs = await db.collection('transactions').find({ profileId: { $in: profileIds } }).toArray();
            netBalance = txs.reduce((sum, t: any) => sum + (t.type === 'income' ? (t.amount || 0) : -(t.amount || 0)), 0);
          } else {
            const txs = this.memTransactions.filter(t => profileIds.includes(t.profileId));
            txCount = txs.length;
            netBalance = txs.reduce((sum, t) => sum + (t.type === 'income' ? (t.amount || 0) : -(t.amount || 0)), 0);
            const goals = this.memGoals.filter(g => profileIds.includes(g.profileId));
            goalCount = goals.length;
            totalVaults = goals.reduce((sum, g) => sum + (g.current || 0), 0);
          }
        } catch {}

        return {
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          agreedToTermsAt: u.agreedToTermsAt,
          createdAt: u.createdAt,
          profilesCount: userProfiles.length,
          transactionsCount: txCount,
          goalsCount: goalCount,
          totalVaultsSaved: totalVaults,
          netBalance: netBalance || 0,
        };
      })
    );

    return enriched;
  }

  public async getUserFullDetails(userId: string): Promise<any | null> {
    const user = await this.findUserById(userId);
    if (!user) return null;

    const { passwordHash, ...safeUser } = user;
    const profiles = await this.getProfiles(userId);
    const profileIds = profiles.map(p => p.id);

    let transactions: Transaction[] = [];
    let goals: Goal[] = [];
    let debts: Debt[] = [];
    let budgets: Budget[] = [];

    try {
      const db = await this.getDb();
      if (db && profileIds.length > 0) {
        transactions = await db
          .collection<Transaction>('transactions')
          .find({ profileId: { $in: profileIds } }, { projection: { _id: 0 } })
          .sort({ date: -1, createdAt: -1 })
          .limit(30)
          .toArray();
        goals = await db
          .collection<Goal>('goals')
          .find({ profileId: { $in: profileIds } }, { projection: { _id: 0 } })
          .toArray();
        debts = await db
          .collection<Debt>('debts')
          .find({ profileId: { $in: profileIds } }, { projection: { _id: 0 } })
          .toArray();
        budgets = await db
          .collection<Budget>('budgets')
          .find({ profileId: { $in: profileIds } }, { projection: { _id: 0 } })
          .toArray();
      } else {
        transactions = this.memTransactions
          .filter(t => profileIds.includes(t.profileId))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 30);
        goals = this.memGoals.filter(g => profileIds.includes(g.profileId));
        debts = this.memDebts.filter(d => profileIds.includes(d.profileId));
        budgets = this.memBudgets.filter(b => profileIds.includes(b.profileId));
      }
    } catch (err) {
      console.error('getUserFullDetails error:', err);
    }

    const profilesWithBalances = await Promise.all(
      profiles.map(async (p) => {
        let pTxs: Transaction[] = [];
        try {
          const db = await this.getDb();
          if (db) {
            pTxs = await db.collection<Transaction>('transactions').find({ profileId: p.id }).toArray();
          } else {
            pTxs = this.memTransactions.filter(t => t.profileId === p.id);
          }
        } catch {}
        const totalIncome = pTxs.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
        const totalExpense = pTxs.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
        const netBalance = totalIncome - totalExpense;
        return {
          ...p,
          totalIncome,
          totalExpense,
          netBalance,
          transactionCount: pTxs.length,
        };
      })
    );

    const totalVaults = goals.reduce((sum, g) => sum + (g.current || 0), 0);
    const totalDebts = debts.reduce(
      (sum, d) => sum + Math.max(0, (d.amount || 0) - (d.paid || 0)),
      0
    );
    const totalLedgerBalance = profilesWithBalances.reduce((sum, p) => sum + (p.netBalance || 0), 0);
    const totalInflow = profilesWithBalances.reduce((sum, p) => sum + (p.totalIncome || 0), 0);
    const totalOutflow = profilesWithBalances.reduce((sum, p) => sum + (p.totalExpense || 0), 0);

    return {
      user: safeUser,
      profiles: profilesWithBalances,
      transactions,
      goals,
      debts,
      budgets,
      stats: {
        totalLedgerBalance,
        totalInflow,
        totalOutflow,
        totalVaults,
        totalDebts,
        profilesCount: profiles.length,
        recentTransactionsCount: transactions.length,
      },
    };
  }

  public async updateUserRole(userId: string, role: 'admin' | 'user'): Promise<boolean> {
    const memUser = this.memUsers.find(u => u.id === userId);
    if (memUser) {
      memUser.role = role;
    }
    try {
      const db = await this.getDb();
      if (db) {
        await db.collection('users').updateOne({ id: userId }, { $set: { role } });
        return true;
      }
    } catch (err) {
      console.error('updateUserRole error:', err);
    }
    return Boolean(memUser);
  }

  public async deleteUser(userId: string): Promise<boolean> {
    this.memUsers = this.memUsers.filter(u => u.id !== userId);
    try {
      const db = await this.getDb();
      if (db) {
        await db.collection('users').deleteOne({ id: userId });
        // Clean up profiles
        const userProfs = await db.collection<Profile>('profiles').find({ userId }).toArray();
        const pIds = userProfs.map(p => p.id);
        await db.collection('profiles').deleteMany({ userId });
        if (pIds.length > 0) {
          await db.collection('transactions').deleteMany({ profileId: { $in: pIds } });
          await db.collection('budgets').deleteMany({ profileId: { $in: pIds } });
          await db.collection('goals').deleteMany({ profileId: { $in: pIds } });
          await db.collection('debts').deleteMany({ profileId: { $in: pIds } });
        }
        return true;
      }
    } catch (err) {
      console.error('deleteUser error:', err);
    }
    return true;
  }

  // ==========================================
  // SAVINGS VAULT & WITHDRAWAL REQUESTS
  // ==========================================
  public async createWithdrawalRequest(data: Omit<WithdrawalRequest, 'id' | 'createdAt' | 'status'>): Promise<WithdrawalRequest> {
    const newReq: WithdrawalRequest = {
      ...data,
      id: `wdr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.memWithdrawals.push(newReq);

    try {
      const db = await this.getDb();
      if (db) {
        await db.collection('withdrawals').insertOne(newReq as any);
      }
    } catch (err) {
      console.error('createWithdrawalRequest error:', err);
    }

    await this.logAudit('vault.withdrawal_requested', 'withdrawal', newReq.id, {
      goalId: data.goalId,
      vaultAmount: data.vaultAmount,
      totalFeePercent: data.totalFeePercent,
      feeAmount: data.feeAmount,
      netPayoutAmount: data.netPayoutAmount,
      isEarly: data.isEarlyWithdrawal,
    });

    return newReq;
  }

  public async getWithdrawalRequests(userId?: string): Promise<WithdrawalRequest[]> {
    try {
      const db = await this.getDb();
      if (db) {
        const query = userId ? { userId } : {};
        return await db.collection<WithdrawalRequest>('withdrawals').find(query, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
      }
    } catch (err) {
      console.error('getWithdrawalRequests DB error:', err);
    }

    if (userId) {
      return this.memWithdrawals.filter(w => w.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return this.memWithdrawals.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async getWithdrawalRequestById(id: string): Promise<WithdrawalRequest | null> {
    try {
      const db = await this.getDb();
      if (db) {
        return await db.collection<WithdrawalRequest>('withdrawals').findOne({ id }, { projection: { _id: 0 } });
      }
    } catch {}
    return this.memWithdrawals.find(w => w.id === id) || null;
  }

  public async updateWithdrawalRequest(id: string, updates: Partial<WithdrawalRequest>): Promise<WithdrawalRequest | null> {
    const idx = this.memWithdrawals.findIndex(w => w.id === id);
    if (idx !== -1) {
      this.memWithdrawals[idx] = { ...this.memWithdrawals[idx], ...updates };
    }

    try {
      const db = await this.getDb();
      if (db) {
        const { _id, ...safeUpdates } = updates as any;
        await db.collection('withdrawals').updateOne({ id }, { $set: safeUpdates });
        return await db.collection<WithdrawalRequest>('withdrawals').findOne({ id }, { projection: { _id: 0 } });
      }
    } catch (err) {
      console.error('updateWithdrawalRequest error:', err);
    }

    return this.memWithdrawals.find(w => w.id === id) || null;
  }

  public async getAdminPlatformStats(): Promise<{
    totalUsers: number;
    totalVaultsAmount: number;
    totalSavingsVaultAmount: number;
    totalPendingWithdrawals: number;
    pendingWithdrawalsCount: number;
    totalApprovedWithdrawals: number;
    totalFeesCollected: number;
    totalTransactionsCount: number;
    totalTransactions: number;
    totalLedgerBalance: number;
    totalBudgetsCount: number;
    totalSavingsGoalsCount: number;
  }> {
    const totalUsers = await this.getUsersCount();
    const withdrawals = await this.getWithdrawalRequests();

    const pending = withdrawals.filter(w => w.status === 'pending');
    const approved = withdrawals.filter(w => w.status === 'approved');
    const totalFeesCollected = approved.reduce((sum, w) => sum + (w.feeAmount || 0), 0);

    let totalVaults = 0;
    let txCount = 0;
    let totalLedgerBalance = 0;
    let budgetCount = 0;
    let goalsCount = 0;

    try {
      const db = await this.getDb();
      if (db) {
        const goals = await db.collection<Goal>('goals').find({}).toArray();
        goalsCount = goals.length;
        totalVaults = goals.reduce((sum, g) => sum + (g.current || 0), 0);
        txCount = await db.collection('transactions').countDocuments();
        const allTxs = await db.collection('transactions').find({}).toArray();
        totalLedgerBalance = allTxs.reduce((sum, t: any) => sum + (t.type === 'income' ? (t.amount || 0) : -(t.amount || 0)), 0);
        budgetCount = await db.collection('budgets').countDocuments();
      } else {
        goalsCount = this.memGoals.length;
        totalVaults = this.memGoals.reduce((sum, g) => sum + (g.current || 0), 0);
        txCount = this.memTransactions.length;
        totalLedgerBalance = this.memTransactions.reduce((sum, t) => sum + (t.type === 'income' ? (t.amount || 0) : -(t.amount || 0)), 0);
        budgetCount = this.memBudgets.length;
      }
    } catch {}

    return {
      totalUsers,
      totalVaultsAmount: totalVaults,
      totalSavingsVaultAmount: totalVaults,
      totalPendingWithdrawals: pending.length,
      pendingWithdrawalsCount: pending.length,
      totalApprovedWithdrawals: approved.length,
      totalFeesCollected,
      totalTransactionsCount: txCount,
      totalTransactions: txCount,
      totalLedgerBalance: Math.max(0, totalLedgerBalance),
      totalBudgetsCount: budgetCount,
      totalSavingsGoalsCount: goalsCount,
    };
  }

  // ==========================================
  // AI RATE LIMITING (40 msgs in 8 hrs, 4 hr cooldown)
  // ==========================================
  public checkAndRecordAIMessage(userId: string): { allowed: boolean; quota: any; message?: string } {
    const now = Date.now();
    const windowMs = 8 * 60 * 60 * 1000; // 8 hours
    const cooldownMs = 4 * 60 * 60 * 1000; // 4 hours
    const maxMessages = 40;

    // Prune entries older than 8 hours
    this.memAIMessages = this.memAIMessages.filter(m => now - m.timestamp < windowMs);

    const userMsgs = this.memAIMessages
      .filter(m => m.userId === userId)
      .sort((a, b) => a.timestamp - b.timestamp);

    // If already sent 40 messages in the window
    if (userMsgs.length >= maxMessages) {
      const fortiethTime = userMsgs[maxMessages - 1].timestamp;
      const unlockTime = fortiethTime + cooldownMs;

      if (now < unlockTime) {
        const remainingMs = unlockTime - now;
        const hours = Math.floor(remainingMs / (60 * 60 * 1000));
        const mins = Math.ceil((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
        return {
          allowed: false,
          quota: {
            usedCount: userMsgs.length,
            maxCount: maxMessages,
            remaining: 0,
            windowHours: 8,
            cooldownHours: 4,
            isLocked: true,
            lockedUntil: new Date(unlockTime).toISOString(),
            message: `Profile message limit reached (40 messages in 8 hours). AI assistant is cooling down. Ready in ${hours}h ${mins}m.`,
          },
        };
      } else {
        // 4 hours cooldown has elapsed: reset back to zero as requested!
        this.memAIMessages = this.memAIMessages.filter(m => m.userId !== userId);
        userMsgs.length = 0;
      }
    }

    // Allowed! Record current message
    this.memAIMessages.push({ userId, timestamp: now });
    const currentCount = userMsgs.length + 1;
    const isNowLocked = currentCount >= maxMessages;
    const lockedUntil = isNowLocked ? new Date(now + cooldownMs).toISOString() : null;

    return {
      allowed: true,
      quota: {
        usedCount: currentCount,
        maxCount: maxMessages,
        remaining: Math.max(0, maxMessages - currentCount),
        windowHours: 8,
        cooldownHours: 4,
        isLocked: isNowLocked,
        lockedUntil,
      },
    };
  }

  public getAIMessageQuota(userId: string): any {
    const now = Date.now();
    const windowMs = 8 * 60 * 60 * 1000;
    const cooldownMs = 4 * 60 * 60 * 1000;
    const maxMessages = 40;

    this.memAIMessages = this.memAIMessages.filter(m => now - m.timestamp < windowMs);
    let userMsgs = this.memAIMessages
      .filter(m => m.userId === userId)
      .sort((a, b) => a.timestamp - b.timestamp);

    let isLocked = false;
    let lockedUntil: string | null = null;

    if (userMsgs.length >= maxMessages) {
      const fortiethTime = userMsgs[maxMessages - 1].timestamp;
      const unlockTime = fortiethTime + cooldownMs;
      if (now < unlockTime) {
        isLocked = true;
        lockedUntil = new Date(unlockTime).toISOString();
      } else {
        // Reset back to zero after 4 hours cooldown
        this.memAIMessages = this.memAIMessages.filter(m => m.userId !== userId);
        userMsgs = [];
      }
    }

    return {
      usedCount: userMsgs.length,
      maxCount: maxMessages,
      remaining: isLocked ? 0 : Math.max(0, maxMessages - userMsgs.length),
      windowHours: 8,
      cooldownHours: 4,
      isLocked,
      lockedUntil,
    };
  }

  // Profiles
  private sanitizeProfile(prof: Profile): Profile {
    const { pinHash, ...safe } = prof;
    return {
      ...safe,
      type: safe.type || 'personal',
      isLocked: Boolean(prof.isLocked && pinHash),
    };
  }

  public async getProfiles(userId?: string): Promise<Profile[]> {
    try {
      const db = await this.getDb();
      if (db) {
        const query = userId ? { $or: [{ userId }, { userId: { $exists: false } }] } : {};
        const list = await db.collection<Profile>('profiles').find(query, { projection: { _id: 0 } }).toArray();
        if (list.length > 0) {
          // If filtering by userId, prefer user-scoped profiles
          const userSpecific = userId ? list.filter((p) => p.userId === userId) : list;
          if (userSpecific.length > 0) {
            return userSpecific.map((p) => this.sanitizeProfile(p));
          }
          if (list.length > 0 && !userId) {
            return list.map((p) => this.sanitizeProfile(p));
          }
        }
        
        // Auto-initialize default profile for this user or workspace
        const defaultProfile: Profile = {
          id: `prof_${userId ? `${userId}_` : ''}personal`,
          userId,
          name: 'Personal',
          color: '#1A1A1A',
          displayCurrency: 'GHS',
          type: 'personal',
          isLocked: false,
          exchangeRates: {
            GHS: 1,
            USD: 15.5,
            EUR: 17.0,
            GBP: 19.5,
            NGN: 0.0098,
          },
          createdAt: new Date().toISOString(),
        };
        await db.collection('profiles').insertOne(defaultProfile as any);
        return [this.sanitizeProfile(defaultProfile)];
      }
    } catch (err) {
      console.error('[DATABASE] Failed to read profiles from MongoDB:', err);
    }

    if (userId) {
      const userProfiles = this.memProfiles.filter((p) => p.userId === userId);
      if (userProfiles.length > 0) {
        return userProfiles.map((p) => this.sanitizeProfile(p));
      }
      // Create memory default profile for this user
      const defaultProfile: Profile = {
        id: `prof_${userId}_personal`,
        userId,
        name: 'Personal',
        color: '#1A1A1A',
        displayCurrency: 'GHS',
        type: 'personal',
        isLocked: false,
        exchangeRates: {
          GHS: 1,
          USD: 15.5,
          EUR: 17.0,
          GBP: 19.5,
          NGN: 0.0098,
        },
        createdAt: new Date().toISOString(),
      };
      this.memProfiles.push(defaultProfile);
      return [this.sanitizeProfile(defaultProfile)];
    }

    if (this.memProfiles.length === 0) {
      this.memProfiles = [
        {
          id: 'prof_personal',
          name: 'Personal',
          color: '#1A1A1A',
          displayCurrency: 'GHS',
          type: 'personal',
          isLocked: false,
          exchangeRates: {
            GHS: 1,
            USD: 15.5,
            EUR: 17.0,
            GBP: 19.5,
            NGN: 0.0098,
          },
          createdAt: new Date().toISOString(),
        },
      ];
    }
    return this.memProfiles.map((p) => this.sanitizeProfile(p));
  }

  public async getRawProfile(id: string): Promise<Profile | null> {
    try {
      const db = await this.getDb();
      if (db) {
        const prof = await db.collection<Profile>('profiles').findOne({ id }, { projection: { _id: 0 } });
        if (prof) return prof;
      }
    } catch (err) {
      console.error('[DATABASE] Failed to read raw profile:', err);
    }
    return this.memProfiles.find((p) => p.id === id) || null;
  }

  public async getProfile(id: string): Promise<Profile | null> {
    const raw = await this.getRawProfile(id);
    if (raw) return this.sanitizeProfile(raw);
    const all = await this.getProfiles();
    return all[0] || null;
  }

  public async verifyProfilePin(id: string, pin: string): Promise<boolean> {
    const raw = await this.getRawProfile(id);
    if (!raw) return false;
    if (!raw.isLocked || !raw.pinHash) return true; // Not locked
    if (!pin) return false;
    return bcrypt.compareSync(pin.trim(), raw.pinHash);
  }

  public async createProfile(
    name: string,
    color = '#1A1A1A',
    displayCurrency = 'GHS',
    type = 'personal',
    isLocked = false,
    pin?: string,
    userId?: string
  ): Promise<Profile> {
    const willLock = Boolean(isLocked && pin && pin.trim().length >= 4);
    const pinHash = willLock ? bcrypt.hashSync(pin!.trim(), 10) : undefined;

    const newProf: Profile = {
      id: `prof_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      name,
      color: color || '#1A1A1A',
      displayCurrency: displayCurrency || 'GHS',
      type: type || 'personal',
      isLocked: willLock,
      pinHash,
      exchangeRates: {
        GHS: 1,
        USD: 15.5,
        EUR: 17.0,
        GBP: 19.5,
        NGN: 0.0098,
      },
      createdAt: new Date().toISOString(),
    };
    this.memProfiles.push(newProf);

    try {
      const db = await this.getDb();
      if (db) {
        await db.collection('profiles').insertOne(newProf as any);
      }
    } catch (err) {
      console.error('[DATABASE] Failed to insert profile into MongoDB:', err);
    }

    await this.logAudit('profile.created', 'Profile', newProf.id, { name, isLocked: willLock });
    return this.sanitizeProfile(newProf);
  }

  public async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | null> {
    const idx = this.memProfiles.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.memProfiles[idx] = { ...this.memProfiles[idx], ...updates };
    }

    try {
      const db = await this.getDb();
      if (db) {
        const { _id, ...safeUpdates } = updates as any;
        await db.collection('profiles').updateOne({ id }, { $set: safeUpdates });
      }
    } catch (err) {
      console.error('[DATABASE] Failed to update profile in MongoDB:', err);
    }

    await this.logAudit('profile.updated', 'Profile', id, updates);
    return this.getProfile(id);
  }

  public async updateProfileWithLock(
    id: string,
    data: {
      name?: string;
      color?: string;
      displayCurrency?: string;
      type?: string;
      exchangeRates?: Record<string, number>;
      isLocked?: boolean;
      pin?: string;
      newPin?: string;
      currentPin?: string;
      balanceResetAt?: string;
      balanceResetAmount?: number;
      autoMonthlyReset?: boolean;
    }
  ): Promise<Profile | null> {
    const existing = await this.getRawProfile(id);
    if (!existing) {
      throw new Error('Profile not found');
    }

    const updates: Partial<Profile> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.color !== undefined) updates.color = data.color;
    if (data.displayCurrency !== undefined) updates.displayCurrency = data.displayCurrency;
    if (data.type !== undefined) updates.type = data.type;
    if (data.exchangeRates !== undefined) updates.exchangeRates = data.exchangeRates;
    if (data.balanceResetAt !== undefined) updates.balanceResetAt = data.balanceResetAt;
    if (data.balanceResetAmount !== undefined) updates.balanceResetAmount = data.balanceResetAmount;
    if (data.autoMonthlyReset !== undefined) updates.autoMonthlyReset = data.autoMonthlyReset;

    // Handle Lock & PIN state changes
    if (data.isLocked !== undefined) {
      if (data.isLocked) {
        // Turning ON lock or updating locked profile
        const targetPin = data.newPin || data.pin;
        if (existing.isLocked && existing.pinHash) {
          // Already locked, verify current PIN first if changing
          if (!data.currentPin) {
            throw new Error('Current PIN is required to modify lock settings on this profile');
          }
          const valid = bcrypt.compareSync(data.currentPin.trim(), existing.pinHash);
          if (!valid) {
            throw new Error('Current PIN is incorrect');
          }
        }
        if (targetPin) {
          if (targetPin.trim().length < 4) {
            throw new Error('New PIN must be at least 4 digits');
          }
          updates.pinHash = bcrypt.hashSync(targetPin.trim(), 10);
          updates.isLocked = true;
        } else if (existing.pinHash) {
          updates.isLocked = true;
        } else {
          throw new Error('A security PIN is required to lock this profile');
        }
      } else {
        // Turning OFF lock
        if (existing.isLocked && existing.pinHash) {
          const pinToCheck = data.currentPin || data.pin;
          if (!pinToCheck) {
            throw new Error('Current PIN is required to unlock and remove protection from this profile');
          }
          const valid = bcrypt.compareSync(pinToCheck.trim(), existing.pinHash);
          if (!valid) {
            throw new Error('Incorrect current PIN. Cannot remove profile lock.');
          }
        }
        updates.isLocked = false;
        updates.pinHash = undefined;
      }
    } else if (data.newPin) {
      // Just changing PIN while staying locked
      if (existing.isLocked && existing.pinHash) {
        if (!data.currentPin) {
          throw new Error('Current PIN is required to change PIN');
        }
        const valid = bcrypt.compareSync(data.currentPin.trim(), existing.pinHash);
        if (!valid) {
          throw new Error('Current PIN is incorrect');
        }
      }
      if (data.newPin.trim().length < 4) {
        throw new Error('New PIN must be at least 4 digits');
      }
      updates.pinHash = bcrypt.hashSync(data.newPin.trim(), 10);
      updates.isLocked = true;
    }

    const updated = await this.updateProfile(id, updates);
    return updated;
  }

  public async deleteProfile(id: string): Promise<boolean> {
    const currentProfiles = await this.getProfiles();
    if (currentProfiles.length <= 1) {
      throw new Error('Cannot delete the last remaining profile');
    }
    this.memProfiles = this.memProfiles.filter((p) => p.id !== id);
    this.memTransactions = this.memTransactions.filter((t) => t.profileId !== id);
    this.memBudgets = this.memBudgets.filter((b) => b.profileId !== id);
    this.memGoals = this.memGoals.filter((g) => g.profileId !== id);
    this.memDebts = this.memDebts.filter((d) => d.profileId !== id);
    this.memTransfers = this.memTransfers.filter((tf) => tf.profileId !== id);

    try {
      const db = await this.getDb();
      if (db) {
        await Promise.all([
          db.collection('profiles').deleteOne({ id }),
          db.collection('transactions').deleteMany({ profileId: id }),
          db.collection('budgets').deleteMany({ profileId: id }),
          db.collection('goals').deleteMany({ profileId: id }),
          db.collection('debts').deleteMany({ profileId: id }),
          db.collection('transfers').deleteMany({ profileId: id }),
        ]);
      }
    } catch (err) {
      console.error('[DATABASE] Failed to delete profile from MongoDB:', err);
    }

    await this.logAudit('profile.deleted', 'Profile', id);
    return true;
  }

  // Transactions
  public async getTransactions(profileId: string): Promise<Transaction[]> {
    try {
      const db = await this.getDb();
      if (db) {
        return await db
          .collection<Transaction>('transactions')
          .find({ profileId }, { projection: { _id: 0 } })
          .sort({ date: -1, createdAt: -1 })
          .toArray();
      }
    } catch (err) {
      console.error('[DATABASE] Failed to read transactions from MongoDB:', err);
    }
    return this.memTransactions
      .filter((t) => t.profileId === profileId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public async createTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const newTx: Transaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.memTransactions.unshift(newTx);

    try {
      const db = await this.getDb();
      if (db) {
        await db.collection('transactions').insertOne(newTx as any);
      }
    } catch (err) {
      console.error('[DATABASE] Failed to insert transaction into MongoDB:', err);
    }

    await this.logAudit('transaction.created', 'Transaction', newTx.id, {
      amount: newTx.amount,
      type: newTx.type,
      category: newTx.category,
    });
    return newTx;
  }

  public async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    const idx = this.memTransactions.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.memTransactions[idx] = { ...this.memTransactions[idx], ...updates };
    }

    try {
      const db = await this.getDb();
      if (db) {
        const { _id, ...safeUpdates } = updates as any;
        await db.collection('transactions').updateOne({ id }, { $set: safeUpdates });
      }
    } catch (err) {
      console.error('[DATABASE] Failed to update transaction in MongoDB:', err);
    }

    await this.logAudit('transaction.updated', 'Transaction', id, updates);
    const db = await this.getDb();
    if (db) {
      return await db.collection<Transaction>('transactions').findOne({ id }, { projection: { _id: 0 } });
    }
    return this.memTransactions.find((t) => t.id === id) || null;
  }

  public async deleteTransaction(id: string): Promise<boolean> {
    const initialLen = this.memTransactions.length;
    this.memTransactions = this.memTransactions.filter((t) => t.id !== id);

    try {
      const db = await this.getDb();
      if (db) {
        const res = await db.collection('transactions').deleteOne({ id });
        await this.logAudit('transaction.deleted', 'Transaction', id);
        return res.deletedCount > 0;
      }
    } catch (err) {
      console.error('[DATABASE] Failed to delete transaction in MongoDB:', err);
    }

    if (this.memTransactions.length !== initialLen) {
      await this.logAudit('transaction.deleted', 'Transaction', id);
      return true;
    }
    return false;
  }

  // Budgets
  public async getBudgets(profileId: string): Promise<Budget[]> {
    try {
      const db = await this.getDb();
      if (db) {
        return await db.collection<Budget>('budgets').find({ profileId }, { projection: { _id: 0 } }).toArray();
      }
    } catch (err) {
      console.error('[DATABASE] Failed to read budgets from MongoDB:', err);
    }
    return this.memBudgets.filter((b) => b.profileId === profileId);
  }

  public async upsertBudget(budget: Omit<Budget, 'id'>): Promise<Budget> {
    const idx = this.memBudgets.findIndex(
      (b) => b.profileId === budget.profileId && b.category.toLowerCase() === budget.category.toLowerCase()
    );

    let resultBudget: Budget;
    if (idx !== -1) {
      this.memBudgets[idx].limit = budget.limit;
      this.memBudgets[idx].currency = budget.currency;
      resultBudget = this.memBudgets[idx];
    } else {
      resultBudget = {
        ...budget,
        id: `bgt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      this.memBudgets.push(resultBudget);
    }

    try {
      const db = await this.getDb();
      if (db) {
        const existing = await db.collection<Budget>('budgets').findOne({
          profileId: budget.profileId,
          category: { $regex: new RegExp(`^${budget.category}$`, 'i') },
        });

        if (existing) {
          await db.collection('budgets').updateOne(
            { id: existing.id },
            { $set: { limit: budget.limit, currency: budget.currency } }
          );
          resultBudget = { ...existing, limit: budget.limit, currency: budget.currency };
        } else {
          await db.collection('budgets').insertOne(resultBudget as any);
        }
      }
    } catch (err) {
      console.error('[DATABASE] Failed to upsert budget in MongoDB:', err);
    }

    await this.logAudit('budget.upserted', 'Budget', resultBudget.id, budget);
    return resultBudget;
  }

  public async deleteBudget(id: string): Promise<boolean> {
    this.memBudgets = this.memBudgets.filter((b) => b.id !== id);
    try {
      const db = await this.getDb();
      if (db) {
        await db.collection('budgets').deleteOne({ id });
      }
    } catch (err) {
      console.error('[DATABASE] Failed to delete budget in MongoDB:', err);
    }
    await this.logAudit('budget.deleted', 'Budget', id);
    return true;
  }

  // Goals
  public async getGoals(profileId: string): Promise<Goal[]> {
    try {
      const db = await this.getDb();
      if (db) {
        return await db.collection<Goal>('goals').find({ profileId }, { projection: { _id: 0 } }).toArray();
      }
    } catch (err) {
      console.error('[DATABASE] Failed to read goals from MongoDB:', err);
    }
    return this.memGoals.filter((g) => g.profileId === profileId);
  }

  public async getGoal(id: string): Promise<Goal | null> {
    try {
      const db = await this.getDb();
      if (db) {
        return await db.collection<Goal>('goals').findOne({ id }, { projection: { _id: 0 } });
      }
    } catch (err) {
      console.error('[DATABASE] Failed to read goal from MongoDB:', err);
    }
    return this.memGoals.find((g) => g.id === id) || null;
  }

  public async createGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'current'> & { current?: number }): Promise<Goal> {
    const newGoal: Goal = {
      ...goal,
      current: goal.current || 0,
      id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.memGoals.push(newGoal);

    try {
      const db = await this.getDb();
      if (db) {
        await db.collection('goals').insertOne(newGoal as any);
      }
    } catch (err) {
      console.error('[DATABASE] Failed to insert goal into MongoDB:', err);
    }

    await this.logAudit('goal.created', 'Goal', newGoal.id, { name: newGoal.name, target: newGoal.target });
    return newGoal;
  }

  public async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | null> {
    const idx = this.memGoals.findIndex((g) => g.id === id);
    const existing = idx !== -1 ? this.memGoals[idx] : await this.getGoal(id);
    if (!existing) return null;

    const safeUpdates = { ...updates } as any;
    delete safeUpdates._id;

    if (idx !== -1) {
      this.memGoals[idx] = { ...this.memGoals[idx], ...safeUpdates };
    }

    try {
      const db = await this.getDb();
      if (db) {
        await db.collection('goals').updateOne({ id }, { $set: safeUpdates });
      }
    } catch (err) {
      console.error('[DATABASE] Failed to update goal in MongoDB:', err);
    }

    await this.logAudit('goal.updated', 'Goal', id, safeUpdates);
    return this.getGoal(id);
  }

  public async deleteGoal(id: string): Promise<boolean> {
    this.memGoals = this.memGoals.filter((g) => g.id !== id);
    this.memTransfers = this.memTransfers.filter((tf) => tf.goalId !== id);

    try {
      const db = await this.getDb();
      if (db) {
        await Promise.all([
          db.collection('goals').deleteOne({ id }),
          db.collection('transfers').deleteMany({ goalId: id }),
        ]);
      }
    } catch (err) {
      console.error('[DATABASE] Failed to delete goal in MongoDB:', err);
    }

    await this.logAudit('goal.deleted', 'Goal', id);
    return true;
  }

  // Debts
  public async getDebts(profileId: string): Promise<Debt[]> {
    try {
      const db = await this.getDb();
      if (db) {
        return await db.collection<Debt>('debts').find({ profileId }, { projection: { _id: 0 } }).toArray();
      }
    } catch (err) {
      console.error('[DATABASE] Failed to read debts from MongoDB:', err);
    }
    return this.memDebts.filter((d) => d.profileId === profileId);
  }

  public async getDebt(id: string): Promise<Debt | null> {
    try {
      const db = await this.getDb();
      if (db) {
        return await db.collection<Debt>('debts').findOne({ id }, { projection: { _id: 0 } });
      }
    } catch (err) {
      console.error('[DATABASE] Failed to read debt from MongoDB:', err);
    }
    return this.memDebts.find((d) => d.id === id) || null;
  }

  public async createDebt(debt: Omit<Debt, 'id' | 'createdAt' | 'paid'> & { paid?: number }): Promise<Debt> {
    const newDebt: Debt = {
      ...debt,
      paid: debt.paid || 0,
      id: `debt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.memDebts.push(newDebt);

    try {
      const db = await this.getDb();
      if (db) {
        await db.collection('debts').insertOne(newDebt as any);
      }
    } catch (err) {
      console.error('[DATABASE] Failed to insert debt into MongoDB:', err);
    }

    await this.logAudit('debt.created', 'Debt', newDebt.id, { person: newDebt.person, amount: newDebt.amount });
    return newDebt;
  }

  public async updateDebt(id: string, updates: Partial<Debt>): Promise<Debt | null> {
    const idx = this.memDebts.findIndex((d) => d.id === id);
    if (idx !== -1) {
      this.memDebts[idx] = { ...this.memDebts[idx], ...updates };
    }

    try {
      const db = await this.getDb();
      if (db) {
        const { _id, ...safeUpdates } = updates as any;
        await db.collection('debts').updateOne({ id }, { $set: safeUpdates });
      }
    } catch (err) {
      console.error('[DATABASE] Failed to update debt in MongoDB:', err);
    }

    await this.logAudit('debt.updated', 'Debt', id, updates);
    return this.getDebt(id);
  }

  public async recordDebtPayment(id: string, paymentAmount: number): Promise<Debt | null> {
    const debt = await this.getDebt(id);
    if (!debt) return null;

    const newPaid = Math.min(debt.amount, (debt.paid || 0) + paymentAmount);
    return this.updateDebt(id, { paid: newPaid });
  }

  public async deleteDebt(id: string): Promise<boolean> {
    this.memDebts = this.memDebts.filter((d) => d.id !== id);
    try {
      const db = await this.getDb();
      if (db) {
        await db.collection('debts').deleteOne({ id });
      }
    } catch (err) {
      console.error('[DATABASE] Failed to delete debt in MongoDB:', err);
    }
    await this.logAudit('debt.deleted', 'Debt', id);
    return true;
  }

  // Fund Transfers (Real Money Paystack Audit Trail)
  public async getTransfers(goalId?: string, profileId?: string): Promise<FundTransfer[]> {
    try {
      const db = await this.getDb();
      if (db) {
        const filter: Record<string, any> = {};
        if (goalId) filter.goalId = goalId;
        if (profileId) filter.profileId = profileId;
        return await db
          .collection<FundTransfer>('transfers')
          .find(filter, { projection: { _id: 0 } })
          .sort({ createdAt: -1 })
          .toArray();
      }
    } catch (err) {
      console.error('[DATABASE] Failed to read transfers from MongoDB:', err);
    }

    return this.memTransfers
      .filter((t) => (!goalId || t.goalId === goalId) && (!profileId || t.profileId === profileId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getTransferByReference(reference: string): Promise<FundTransfer | null> {
    try {
      const db = await this.getDb();
      if (db) {
        return await db.collection<FundTransfer>('transfers').findOne({ paystackReference: reference }, { projection: { _id: 0 } });
      }
    } catch (err) {
      console.error('[DATABASE] Failed to read transfer from MongoDB:', err);
    }
    return this.memTransfers.find((t) => t.paystackReference === reference) || null;
  }

  public async createTransfer(transfer: Omit<FundTransfer, 'id' | 'createdAt'>): Promise<FundTransfer> {
    const newTx: FundTransfer = {
      ...transfer,
      id: `txf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.memTransfers.unshift(newTx);

    try {
      const db = await this.getDb();
      if (db) {
        await db.collection('transfers').insertOne(newTx as any);
      }
    } catch (err) {
      console.error('[DATABASE] Failed to insert transfer into MongoDB:', err);
    }

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
    const transfer = await this.getTransferByReference(reference);
    if (!transfer) return null;

    const previousStatus = transfer.status;
    const updates: Partial<FundTransfer> = { status };
    if (payload) updates.rawWebhookPayload = payload;
    if (gatewayResponse) updates.gatewayResponse = gatewayResponse;

    const idx = this.memTransfers.findIndex((t) => t.paystackReference === reference);
    if (idx !== -1) {
      this.memTransfers[idx] = { ...this.memTransfers[idx], ...updates };
    }

    try {
      const db = await this.getDb();
      if (db) {
        await db.collection('transfers').updateOne({ paystackReference: reference }, { $set: updates });
      }
    } catch (err) {
      console.error('[DATABASE] Failed to update transfer in MongoDB:', err);
    }

    // When status becomes 'success' and wasn't previously 'success', credit goal balance and record transaction
    if (status === 'success' && previousStatus !== 'success') {
      const goal = await this.getGoal(transfer.goalId);
      if (goal) {
        const newCurrent = (goal.current || 0) + transfer.amount;
        const gIdx = this.memGoals.findIndex((g) => g.id === transfer.goalId);
        if (gIdx !== -1) {
          this.memGoals[gIdx].current = newCurrent;
          this.memGoals[gIdx].status = 'active';
        }

        try {
          const db = await this.getDb();
          if (db) {
            await db.collection('goals').updateOne({ id: transfer.goalId }, { $set: { current: newCurrent, status: 'active' } });
          }
        } catch (err) {
          console.error('[DATABASE] Failed to credit goal in MongoDB:', err);
        }

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
    try {
      const db = await this.getDb();
      if (db) {
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
    } catch (err) {
      console.error('[DATABASE] Failed to export from MongoDB:', err);
    }

    return {
      profiles: this.memProfiles,
      transactions: this.memTransactions,
      budgets: this.memBudgets,
      goals: this.memGoals,
      debts: this.memDebts,
      transfers: this.memTransfers,
    };
  }

  public async replaceAll(newData: Partial<LedgerDatabase>): Promise<void> {
    if (newData.profiles && newData.profiles.length > 0) {
      this.memProfiles = newData.profiles;
    }
    if (newData.transactions) {
      this.memTransactions = newData.transactions;
    }
    if (newData.budgets) {
      this.memBudgets = newData.budgets;
    }
    if (newData.goals) {
      this.memGoals = newData.goals;
    }
    if (newData.debts) {
      this.memDebts = newData.debts;
    }
    if (newData.transfers) {
      this.memTransfers = newData.transfers;
    }

    try {
      const db = await this.getDb();
      if (db) {
        if (newData.profiles && newData.profiles.length > 0) {
          await db.collection('profiles').deleteMany({});
          await db.collection('profiles').insertMany(newData.profiles as any);
        }
        if (newData.transactions && newData.transactions.length > 0) {
          await db.collection('transactions').deleteMany({});
          await db.collection('transactions').insertMany(newData.transactions as any);
        }
        if (newData.budgets && newData.budgets.length > 0) {
          await db.collection('budgets').deleteMany({});
          await db.collection('budgets').insertMany(newData.budgets as any);
        }
        if (newData.goals && newData.goals.length > 0) {
          await db.collection('goals').deleteMany({});
          await db.collection('goals').insertMany(newData.goals as any);
        }
        if (newData.debts && newData.debts.length > 0) {
          await db.collection('debts').deleteMany({});
          await db.collection('debts').insertMany(newData.debts as any);
        }
        if (newData.transfers && newData.transfers.length > 0) {
          await db.collection('transfers').deleteMany({});
          await db.collection('transfers').insertMany(newData.transfers as any);
        }
      }
    } catch (err) {
      console.error('[DATABASE] Failed to replace database in MongoDB:', err);
    }

    await this.logAudit('system.database.restored_or_imported');
  }
}

export const dbManager = new LedgerMongoDbManager();
