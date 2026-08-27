import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { dbManager } from './server/db.js';
import {
  authMiddleware,
  checkRateLimit,
  registerFailedAttempt,
  clearFailedAttempts,
  generateToken,
  verifyPin,
  setPin,
  COOKIE_OPTIONS,
  COOKIE_NAME,
} from './server/auth.js';
import { paystackService } from './server/services/paystack.js';
import { convertAmount } from './server/services/currency.js';

const PORT = 3000;

function validateEnvironment() {
  const missing: string[] = [];
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.trim() === '') {
    missing.push('MONGODB_URI');
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
    missing.push('JWT_SECRET');
  }
  if (!process.env.APP_PIN_HASH || process.env.APP_PIN_HASH.trim() === '') {
    missing.push('APP_PIN_HASH');
  }

  if (missing.length > 0) {
    const errorMsg =
      `[FATAL STARTUP REFUSAL] Missing required environment variables: ${missing.join(', ')}.\n` +
      `The server will not start with insecure fallbacks or in-memory/disk data loss risks.\n` +
      `Required Variables:\n` +
      `  - MONGODB_URI: MongoDB Atlas connection string\n` +
      `  - JWT_SECRET: Strong secret for cryptographically signing session JWTs\n` +
      `  - APP_PIN_HASH: Bcrypt hash of owner access PIN (generate via bcryptjs / bcrypt)\n`;
    console.error(`\n======================================================`);
    console.error(errorMsg);
    console.error(`======================================================\n`);
    throw new Error(`Startup failed: Missing ${missing.join(', ')}`);
  }
}

async function startServer() {
  // Validate mandatory secrets and database configuration
  validateEnvironment();

  const app = express();

  // Basic security and parsing middlewares
  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());

  // Capture rawBody for Paystack webhook HMAC verification
  app.use(
    express.json({
      limit: '10mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString();
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'ledger-financial-manager',
      storage: 'MongoDB Atlas',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // AUTHENTICATION ROUTES
  // ==========================================

  app.get('/api/auth/status', (req: Request, res: Response) => {
    const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.json({ authenticated: false });
    }
    try {
      res.json({ authenticated: true });
    } catch {
      res.json({ authenticated: false });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: 'PIN or passcode is required' });
    }

    if (!checkRateLimit(req)) {
      return res.status(429).json({ error: 'Too many failed login attempts. Please wait 5 minutes.' });
    }

    try {
      const isValid = await verifyPin(pin);
      if (!isValid) {
        registerFailedAttempt(req);
        return res.status(401).json({ error: 'Incorrect security PIN. Access denied.' });
      }

      clearFailedAttempts(req);
      const token = generateToken();
      res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
      await dbManager.logAudit('auth.login_success');
      return res.json({ success: true, token, message: 'Authentication successful' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Authentication error' });
    }
  });

  app.post('/api/auth/logout', async (_req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    await dbManager.logAudit('auth.logout');
    res.json({ success: true, message: 'Logged out successfully' });
  });

  app.post('/api/auth/change-pin', authMiddleware, async (req: Request, res: Response) => {
    const { currentPin, newPin } = req.body;
    if (!currentPin || !newPin || newPin.length < 4) {
      return res.status(400).json({ error: 'New PIN must be at least 4 digits' });
    }
    try {
      const isCurrentValid = await verifyPin(currentPin);
      if (!isCurrentValid) {
        return res.status(401).json({ error: 'Current PIN is invalid' });
      }
      await setPin(newPin);
      res.json({ success: true, message: 'PIN updated successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update PIN' });
    }
  });

  // ==========================================
  // PAYSTACK WEBHOOK (UNPROTECTED ROUTE WITH SIGNATURE CHECK)
  // ==========================================
  app.post('/api/paystack/webhook', async (req: any, res: Response) => {
    const signature = req.headers['x-paystack-signature'] as string;
    const rawBody = req.rawBody || JSON.stringify(req.body);

    const isVerified = paystackService.verifyWebhookSignature(rawBody, signature);
    const isLocalOrTest = !process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY === 'sk_test_xxxxxxxx';

    if (!isVerified && !isLocalOrTest) {
      console.warn('Paystack webhook signature verification failed!');
      return res.status(400).json({ error: 'Invalid Paystack webhook signature' });
    }

    const event = req.body;
    console.log('Received Paystack Webhook Event:', event?.event);

    if (event?.event === 'transfer.success' && event?.data) {
      const reference = event.data.reference;
      await dbManager.updateTransferStatus(
        reference,
        'success',
        event.data,
        event.data.gateway_response || 'Paystack confirmed transfer success'
      );
    } else if ((event?.event === 'transfer.failed' || event?.event === 'transfer.reversed') && event?.data) {
      const reference = event.data.reference;
      await dbManager.updateTransferStatus(
        reference,
        'failed',
        event.data,
        event.data.gateway_response || 'Paystack transfer failed or was reversed'
      );
    }

    res.status(200).json({ received: true });
  });

  // Apply Auth Middleware to all remaining `/api/*` endpoints
  app.use('/api', authMiddleware);

  // ==========================================
  // PROFILES ROUTES
  // ==========================================

  app.get('/api/profiles', async (_req: Request, res: Response) => {
    const profiles = await dbManager.getProfiles();
    res.json(profiles);
  });

  app.post('/api/profiles', async (req: Request, res: Response) => {
    const { name, color, displayCurrency } = req.body;
    if (!name) return res.status(400).json({ error: 'Profile name is required' });
    const profile = await dbManager.createProfile(name, color || '#1A1A1A', displayCurrency || 'GHS');
    res.status(201).json(profile);
  });

  app.patch('/api/profiles/:id', async (req: Request, res: Response) => {
    const profile = await dbManager.updateProfile(req.params.id, req.body);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  });

  app.delete('/api/profiles/:id', async (req: Request, res: Response) => {
    try {
      await dbManager.deleteProfile(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // TRANSACTIONS ROUTES
  // ==========================================

  app.get('/api/transactions', async (req: Request, res: Response) => {
    const profiles = await dbManager.getProfiles();
    const profileId = (req.query.profileId as string) || profiles[0]?.id;
    if (!profileId) return res.json([]);
    let transactions = await dbManager.getTransactions(profileId);

    const { type, category, search, from, to } = req.query;
    if (type) {
      transactions = transactions.filter((t) => t.type === type);
    }
    if (category) {
      transactions = transactions.filter((t) => t.category.toLowerCase() === (category as string).toLowerCase());
    }
    if (search) {
      const q = (search as string).toLowerCase();
      transactions = transactions.filter(
        (t) => t.note.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
      );
    }
    if (from) {
      transactions = transactions.filter((t) => t.date >= (from as string));
    }
    if (to) {
      transactions = transactions.filter((t) => t.date <= (to as string));
    }

    res.json(transactions);
  });

  app.post('/api/transactions', async (req: Request, res: Response) => {
    const { profileId, type, amount, currency, category, date, note, recurring } = req.body;
    if (!profileId || !type || !amount || !currency || !category) {
      return res.status(400).json({ error: 'Missing required transaction fields' });
    }
    const tx = await dbManager.createTransaction({
      profileId,
      type,
      amount: Number(amount),
      currency,
      category,
      date: date || new Date().toISOString().split('T')[0],
      note: note || '',
      recurring: recurring || 'none',
    });
    res.status(201).json(tx);
  });

  app.patch('/api/transactions/:id', async (req: Request, res: Response) => {
    const updated = await dbManager.updateTransaction(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Transaction not found' });
    res.json(updated);
  });

  app.delete('/api/transactions/:id', async (req: Request, res: Response) => {
    const success = await dbManager.deleteTransaction(req.params.id);
    if (!success) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ success: true });
  });

  app.get('/api/transactions/export', async (req: Request, res: Response) => {
    const profiles = await dbManager.getProfiles();
    const profileId = (req.query.profileId as string) || profiles[0]?.id;
    const transactions = await dbManager.getTransactions(profileId);

    // CSV Header
    let csv = 'ID,Date,Type,Category,Amount,Currency,Note,Recurring,CreatedAt\n';
    transactions.forEach((t) => {
      const row = [
        t.id,
        t.date,
        t.type,
        `"${(t.category || '').replace(/"/g, '""')}"`,
        t.amount,
        t.currency,
        `"${(t.note || '').replace(/"/g, '""')}"`,
        t.recurring,
        t.createdAt,
      ].join(',');
      csv += `${row}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ledger_transactions_${profileId}.csv"`);
    res.send(csv);
  });

  app.post('/api/transactions/import', async (req: Request, res: Response) => {
    const { profileId, csvData } = req.body;
    if (!profileId || !csvData) {
      return res.status(400).json({ error: 'profileId and csvData are required' });
    }

    const lines = (csvData as string).trim().split('\n');
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV data is empty or invalid' });
    }

    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',');
      if (parts.length >= 5) {
        const date = parts[1]?.replace(/"/g, '').trim() || new Date().toISOString().split('T')[0];
        const type = (parts[2]?.replace(/"/g, '').trim().toLowerCase() === 'income' ? 'income' : 'expense') as 'income' | 'expense';
        const category = parts[3]?.replace(/"/g, '').trim() || 'General';
        const amount = parseFloat(parts[4]?.replace(/"/g, '').trim()) || 0;
        const currency = parts[5]?.replace(/"/g, '').trim() || 'GHS';
        const note = parts[6]?.replace(/"/g, '').trim() || '';

        if (amount > 0) {
          await dbManager.createTransaction({
            profileId,
            date,
            type,
            category,
            amount,
            currency,
            note,
            recurring: 'none',
          });
          count++;
        }
      }
    }

    res.json({ success: true, count, message: `Successfully imported ${count} transactions` });
  });

  // ==========================================
  // BUDGETS ROUTES
  // ==========================================

  app.get('/api/budgets', async (req: Request, res: Response) => {
    const profiles = await dbManager.getProfiles();
    const profileId = (req.query.profileId as string) || profiles[0]?.id;
    if (!profileId) return res.json([]);
    const budgets = await dbManager.getBudgets(profileId);

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const allTxs = await dbManager.getTransactions(profileId);
    const txs = allTxs.filter((t) => t.type === 'expense' && t.date.startsWith(currentYearMonth));

    const budgetsWithSpent = budgets.map((b) => {
      const spent = txs
        .filter((t) => t.category.toLowerCase() === b.category.toLowerCase())
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        ...b,
        spent,
        percentage: b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0,
        remaining: Math.max(0, b.limit - spent),
      };
    });

    res.json(budgetsWithSpent);
  });

  app.post('/api/budgets', async (req: Request, res: Response) => {
    const { profileId, category, limit, currency } = req.body;
    if (!profileId || !category || !limit) {
      return res.status(400).json({ error: 'Missing required budget fields' });
    }
    const budget = await dbManager.upsertBudget({
      profileId,
      category,
      limit: Number(limit),
      currency: currency || 'GHS',
    });
    res.status(201).json(budget);
  });

  app.delete('/api/budgets/:id', async (req: Request, res: Response) => {
    await dbManager.deleteBudget(req.params.id);
    res.json({ success: true });
  });

  // ==========================================
  // SAVINGS GOALS & PAYSTACK REAL MONEY FUNDING
  // ==========================================

  app.get('/api/goals', async (req: Request, res: Response) => {
    const profiles = await dbManager.getProfiles();
    const profileId = (req.query.profileId as string) || profiles[0]?.id;
    if (!profileId) return res.json([]);
    const goals = await dbManager.getGoals(profileId);
    res.json(goals);
  });

  app.post('/api/goals', async (req: Request, res: Response) => {
    const { profileId, name, target, currency, deadline, paystackDestination, current } = req.body;
    if (!profileId || !name || !target) {
      return res.status(400).json({ error: 'Missing required goal fields' });
    }
    const goal = await dbManager.createGoal({
      profileId,
      name,
      target: Number(target),
      currency: currency || 'GHS',
      deadline,
      current: Number(current || 0),
      paystackDestination: paystackDestination || { type: 'none' },
    });
    res.status(201).json(goal);
  });

  app.patch('/api/goals/:id', async (req: Request, res: Response) => {
    const updated = await dbManager.updateGoal(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Goal not found' });
    res.json(updated);
  });

  app.delete('/api/goals/:id', async (req: Request, res: Response) => {
    await dbManager.deleteGoal(req.params.id);
    res.json({ success: true });
  });

  // REAL MONEY GOAL FUNDING VIA PAYSTACK
  app.post('/api/goals/:id/fund', async (req: Request, res: Response) => {
    const { amount, currency } = req.body;
    const goal = await dbManager.getGoal(req.params.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const fundAmount = Number(amount);
    if (!fundAmount || fundAmount <= 0) {
      return res.status(400).json({ error: 'A valid funding amount is required' });
    }

    const fundCurrency = currency || goal.currency || 'GHS';

    // If goal has no Paystack destination, manual direct funding is applied
    if (goal.paystackDestination?.type !== 'paystack_recipient' || !goal.paystackDestination.recipientCode) {
      const newCurrent = (goal.current || 0) + fundAmount;
      await dbManager.updateGoal(goal.id, { current: newCurrent });

      await dbManager.createTransaction({
        profileId: goal.profileId,
        type: 'expense',
        amount: fundAmount,
        currency: fundCurrency,
        category: 'Savings & Investments',
        date: new Date().toISOString().split('T')[0],
        note: `Manual fund contribution to goal: ${goal.name}`,
        recurring: 'none',
      });

      return res.json({
        success: true,
        goal: { ...goal, current: newCurrent },
        mode: 'manual',
        message: `Successfully credited ${fundCurrency} ${fundAmount.toLocaleString()} to ${goal.name}`,
      });
    }

    // Initiate real Paystack bank / mobile money transfer
    try {
      const result = await paystackService.initiateTransfer({
        goalId: goal.id,
        profileId: goal.profileId,
        amount: fundAmount,
        currency: fundCurrency,
        recipientCode: goal.paystackDestination.recipientCode,
        reason: `Ledger Savings: ${goal.name}`,
      });

      res.json({
        success: true,
        transfer: result.transfer,
        reference: result.reference,
        simulated: result.simulated,
        mode: 'paystack_transfer',
        message: result.simulated
          ? `Paystack sandbox transfer recorded (Ref: ${result.reference}). Awaiting explicit confirmation.`
          : `Live Paystack transfer in flight. Reference: ${result.reference}`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Paystack transfer initiation failed' });
    }
  });

  app.get('/api/goals/:id/transfers', async (req: Request, res: Response) => {
    const transfers = await dbManager.getTransfers(req.params.id);
    res.json(transfers);
  });

  // ==========================================
  // DEBTS ROUTES
  // ==========================================

  app.get('/api/debts', async (req: Request, res: Response) => {
    const profiles = await dbManager.getProfiles();
    const profileId = (req.query.profileId as string) || profiles[0]?.id;
    if (!profileId) return res.json([]);
    const debts = await dbManager.getDebts(profileId);
    res.json(debts);
  });

  app.post('/api/debts', async (req: Request, res: Response) => {
    const { profileId, direction, person, amount, currency, dueDate, note, paid } = req.body;
    if (!profileId || !direction || !person || !amount) {
      return res.status(400).json({ error: 'Missing required debt fields' });
    }
    const debt = await dbManager.createDebt({
      profileId,
      direction,
      person,
      amount: Number(amount),
      currency: currency || 'GHS',
      dueDate,
      note: note || '',
      paid: Number(paid || 0),
    });
    res.status(201).json(debt);
  });

  app.patch('/api/debts/:id', async (req: Request, res: Response) => {
    const updated = await dbManager.updateDebt(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Debt record not found' });
    res.json(updated);
  });

  app.post('/api/debts/:id/payment', async (req: Request, res: Response) => {
    const { amount } = req.body;
    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }
    const debt = await dbManager.recordDebtPayment(req.params.id, paymentAmount);
    if (!debt) return res.status(404).json({ error: 'Debt record not found' });

    // Also record a corresponding transaction in the ledger
    const isIOwe = debt.direction === 'i_owe';
    await dbManager.createTransaction({
      profileId: debt.profileId,
      type: isIOwe ? 'expense' : 'income',
      amount: paymentAmount,
      currency: debt.currency,
      category: 'Debt Repayments',
      date: new Date().toISOString().split('T')[0],
      note: isIOwe ? `Paid debt installment to ${debt.person}` : `Received debt installment from ${debt.person}`,
      recurring: 'none',
    });

    res.json({ success: true, debt });
  });

  app.delete('/api/debts/:id', async (req: Request, res: Response) => {
    await dbManager.deleteDebt(req.params.id);
    res.json({ success: true });
  });

  // ==========================================
  // REPORTS & ANALYTICS
  // ==========================================

  app.get('/api/reports/summary', async (req: Request, res: Response) => {
    const profiles = await dbManager.getProfiles();
    const profileId = (req.query.profileId as string) || profiles[0]?.id;
    const profile = (await dbManager.getProfile(profileId)) || profiles[0];
    if (!profile) return res.json({});

    const txs = await dbManager.getTransactions(profileId);
    const goals = await dbManager.getGoals(profileId);
    const debts = await dbManager.getDebts(profileId);

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let totalIncome = 0;
    let totalExpense = 0;
    let monthIncome = 0;
    let monthExpense = 0;

    txs.forEach((t) => {
      const converted = convertAmount(t.amount, t.currency, profile.displayCurrency, profile.exchangeRates);
      if (t.type === 'income') {
        totalIncome += converted;
        if (t.date.startsWith(currentYearMonth)) monthIncome += converted;
      } else {
        totalExpense += converted;
        if (t.date.startsWith(currentYearMonth)) monthExpense += converted;
      }
    });

    const netBalance = totalIncome - totalExpense;
    const monthNet = monthIncome - monthExpense;
    const savingsRate = monthIncome > 0 ? Math.max(0, Math.round(((monthIncome - monthExpense) / monthIncome) * 100)) : 0;

    const totalSavedInGoals = goals.reduce(
      (sum, g) => sum + convertAmount(g.current, g.currency, profile.displayCurrency, profile.exchangeRates),
      0
    );

    const totalIOwe = debts
      .filter((d) => d.direction === 'i_owe')
      .reduce((sum, d) => sum + convertAmount(Math.max(0, d.amount - (d.paid || 0)), d.currency, profile.displayCurrency, profile.exchangeRates), 0);

    const totalOwedToMe = debts
      .filter((d) => d.direction === 'owed_to_me')
      .reduce((sum, d) => sum + convertAmount(Math.max(0, d.amount - (d.paid || 0)), d.currency, profile.displayCurrency, profile.exchangeRates), 0);

    res.json({
      currency: profile.displayCurrency,
      netBalance: Math.round(netBalance * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      monthIncome: Math.round(monthIncome * 100) / 100,
      monthExpense: Math.round(monthExpense * 100) / 100,
      monthNet: Math.round(monthNet * 100) / 100,
      savingsRate,
      totalSavedInGoals: Math.round(totalSavedInGoals * 100) / 100,
      totalIOwe: Math.round(totalIOwe * 100) / 100,
      totalOwedToMe: Math.round(totalOwedToMe * 100) / 100,
      transactionCount: txs.length,
    });
  });

  app.get('/api/reports/category-breakdown', async (req: Request, res: Response) => {
    const profiles = await dbManager.getProfiles();
    const profileId = (req.query.profileId as string) || profiles[0]?.id;
    const profile = (await dbManager.getProfile(profileId)) || profiles[0];
    const type = (req.query.type as string) || 'expense';
    const month = req.query.month as string;

    const allTxs = await dbManager.getTransactions(profileId);
    let txs = allTxs.filter((t) => t.type === type);
    if (month) {
      txs = txs.filter((t) => t.date.startsWith(month));
    }

    const categoryMap: Record<string, number> = {};
    txs.forEach((t) => {
      const converted = convertAmount(t.amount, t.currency, profile.displayCurrency, profile.exchangeRates);
      categoryMap[t.category] = (categoryMap[t.category] || 0) + converted;
    });

    const total = Object.values(categoryMap).reduce((sum, val) => sum + val, 0);
    const breakdown = Object.entries(categoryMap)
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    res.json({ currency: profile.displayCurrency, total: Math.round(total * 100) / 100, breakdown });
  });

  app.get('/api/reports/trend', async (req: Request, res: Response) => {
    const profiles = await dbManager.getProfiles();
    const profileId = (req.query.profileId as string) || profiles[0]?.id;
    const profile = (await dbManager.getProfile(profileId)) || profiles[0];
    const numMonths = parseInt(req.query.months as string) || 6;

    const months: string[] = [];
    const now = new Date();
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(mStr);
    }

    const txs = await dbManager.getTransactions(profileId);
    const trend = months.map((month) => {
      const monthTxs = txs.filter((t) => t.date.startsWith(month));
      let income = 0;
      let expense = 0;
      monthTxs.forEach((t) => {
        const converted = convertAmount(t.amount, t.currency, profile.displayCurrency, profile.exchangeRates);
        if (t.type === 'income') income += converted;
        else expense += converted;
      });
      const [year, m] = month.split('-');
      const monthName = new Date(parseInt(year), parseInt(m) - 1, 1).toLocaleString('default', { month: 'short' });
      return {
        month,
        label: `${monthName} ${year.slice(2)}`,
        income: Math.round(income),
        expense: Math.round(expense),
        net: Math.round(income - expense),
      };
    });

    res.json({ currency: profile.displayCurrency, trend });
  });

  // ==========================================
  // PAYSTACK DIRECT INTEGRATION HELPERS
  // ==========================================

  app.get('/api/paystack/banks', async (req: Request, res: Response) => {
    const country = (req.query.country as string) || 'ghana';
    const banks = await paystackService.getBanks(country);
    res.json(banks);
  });

  app.post('/api/paystack/resolve-account', async (req: Request, res: Response) => {
    const { accountNumber, bankCode } = req.body;
    if (!accountNumber || !bankCode) {
      return res.status(400).json({ error: 'accountNumber and bankCode are required' });
    }
    const resolved = await paystackService.resolveAccount(accountNumber, bankCode);
    res.json(resolved);
  });

  app.post('/api/paystack/recipient', async (req: Request, res: Response) => {
    const { name, accountNumber, bankCode, currency } = req.body;
    if (!name || !accountNumber || !bankCode) {
      return res.status(400).json({ error: 'Recipient name, account number, and bank code are required' });
    }
    const result = await paystackService.createTransferRecipient({
      name,
      accountNumber,
      bankCode,
      currency: currency || 'GHS',
    });
    res.json(result);
  });

  app.get('/api/paystack/verify/:reference', async (req: Request, res: Response) => {
    const result = await paystackService.checkTransferStatus(req.params.reference);
    if (!result) return res.status(404).json({ error: 'Transfer reference not found' });
    res.json(result);
  });

  // ==========================================
  // AUDIT LOGS & SETTINGS
  // ==========================================

  app.get('/api/audit-logs', async (_req: Request, res: Response) => {
    const logs = await dbManager.getAuditLogs();
    res.json(logs);
  });

  app.get('/api/settings', async (req: Request, res: Response) => {
    const profiles = await dbManager.getProfiles();
    const profileId = (req.query.profileId as string) || profiles[0]?.id;
    const profile = (await dbManager.getProfile(profileId)) || profiles[0];
    res.json({
      profile,
      paystack: {
        isConfigured: paystackService.isKeyConfigured(),
        isLiveMode: paystackService.isLiveMode(),
        publicKey: process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxx',
      },
    });
  });

  app.post('/api/migrate', async (req: Request, res: Response) => {
    const payload = req.body;
    if (payload && (payload.profiles || payload.data)) {
      if (payload.profiles) {
        await dbManager.replaceAll(payload);
      }
      return res.json({ success: true, message: 'Data imported/migrated successfully into MongoDB Atlas' });
    }
    res.status(400).json({ error: 'Invalid migration payload shape' });
  });

  app.get('/api/export-all', async (_req: Request, res: Response) => {
    const raw = await dbManager.exportAll();
    const sanitized = {
      ...raw,
      exportedAt: new Date().toISOString(),
      version: '2.0.0-mongodb-atlas',
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="ledger_mongodb_backup.json"');
    res.json(sanitized);
  });

  // ==========================================
  // VITE / STATIC SERVING
  // ==========================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(` Ledger Financial Manager (MongoDB Atlas Connected)`);
    console.log(` Running on: http://0.0.0.0:${PORT}`);
    console.log(`======================================================\n`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});
