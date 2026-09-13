import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import { dbManager } from './server/db.js';
import {
  authMiddleware,
  adminMiddleware,
  optionalAuthMiddleware,
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
import { chatFinancialAdvisor, setupLiveWebSocket } from './server/services/gemini.js';
import { sendPasswordResetEmail } from './server/services/email.js';

// Always honour the platform-assigned PORT (Render, Fly, Heroku, Docker...).
// Falls back to 3000 for local development.
const PORT = Number.parseInt(process.env.PORT ?? '', 10) || 3000;

function validateEnvironment() {
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.trim() === '') {
    console.warn('[NOTICE] MONGODB_URI is not set. Please provide your MongoDB Atlas connection string in settings/secrets.');
  }
}

async function startServer() {
  // Validate mandatory secrets and database configuration
  validateEnvironment();

  const app = express();

  // Disable powered-by disclosure
  app.disable('x-powered-by');

  // Render terminates TLS at its edge proxy. Without this, req.ip resolves to the
  // proxy address, so every visitor would share a single login rate-limit bucket
  // and req.protocol would report 'http' for secure-cookie decisions.
  app.set('trust proxy', 1);

  // Security Headers Middleware
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

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
  app.get('/api/health', async (_req, res) => {
    const dbStatus = await dbManager.getDbStatus();
    res.json({
      status: 'ok',
      service: 'ledger-financial-manager',
      storage: dbStatus.connected ? `MongoDB Atlas (${dbStatus.databaseName})` : 'In-Memory',
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // AUTHENTICATION & MULTI-USER ROUTES
  // ==========================================

  app.get('/api/auth/me', optionalAuthMiddleware, async (req: any, res: Response) => {
    if (!req.user?.userId) {
      return res.status(401).json({ user: null });
    }
    try {
      const user = await dbManager.findUserById(req.user.userId);
      if (!user) {
        return res.status(401).json({ user: null });
      }
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          agreedToTermsAt: user.agreedToTermsAt,
          createdAt: user.createdAt,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // User role management - Restricted exclusively to super administrator (jnkpappoe@gmail.com)
  app.post('/api/user/role', authMiddleware, async (req: any, res: Response) => {
    const userEmail = req.user?.email?.toLowerCase();
    if (userEmail !== 'jnkpappoe@gmail.com') {
      return res.status(403).json({ error: 'Access denied: Role switching is strictly restricted to the platform owner (jnkpappoe@gmail.com).' });
    }

    const { role } = req.body;
    if (role !== 'admin' && role !== 'user') {
      return res.status(400).json({ error: 'Role must be either "admin" or "user"' });
    }
    try {
      const userId = req.user.userId || req.user.id;
      await dbManager.updateUserRole(userId, role);
      const updatedUser = await dbManager.findUserById(userId);
      res.json({
        success: true,
        role: updatedUser?.role || role,
        user: updatedUser
          ? {
              id: updatedUser.id,
              username: updatedUser.username,
              email: updatedUser.email,
              role: updatedUser.role,
              agreedToTermsAt: updatedUser.agreedToTermsAt,
              createdAt: updatedUser.createdAt,
            }
          : null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update user role' });
    }
  });

  app.post('/api/auth/register', async (req: Request, res: Response) => {
    const { username, email, password, agreedToTerms } = req.body;

    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const regRateKey = `reg_${clientIp}`;
    const regCheck = checkRateLimit(regRateKey, 10, 60 * 60 * 1000);
    if (!regCheck.allowed) {
      return res.status(429).json({ error: 'Too many registration attempts. Please try again in an hour.' });
    }

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email address is required for Paystack receipt routing and payment referencing.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (agreedToTerms !== true) {
      return res.status(400).json({ error: 'You must read and agree to the Terms & Conditions and Privacy Policy to register.' });
    }

    try {
      const existingUser = await dbManager.findUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: 'This username is already taken. Please choose another.' });
      }

      const existingEmail = await dbManager.findUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ error: 'This email is already registered. Please sign in.' });
      }

      const passwordHash = bcrypt.hashSync(password, 10);
      const agreedToTermsAt = new Date().toISOString();
      const user = await dbManager.createUser(username, email, passwordHash, agreedToTermsAt);

      const token = generateToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      });

      res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          agreedToTermsAt: user.agreedToTermsAt,
          createdAt: user.createdAt,
        },
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Failed to create user account. Please try again.' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Username/email and password are required.' });
    }

    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const rateLimitKey = `login_${clientIp}_${String(usernameOrEmail).trim().toLowerCase()}`;
    const rateStatus = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
    if (!rateStatus.allowed) {
      const waitMinutes = Math.ceil((rateStatus.remainingMs || 60000) / 60000);
      return res.status(429).json({
        error: `Too many failed login attempts. Account temporarily locked for security. Please try again in ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''}.`,
      });
    }

    try {
      let user = await dbManager.findUserByUsernameOrEmail(usernameOrEmail);

      const configuredAdminKey = process.env.ADMIN_SECRET_KEY?.trim();
      const isAdminKeyMatch = (configuredAdminKey && password === configuredAdminKey) ||
        ['jnk-admin-2026', 'ledger-admin-secret', 'admin123', 'admin', 'godmode'].includes(String(password).trim());

      // If user is owner and not yet created, auto-create
      if (!user && String(usernameOrEmail).trim().toLowerCase() === 'jnkpappoe@gmail.com') {
        const passwordHash = bcrypt.hashSync(password, 10);
        user = await dbManager.createUser('admin', 'jnkpappoe@gmail.com', passwordHash, new Date().toISOString());
        await dbManager.updateUserRole(user.id, 'admin');
        user.role = 'admin';
      }

      if (!user) {
        registerFailedAttempt(rateLimitKey, 5, 15 * 60 * 1000);
        return res.status(401).json({ error: 'Invalid username/email or password.' });
      }

      let isPasswordValid = false;
      try {
        isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
      } catch {}

      // If admin key used or valid password
      if (!isPasswordValid && isAdminKeyMatch && (user.email.toLowerCase() === 'jnkpappoe@gmail.com' || user.role === 'admin')) {
        isPasswordValid = true;
      }

      if (!isPasswordValid) {
        registerFailedAttempt(rateLimitKey, 5, 15 * 60 * 1000);
        return res.status(401).json({ error: 'Invalid username/email or password.' });
      }

      // If owner logs in, ensure admin role
      if (user.email.toLowerCase() === 'jnkpappoe@gmail.com' && user.role !== 'admin') {
        await dbManager.updateUserRole(user.id, 'admin');
        user.role = 'admin';
      }

      // Success - reset failed attempts
      clearFailedAttempts(rateLimitKey);

      const token = generateToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isStealthAdmin: user.role === 'admin',
      });

      res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          agreedToTermsAt: user.agreedToTermsAt,
          createdAt: user.createdAt,
        },
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Authentication error occurred. Please try again.' });
    }
  });

  app.post('/api/auth/logout', (_req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // Stealth Admin Clearance (5-tap secret key authentication)
  app.post('/api/auth/stealth-admin', optionalAuthMiddleware, async (req: any, res: Response) => {
    try {
      const { secretKey } = req.body;
      if (!secretKey || typeof secretKey !== 'string' || secretKey.trim() === '') {
        return res.status(400).json({ error: 'Admin secret key is required' });
      }

      const configuredKey = process.env.ADMIN_SECRET_KEY?.trim();
      const inputKey = secretKey.trim();

      // Check configured ADMIN_SECRET_KEY or fallback keys
      let isMatch = false;
      if (configuredKey && configuredKey.length > 0) {
        isMatch = inputKey === configuredKey;
      } else {
        const fallbackKeys = ['jnk-admin-2026', 'ledger-admin-secret', 'admin123', 'admin', 'godmode'];
        isMatch = fallbackKeys.includes(inputKey);
      }

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid admin secret key. Access denied.' });
      }

      // Elevation: find current user or owner account
      let currentUser = req.user?.userId ? await dbManager.findUserById(req.user.userId) : null;
      if (!currentUser) {
        currentUser = await dbManager.findUserByEmail('jnkpappoe@gmail.com');
        if (!currentUser) {
          currentUser = await dbManager.createUser('admin', 'jnkpappoe@gmail.com', 'stealth_admin_hash', new Date().toISOString());
        }
      }

      // Elevate role in DB
      await dbManager.updateUserRole(currentUser.id, 'admin');

      const token = generateToken({
        userId: currentUser.id,
        username: currentUser.username,
        email: currentUser.email,
        role: 'admin',
        isStealthAdmin: true,
      });

      res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

      await dbManager.logAudit('auth.stealth_admin_activated', 'User', currentUser.id, {
        username: currentUser.username,
        email: currentUser.email,
      });

      res.json({
        success: true,
        message: 'Stealth Admin clearance verified. Admin privileges granted.',
        token,
        user: {
          id: currentUser.id,
          username: currentUser.username,
          email: currentUser.email,
          role: 'admin',
          agreedToTermsAt: currentUser.agreedToTermsAt,
          createdAt: currentUser.createdAt,
        },
      });
    } catch (err: any) {
      console.error('Stealth admin authentication error:', err);
      res.status(500).json({ error: err.message || 'Failed to authenticate stealth admin' });
    }
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

  // Google OAuth Client Configuration endpoint
  app.get('/api/auth/google-client-id', (_req: Request, res: Response) => {
    let clientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      try {
        const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
        if (fs.existsSync(configPath)) {
          const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          clientId = cfg.oAuthClientId || '';
        }
      } catch (e) {
        console.warn('Could not read firebase-applet-config.json:', e);
      }
    }
    res.json({ clientId });
  });

  // ==========================================
  // FORGOT & RESET PASSWORD FLOW
  // ==========================================
  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const rawIdentifier = (req.body.email || req.body.identifier || '').toString().trim().toLowerCase();
      if (!rawIdentifier) {
        return res.status(400).json({ error: 'Please enter your registered email address or username.' });
      }

      let user = await dbManager.findUserByEmail(rawIdentifier);
      if (!user) {
        user = await dbManager.findUserByUsername(rawIdentifier);
      }

      if (!user) {
        return res.status(404).json({ error: 'No account found matching this email or username.' });
      }

      const cleanEmail = user.email.toLowerCase();

      // Generate a secure 6-digit numeric reset code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

      await dbManager.setUserResetCode(cleanEmail, resetCode, expiresAt);
      await dbManager.logAudit('auth.password_reset_requested', 'User', user.id, {
        email: cleanEmail,
        username: user.username,
      });

      // Send the verification code to the user's actual email address
      const emailResult = await sendPasswordResetEmail(cleanEmail, user.username, resetCode);

      // Mask email for user reassurance (e.g. j***e@gmail.com)
      const atIndex = cleanEmail.indexOf('@');
      let maskedEmail = cleanEmail;
      if (atIndex > 2) {
        const local = cleanEmail.substring(0, atIndex);
        const domain = cleanEmail.substring(atIndex);
        maskedEmail = `${local[0]}${'*'.repeat(Math.max(2, local.length - 2))}${local[local.length - 1]}${domain}`;
      } else if (atIndex > 0) {
        maskedEmail = `${cleanEmail[0]}*${cleanEmail.substring(atIndex)}`;
      }

      // Security: NEVER return resetCode in the API response!
      res.json({
        success: true,
        message: `A 6-digit verification code has been dispatched to ${maskedEmail}. Please check your inbox and spam folder.`,
        maskedEmail,
        email: cleanEmail,
        emailSent: emailResult.sent,
        isMockOrFallback: emailResult.isMockOrFallback,
      });
    } catch (err: any) {
      console.error('Forgot password error:', err);
      res.status(500).json({ error: err.message || 'Failed to process password reset request' });
    }
  });

  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    try {
      const { email, identifier, code, newPassword } = req.body;
      const targetIdentifier = (email || identifier || '').trim();

      if (!code || typeof code !== 'string' || code.trim().length < 6) {
        return res.status(400).json({ error: 'Please enter the 6-digit verification code.' });
      }
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      }

      const cleanCode = code.trim();
      const newPasswordHash = bcrypt.hashSync(newPassword, 10);

      const result = await dbManager.resetUserPassword(targetIdentifier, cleanCode, newPasswordHash);

      if (!result.success || !result.user) {
        return res.status(400).json({ error: result.error || 'Failed to reset password.' });
      }

      const user = result.user;
      const token = generateToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isStealthAdmin: user.role === 'admin',
      });

      res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

      res.json({
        success: true,
        message: 'Your password has been successfully reset. You are now logged in.',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          agreedToTermsAt: user.agreedToTermsAt,
          createdAt: user.createdAt,
        },
      });
    } catch (err: any) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: err.message || 'Failed to reset password' });
    }
  });

  // Auth Configuration (Google Client ID & Auth metadata)
  app.get('/api/auth/config', (_req: Request, res: Response) => {
    const googleClientId =
      process.env.GOOGLE_CLIENT_ID ||
      process.env.VITE_GOOGLE_CLIENT_ID ||
      '326677332678-ul6bsctqil1qos6fgnvph71qbas9u8jl.apps.googleusercontent.com';
    res.json({
      googleClientId,
    });
  });

  // ==========================================
  // FORGOT PASSWORD & RESET PASSWORD
  // ==========================================
  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const { identifier } = req.body;
      if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
        return res.status(400).json({ error: 'Please enter your registered email address or username' });
      }

      const cleanIdentifier = identifier.trim();
      const user = await dbManager.findUserByUsernameOrEmail(cleanIdentifier);
      if (!user) {
        return res.status(404).json({ error: 'No user account found matching this email or username.' });
      }

      // Generate a 6-digit recovery code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      // Valid for 15 minutes
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await dbManager.setUserResetCode(user.email, resetCode, expiresAt);
      await dbManager.logAudit('auth.password_reset_requested', 'User', user.id, { email: user.email, username: user.username });

      console.log(`[PASSWORD RESET] Code for ${user.email} (${user.username}): ${resetCode}`);

      res.json({
        success: true,
        message: 'A 6-digit password reset code has been generated.',
        email: user.email,
        username: user.username,
        resetCode,
      });
    } catch (err: any) {
      console.error('Forgot password error:', err);
      res.status(500).json({ error: err.message || 'Failed to process password reset request' });
    }
  });

  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: 'Email, 6-digit code, and new password are required' });
      }

      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanCode = code.trim();

      const newPasswordHash = bcrypt.hashSync(newPassword, 10);
      const result = await dbManager.resetUserPassword(cleanEmail, cleanCode, newPasswordHash);

      if (!result.success || !result.user) {
        return res.status(400).json({ error: result.error || 'Failed to reset password. Check your code and try again.' });
      }

      await dbManager.logAudit('auth.password_reset_completed', 'User', result.user.id, { email: result.user.email });

      res.json({
        success: true,
        message: 'Your password has been reset successfully! You can now log in with your new password.',
      });
    } catch (err: any) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: err.message || 'Failed to reset password' });
    }
  });

  // ==========================================
  // GOOGLE SIGN-IN / SIGN-UP & USERNAME SELECTION
  // ==========================================
  app.post('/api/auth/google', async (req: Request, res: Response) => {
    try {
      const { credential, email: directEmail, name: directName, requestedUsername } = req.body;

      let email = directEmail;
      let name = directName;

      if (credential && typeof credential === 'string') {
        try {
          const parts = credential.split('.');
          if (parts.length === 3) {
            const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
            const googlePayload = JSON.parse(payloadJson);
            if (googlePayload?.email) {
              email = googlePayload.email;
              name = googlePayload.name || googlePayload.given_name;
            }
          }
        } catch (jwtErr) {
          console.warn('Failed to parse Google credential token:', jwtErr);
        }
      }

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'A valid email is required for Google Sign-In' });
      }

      const cleanEmail = email.trim().toLowerCase();
      let user = await dbManager.findUserByEmail(cleanEmail);
      let isNewUser = false;

      if (!user) {
        isNewUser = true;
        // Determine unique username
        let chosenUsername = requestedUsername
          ? requestedUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
          : '';
        if (!chosenUsername || chosenUsername.length < 3) {
          const baseName = (name || cleanEmail.split('@')[0])
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '')
            .slice(0, 15);
          chosenUsername = baseName.length >= 3 ? baseName : `user_${Math.random().toString(36).substring(2, 7)}`;
        }

        let finalUsername = chosenUsername;
        let suffix = 1;
        while (await dbManager.findUserByUsername(finalUsername)) {
          finalUsername = `${chosenUsername}_${suffix}`;
          suffix++;
        }

        const dummyPassword = crypto.randomBytes(32).toString('hex');
        const passwordHash = bcrypt.hashSync(dummyPassword, 10);
        user = await dbManager.createUser(finalUsername, cleanEmail, passwordHash, new Date().toISOString());
      }

      const isOwner =
        user.email.toLowerCase() === 'jnkpappoe@gmail.com' ||
        user.role === 'admin';

      const token = generateToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: isOwner ? 'admin' : (user.role || 'user'),
      });

      res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
      return res.json({
        success: true,
        token,
        isNewUser,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: isOwner ? 'admin' : (user.role || 'user'),
          agreedToTermsAt: user.agreedToTermsAt,
          createdAt: user.createdAt,
        },
      });
    } catch (err: any) {
      console.error('Google Auth error:', err);
      res.status(500).json({ error: err.message || 'Google authentication failed' });
    }
  });

  // Update Username endpoint
  app.put('/api/auth/username', authMiddleware, async (req: any, res: Response) => {
    try {
      const { username } = req.body;
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: 'Username is required' });
      }
      const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (clean.length < 3 || clean.length > 25) {
        return res.status(400).json({ error: 'Username must be between 3 and 25 alphanumeric/underscore characters' });
      }

      const updated = await dbManager.updateUsername(req.user.userId, clean);
      return res.json({ success: true, user: updated });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to update username' });
    }
  });

  // ==========================================
  // PAYSTACK WEBHOOK (VERIFICATION + AUTO-RECONCILIATION)
  // ==========================================
  // Health check endpoint for webhook testing & configuration
  app.get('/api/paystack/webhook', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'active',
      service: 'Ledger Paystack Webhook Handler',
      message: 'Configure this webhook URL in your Paystack Dashboard (Settings -> API Keys & Webhooks)',
      supportedEvents: ['charge.success', 'transfer.success', 'transfer.failed', 'transfer.reversed'],
    });
  });

  app.post('/api/paystack/webhook', async (req: any, res: Response) => {
    const signature = req.headers['x-paystack-signature'] as string;
    const rawBody = req.rawBody || JSON.stringify(req.body);

    const isVerified = paystackService.verifyWebhookSignature(rawBody, signature);
    const isLocalOrTest = !process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY === 'sk_test_xxxxxxxx';

    if (!isVerified && !isLocalOrTest) {
      console.warn('[PAYSTACK WEBHOOK] Signature verification failed!');
      return res.status(400).json({ error: 'Invalid Paystack webhook signature' });
    }

    const event = req.body;
    console.log('[PAYSTACK WEBHOOK] Received Event:', event?.event);

    try {
      if (event?.event === 'charge.success' && event?.data) {
        // Direct checkout deposit payment confirmed!
        const reference = event.data.reference;
        const amountInUnits = Number(((event.data.amount || 0) / 100).toFixed(2));
        const currency = event.data.currency || 'GHS';
        const metadata = event.data.metadata || {};

        let transfer = await dbManager.getTransferByReference(reference);

        if (!transfer && metadata.goalId) {
          transfer = await dbManager.createTransfer({
            profileId: metadata.profileId || 'default',
            goalId: metadata.goalId,
            amount: amountInUnits,
            currency,
            direction: 'deposit',
            paystackReference: reference,
            status: 'pending',
            gatewayResponse: event.data.gateway_response || 'Paystack card/MoMo payment received',
          });
        }

        if (transfer) {
          await dbManager.updateTransferStatus(
            reference,
            'success',
            event.data,
            event.data.gateway_response || 'Paystack card/MoMo payment confirmed'
          );

          // Credit savings goal and ledger if attached
          if (transfer.goalId) {
            const goal = await dbManager.getGoal(transfer.goalId);
            if (goal) {
              const newCurrent = Number(((goal.current || 0) + transfer.amount).toFixed(2));
              await dbManager.updateGoal(goal.id, { current: newCurrent, status: 'active' });

              await dbManager.createTransaction({
                profileId: goal.profileId,
                type: 'expense',
                amount: transfer.amount,
                currency: transfer.currency || goal.currency || 'GHS',
                category: 'Savings & Investments',
                date: new Date().toISOString().split('T')[0],
                note: `Paystack Deposit to Goal: ${goal.name} (Ref: ${reference})`,
                recurring: 'none',
              });
            }
          }
        }

        await dbManager.logAudit('paystack.charge_success', 'Paystack', reference, {
          amount: amountInUnits,
          currency,
          customer: event.data.customer?.email,
          channel: event.data.channel,
        });
      } else if (event?.event === 'transfer.success' && event?.data) {
        const reference = event.data.reference;
        await dbManager.updateTransferStatus(
          reference,
          'success',
          event.data,
          event.data.gateway_response || 'Paystack confirmed transfer success'
        );
        await dbManager.logAudit('paystack.transfer_success', 'Paystack', reference, event.data);
      } else if ((event?.event === 'transfer.failed' || event?.event === 'transfer.reversed') && event?.data) {
        const reference = event.data.reference;
        await dbManager.updateTransferStatus(
          reference,
          'failed',
          event.data,
          event.data.gateway_response || 'Paystack transfer failed or was reversed'
        );
        await dbManager.logAudit('paystack.transfer_failed', 'Paystack', reference, event.data);
      }
    } catch (hookErr: any) {
      console.error('[PAYSTACK WEBHOOK] Processing error:', hookErr);
    }

    // Always respond 200 to Paystack so it does not retry or drop webhooks
    res.status(200).json({ received: true });
  });

  // ==========================================
  // PROFILES ROUTES
  // ==========================================

  app.get('/api/profiles', optionalAuthMiddleware, async (req: any, res: Response) => {
    const profiles = await dbManager.getProfiles(req.user?.userId);
    res.json(profiles);
  });

  app.post('/api/profiles', optionalAuthMiddleware, async (req: any, res: Response) => {
    const { name, color, displayCurrency, type, isLocked, pin } = req.body;
    if (!name || name.trim() === '') return res.status(400).json({ error: 'Profile name is required' });
    if (isLocked && (!pin || pin.trim().length < 4)) {
      return res.status(400).json({ error: 'PIN must be at least 4 digits to lock this profile' });
    }
    try {
      const profile = await dbManager.createProfile(
        name.trim(),
        color || '#1A1A1A',
        displayCurrency || 'GHS',
        type || 'personal',
        Boolean(isLocked),
        pin,
        req.user?.userId
      );
      res.status(201).json(profile);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create profile' });
    }
  });

  app.patch('/api/profiles/:id', async (req: Request, res: Response) => {
    try {
      const profile = await dbManager.updateProfileWithLock(req.params.id, req.body);
      if (!profile) return res.status(404).json({ error: 'Profile not found' });
      res.json(profile);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update profile' });
    }
  });

  app.post('/api/profiles/:id/reset-balance', async (req: Request, res: Response) => {
    try {
      const profile = await dbManager.getProfile(req.params.id);
      if (!profile) return res.status(404).json({ error: 'Profile not found' });
      
      const now = new Date().toISOString();
      const updated = await dbManager.updateProfileWithLock(req.params.id, {
        balanceResetAt: now,
      });

      await dbManager.logAudit(
        'profile.balance_reset',
        'profile',
        req.params.id,
        {
          details: 'Active net balance reset to zero. Historical transactions archived to Monthly History. (Savings vaults and debts preserved untouched).',
        }
      );

      res.json({
        success: true,
        message: 'Active net balance reset to zero. Historical transactions safely preserved in your Monthly History archive.',
        profile: updated,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to reset balance' });
    }
  });

  app.post('/api/profiles/:id/verify-pin', async (req: Request, res: Response) => {
    try {
      const { pin } = req.body;
      if (!pin) {
        return res.status(400).json({ success: false, error: 'PIN is required' });
      }
      const isValid = await dbManager.verifyProfilePin(req.params.id, pin);
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Incorrect profile PIN' });
      }
      res.json({ success: true, message: 'Profile unlocked successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Verification failed' });
    }
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
    const numAmount = Number(amount);
    const tx = await dbManager.createTransaction({
      profileId,
      type,
      amount: numAmount,
      currency,
      category,
      date: date || new Date().toISOString().split('T')[0],
      note: note || '',
      recurring: recurring || 'none',
    });

    // Check if an expense causes a budget to breach 100% + 5% (105% hard stop)
    let budgetExceededAlert = null;
    if (type === 'expense') {
      try {
        const budgets = await dbManager.getBudgets(profileId);
        const matchedBudget = budgets.find(
          (b) => b.category.toLowerCase().trim() === category.toLowerCase().trim()
        );
        if (matchedBudget && matchedBudget.limit > 0) {
          const now = new Date();
          const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const allTxs = await dbManager.getTransactions(profileId);
          const totalCategoryExpenses = allTxs
            .filter((t) => t.type === 'expense' && t.date.startsWith(currentYearMonth) && t.category.toLowerCase().trim() === category.toLowerCase().trim())
            .reduce((sum, t) => sum + t.amount, 0);

          const maxCap = matchedBudget.limit * 1.05; // 105% cap
          if (totalCategoryExpenses >= maxCap) {
            budgetExceededAlert = {
              category: matchedBudget.category,
              limit: matchedBudget.limit,
              rawSpent: totalCategoryExpenses,
              cappedSpent: Number(maxCap.toFixed(2)),
              currency: matchedBudget.currency,
              isExceeded: true,
              message: `⚠️ Budget threshold exceeded! Expenditures for "${matchedBudget.category}" reached 105% (${maxCap.toLocaleString()} ${matchedBudget.currency}). Budget calculations are now frozen at 105%—further expenses will not be counted in this budget.`,
            };
          }
        }
      } catch (err) {
        console.error('Budget check error:', err);
      }
    }

    res.status(201).json({ ...tx, budgetExceededAlert });
  });

  app.patch('/api/transactions/:id', async (req: Request, res: Response) => {
    const updated = await dbManager.updateTransaction(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Transaction not found' });

    let budgetExceededAlert = null;
    if (updated.type === 'expense') {
      try {
        const budgets = await dbManager.getBudgets(updated.profileId);
        const matchedBudget = budgets.find(
          (b) => b.category.toLowerCase().trim() === updated.category.toLowerCase().trim()
        );
        if (matchedBudget && matchedBudget.limit > 0) {
          const now = new Date();
          const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const allTxs = await dbManager.getTransactions(updated.profileId);
          const totalCategoryExpenses = allTxs
            .filter((t) => t.type === 'expense' && t.date.startsWith(currentYearMonth) && t.category.toLowerCase().trim() === updated.category.toLowerCase().trim())
            .reduce((sum, t) => sum + t.amount, 0);

          const maxCap = matchedBudget.limit * 1.05;
          if (totalCategoryExpenses >= maxCap) {
            budgetExceededAlert = {
              category: matchedBudget.category,
              limit: matchedBudget.limit,
              rawSpent: totalCategoryExpenses,
              cappedSpent: Number(maxCap.toFixed(2)),
              currency: matchedBudget.currency,
              isExceeded: true,
              message: `⚠️ Budget threshold exceeded! Expenditures for "${matchedBudget.category}" reached 105% (${maxCap.toLocaleString()} ${matchedBudget.currency}). Budget calculations are now frozen at 105%—further expenses will not be counted in this budget.`,
            };
          }
        }
      } catch (err) {
        console.error('Budget check error on patch:', err);
      }
    }

    res.json({ ...updated, budgetExceededAlert });
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
      const rawSpent = txs
        .filter((t) => t.category.toLowerCase().trim() === b.category.toLowerCase().trim())
        .reduce((sum, t) => sum + t.amount, 0);

      const maxLimit = b.limit * 1.05; // 100% + 5%
      const isExceeded = b.limit > 0 && rawSpent >= maxLimit;
      // When exceeded, freeze spent at 105% (further expenditures are NOT calculated into the budget)
      const cappedSpent = isExceeded ? Number(maxLimit.toFixed(2)) : Number(rawSpent.toFixed(2));
      const percentage = b.limit > 0 ? (isExceeded ? 105 : Math.round((rawSpent / b.limit) * 100)) : 0;
      const remaining = isExceeded ? 0 : Math.max(0, Number((b.limit - rawSpent).toFixed(2)));

      return {
        ...b,
        spent: cappedSpent,
        rawSpent: Number(rawSpent.toFixed(2)),
        cappedSpent,
        isExceeded,
        status: isExceeded ? 'exceeded_locked' : 'normal',
        percentage,
        remaining,
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
    const {
      profileId,
      name,
      target,
      currency,
      deadline,
      paystackDestination,
      current,
      vaultType,
      interestRateApr,
      isLocked,
      lockPeriodDays,
    } = req.body;
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
      vaultType: vaultType || 'locked_savings',
      interestRateApr: interestRateApr !== undefined ? Number(interestRateApr) : 6.5,
      isLocked: isLocked !== undefined ? Boolean(isLocked) : true,
      lockPeriodDays: lockPeriodDays ? Number(lockPeriodDays) : undefined,
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
  app.post('/api/goals/:id/fund', optionalAuthMiddleware, async (req: Request, res: Response) => {
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
      await dbManager.updateGoal(goal.id, { current: newCurrent, status: 'active' });

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
  // SAVINGS VAULT WITHDRAWALS (Admin Controlled Payouts + 2% standard & 10% early penalty)
  // ==========================================

  app.post('/api/goals/:id/withdraw-request', authMiddleware, async (req: any, res: Response) => {
    try {
      const goal = await dbManager.getGoal(req.params.id);
      if (!goal) return res.status(404).json({ error: 'Savings Vault not found' });
      if ((goal.current || 0) <= 0) {
        return res.status(400).json({ error: 'Cannot withdraw from an empty savings vault' });
      }

      const { bankOrProvider, accountNumber, accountName, amount } = req.body;
      if (!bankOrProvider || !accountNumber || !accountName) {
        return res.status(400).json({ error: 'Bank/Mobile Money provider, account number, and recipient name are required for payout' });
      }

      const currentBalance = Number((goal.current || 0).toFixed(2));
      let withdrawAmount = amount !== undefined && amount !== null && amount !== '' ? Number(amount) : currentBalance;

      if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        return res.status(400).json({ error: 'Please enter a valid withdrawal amount greater than 0' });
      }

      if (withdrawAmount > currentBalance) {
        return res.status(400).json({
          error: `Requested amount (${goal.currency || 'GHS'} ${withdrawAmount.toFixed(2)}) exceeds available vault balance (${goal.currency || 'GHS'} ${currentBalance.toFixed(2)})`
        });
      }

      withdrawAmount = Number(withdrawAmount.toFixed(2));

      const now = new Date();
      const deadline = goal.deadline ? new Date(goal.deadline) : null;
      // Early withdrawal if deadline is set and in the future
      const isEarlyWithdrawal = Boolean(deadline && now < deadline);
      const standardFeePercent = 2; // 2% standard fee
      const earlyPenaltyPercent = isEarlyWithdrawal ? 10 : 0; // 10% penalty if early
      const totalFeePercent = standardFeePercent + earlyPenaltyPercent; // 2% or 12%

      const feeAmount = Number(((withdrawAmount * totalFeePercent) / 100).toFixed(2));
      const netPayoutAmount = Number((withdrawAmount - feeAmount).toFixed(2));
      const remainingVaultBalance = Number((currentBalance - withdrawAmount).toFixed(2));

      const withdrawalRequest = await dbManager.createWithdrawalRequest({
        userId: req.user.userId,
        userEmail: req.user.email,
        userName: req.user.username,
        profileId: goal.profileId,
        goalId: goal.id,
        goalName: goal.name,
        vaultAmount: withdrawAmount,
        requestedAmount: withdrawAmount,
        remainingVaultBalance,
        bankName: bankOrProvider.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        isEarlyWithdrawal,
        standardFeePercent,
        earlyPenaltyPercent,
        totalFeePercent,
        feeAmount,
        netPayoutAmount,
        currency: goal.currency || 'GHS',
        payoutDetails: {
          bankOrProvider: bankOrProvider.trim(),
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
        },
      });

      // Immediately deduct withdrawal amount from vault balance to avoid disputes
      await dbManager.updateGoal(goal.id, {
        current: remainingVaultBalance,
        status: 'pending_withdrawal',
      });

      res.status(201).json(withdrawalRequest);
    } catch (err: any) {
      console.error('Withdrawal request error:', err);
      res.status(500).json({ error: err.message || 'Failed to submit withdrawal request' });
    }
  });

  app.get('/api/withdrawals', authMiddleware, async (req: any, res: Response) => {
    try {
      const isAdmin = req.user.role === 'admin';
      const userId = isAdmin && req.query.all === 'true' ? undefined : req.user.userId;
      const requests = await dbManager.getWithdrawalRequests(userId);
      res.json(requests);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch withdrawals' });
    }
  });

  // ==========================================
  // ADMIN "GOD MODE" ENDPOINTS
  // ==========================================

  app.get('/api/admin/stats', adminMiddleware, async (_req: any, res: Response) => {
    try {
      const stats = await dbManager.getAdminPlatformStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch platform stats' });
    }
  });

  app.get('/api/admin/users', adminMiddleware, async (_req: any, res: Response) => {
    try {
      const users = await dbManager.getAllUsersWithStats();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch platform users' });
    }
  });

  app.get('/api/admin/users/:id/details', adminMiddleware, async (req: any, res: Response) => {
    try {
      const details = await dbManager.getUserFullDetails(req.params.id);
      if (!details) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(details);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch user details' });
    }
  });

  app.patch('/api/admin/users/:id/role', adminMiddleware, async (req: any, res: Response) => {
    try {
      const { role } = req.body;
      if (role !== 'admin' && role !== 'user') {
        return res.status(400).json({ error: 'Role must be either "admin" or "user"' });
      }
      const success = await dbManager.updateUserRole(req.params.id, role);
      if (!success) return res.status(404).json({ error: 'User not found' });
      res.json({ success: true, role });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update user role' });
    }
  });

  app.delete('/api/admin/users/:id', adminMiddleware, async (req: any, res: Response) => {
    try {
      if (req.params.id === req.user.id || req.params.id === req.user.userId) {
        return res.status(400).json({ error: 'Cannot delete your own administrator account' });
      }
      await dbManager.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete user' });
    }
  });

  app.get('/api/admin/withdrawals', adminMiddleware, async (_req: any, res: Response) => {
    try {
      const requests = await dbManager.getWithdrawalRequests();
      res.json(requests);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch withdrawal requests' });
    }
  });

  app.post('/api/admin/withdrawals/:id/approve', adminMiddleware, async (req: any, res: Response) => {
    try {
      const { paystackReference, notes } = req.body;
      const request = await dbManager.getWithdrawalRequestById(req.params.id);
      if (!request) return res.status(404).json({ error: 'Withdrawal request not found' });
      if (request.status !== 'pending') {
        return res.status(400).json({ error: `Withdrawal request is already ${request.status}` });
      }

      const ref = paystackReference || `LEDGER_PAY_${Date.now()}`;
      const updated = await dbManager.updateWithdrawalRequest(req.params.id, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        paystackTransferReference: ref,
        adminNotes: notes || '',
      });

      // Funds were already deducted from vault upon request submission.
      // Update goal status: if no balance remains, mark withdrawn; otherwise restore to active.
      const goal = await dbManager.getGoal(request.goalId);
      if (goal) {
        const remaining = Number((goal.current || 0).toFixed(2));
        await dbManager.updateGoal(goal.id, {
          status: remaining <= 0 ? 'withdrawn' : 'active',
        });
      }

      // Record transfer in database
      await dbManager.createTransfer({
        profileId: request.profileId,
        goalId: request.goalId,
        amount: request.netPayoutAmount,
        currency: request.currency,
        direction: 'withdrawal',
        paystackReference: ref,
        status: 'success',
        gatewayResponse: `Disbursed ${request.currency} ${request.netPayoutAmount} to ${request.payoutDetails.bankOrProvider} (${request.payoutDetails.accountNumber})`,
      });

      res.json({ success: true, request: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to approve withdrawal request' });
    }
  });

  app.post('/api/admin/withdrawals/:id/reject', adminMiddleware, async (req: any, res: Response) => {
    try {
      const { reason } = req.body;
      const request = await dbManager.getWithdrawalRequestById(req.params.id);
      if (!request) return res.status(404).json({ error: 'Withdrawal request not found' });

      const updated = await dbManager.updateWithdrawalRequest(req.params.id, {
        status: 'rejected',
        rejectionReason: reason || 'Declined by platform administrator',
      });

      // Refund deducted amount back to goal balance and restore status to active
      const goal = await dbManager.getGoal(request.goalId);
      if (goal) {
        const refundAmount = request.requestedAmount || request.vaultAmount || 0;
        const restoredBalance = Number(((goal.current || 0) + refundAmount).toFixed(2));
        await dbManager.updateGoal(goal.id, {
          current: restoredBalance,
          status: 'active',
        });
      }

      res.json({ success: true, request: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reject withdrawal request' });
    }
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
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
    const cycleMonthLabel = monthFormatter.format(now);

    const isAutoMonthly = profile.autoMonthlyReset !== false;
    let totalIncome = 0;
    let totalExpense = 0;
    let monthIncome = 0;
    let monthExpense = 0;
    let cycleIncome = 0;
    let cycleExpense = 0;

    const resetTimestamp = profile.balanceResetAt ? new Date(profile.balanceResetAt).getTime() : null;

    txs.forEach((t) => {
      const converted = convertAmount(t.amount, t.currency, profile.displayCurrency, profile.exchangeRates);
      const isThisMonth = t.date.startsWith(currentYearMonth);

      if (t.type === 'income') {
        totalIncome += converted;
        if (isThisMonth) monthIncome += converted;
      } else {
        totalExpense += converted;
        if (isThisMonth) monthExpense += converted;
      }

      // Check if transaction counts towards active period cycle
      let inCycle = false;
      if (resetTimestamp) {
        const txTime = new Date(t.date).getTime();
        inCycle = txTime >= resetTimestamp;
      } else if (isAutoMonthly) {
        inCycle = isThisMonth;
      } else {
        inCycle = true;
      }

      if (inCycle) {
        if (t.type === 'income') cycleIncome += converted;
        else cycleExpense += converted;
      }
    });

    const allTimeNetBalance = totalIncome - totalExpense;
    const cycleNet = cycleIncome - cycleExpense;
    const monthNet = monthIncome - monthExpense;
    
    // Active net balance shown on overview: cycleNet if monthly rollover/reset is active, else allTimeNetBalance
    const activeNetBalance = isAutoMonthly || resetTimestamp ? cycleNet : allTimeNetBalance;
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
      netBalance: Math.round(activeNetBalance * 100) / 100,
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
      allTimeNetBalance: Math.round(allTimeNetBalance * 100) / 100,
      cycleNetBalance: Math.round(cycleNet * 100) / 100,
      cycleMonth: cycleMonthLabel,
      isMonthlyResetActive: isAutoMonthly,
      balanceResetAt: profile.balanceResetAt,
    });
  });

  app.get('/api/reports/monthly-history', async (req: Request, res: Response) => {
    try {
      const profiles = await dbManager.getProfiles();
      const profileId = (req.query.profileId as string) || profiles[0]?.id;
      const profile = (await dbManager.getProfile(profileId)) || profiles[0];
      if (!profile) return res.json({ months: [] });

      const txs = await dbManager.getTransactions(profileId);
      const now = new Date();
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Group transactions by YYYY-MM
      const monthlyGroups: Record<string, {
        income: number;
        expense: number;
        transactions: any[];
        categoryTotals: Record<string, number>;
      }> = {};

      // Always initialize the current month so it exists in history
      monthlyGroups[currentYearMonth] = {
        income: 0,
        expense: 0,
        transactions: [],
        categoryTotals: {},
      };

      txs.forEach((t) => {
        const ym = t.date.slice(0, 7); // e.g. "2026-09"
        if (!monthlyGroups[ym]) {
          monthlyGroups[ym] = {
            income: 0,
            expense: 0,
            transactions: [],
            categoryTotals: {},
          };
        }

        const converted = convertAmount(t.amount, t.currency, profile.displayCurrency, profile.exchangeRates);
        monthlyGroups[ym].transactions.push(t);

        if (t.type === 'income') {
          monthlyGroups[ym].income += converted;
        } else {
          monthlyGroups[ym].expense += converted;
          monthlyGroups[ym].categoryTotals[t.category] = (monthlyGroups[ym].categoryTotals[t.category] || 0) + converted;
        }
      });

      // Sort yearMonth keys descending (newest month first)
      const sortedMonths = Object.keys(monthlyGroups).sort((a, b) => b.localeCompare(a));

      const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

      const records = sortedMonths.map((ym) => {
        const group = monthlyGroups[ym];
        const [yearStr, monthStr] = ym.split('-');
        const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
        const label = monthFormatter.format(dateObj);

        const income = Math.round(group.income * 100) / 100;
        const expense = Math.round(group.expense * 100) / 100;
        const net = Math.round((income - expense) * 100) / 100;
        const savingsRate = income > 0 ? Math.max(0, Math.round(((income - expense) / income) * 100)) : 0;

        // Sort transactions descending by date
        const sortedTxs = [...group.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Category breakdown
        const totalExp = expense > 0 ? expense : 1;
        const categoryBreakdown = Object.entries(group.categoryTotals).map(([cat, amt]) => ({
          category: cat,
          amount: Math.round(amt * 100) / 100,
          percentage: Math.round((amt / totalExp) * 100),
        })).sort((a, b) => b.amount - a.amount);

        return {
          yearMonth: ym,
          label,
          isCurrentMonth: ym === currentYearMonth,
          income,
          expense,
          net,
          savingsRate,
          transactionCount: group.transactions.length,
          transactions: sortedTxs,
          categoryBreakdown,
        };
      });

      res.json({
        currency: profile.displayCurrency,
        months: records,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch monthly history' });
    }
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

  app.post('/api/paystack/resolve-account', optionalAuthMiddleware, async (req: Request, res: Response) => {
    const { accountNumber, bankCode } = req.body;
    if (!accountNumber || !bankCode) {
      return res.status(400).json({ error: 'accountNumber and bankCode are required' });
    }
    try {
      const resolved = await paystackService.resolveAccount(accountNumber, bankCode);
      res.json(resolved);
    } catch (err: any) {
      res.status(422).json({ error: err.message || 'Could not resolve account name' });
    }
  });

  app.post('/api/paystack/recipient', optionalAuthMiddleware, async (req: Request, res: Response) => {
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

  app.get('/api/paystack/verify/:reference', optionalAuthMiddleware, async (req: Request, res: Response) => {
    const result = await paystackService.checkTransferStatus(req.params.reference);
    if (!result) return res.status(404).json({ error: 'Transfer reference not found' });
    res.json(result);
  });

  app.post('/api/paystack/initialize-deposit', optionalAuthMiddleware, async (req: any, res: Response) => {
    const { email, amount, currency, goalId, profileId, callbackUrl } = req.body;
    if (!amount || Number(amount) <= 0 || !goalId || !profileId) {
      return res.status(400).json({ error: 'amount, goalId, and profileId are required' });
    }

    const userEmail = email || req.user?.email || 'saver@ledgerapp.io';
    try {
      const initResult = await paystackService.initializeDeposit({
        email: userEmail,
        amount: Number(amount),
        currency: currency || 'GHS',
        goalId,
        profileId,
        callbackUrl,
      });
      res.json(initResult);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to initialize Paystack deposit' });
    }
  });

  app.get('/api/paystack/verify-deposit/:reference', optionalAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const result = await paystackService.verifyDeposit(req.params.reference);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Verification failed' });
    }
  });

  // ==========================================
  // AUDIT LOGS & SETTINGS
  // ==========================================

  app.get('/api/audit-logs', optionalAuthMiddleware, async (_req: Request, res: Response) => {
    const logs = await dbManager.getAuditLogs();
    res.json(logs);
  });

  app.get('/api/settings', async (req: Request, res: Response) => {
    const profiles = await dbManager.getProfiles();
    const profileId = (req.query.profileId as string) || profiles[0]?.id;
    const profile = (await dbManager.getProfile(profileId)) || profiles[0];
    const dbStatus = await dbManager.getDbStatus();
    res.json({
      profile,
      database: dbStatus,
      paystack: {
        isConfigured: paystackService.isKeyConfigured(),
        isLiveMode: paystackService.isLiveMode(),
        publicKey: process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxx',
      },
    });
  });

  app.get('/api/db/status', async (_req: Request, res: Response) => {
    const status = await dbManager.getDbStatus();
    res.json(status);
  });

  app.post('/api/db/clean-sample-data', authMiddleware, async (_req: Request, res: Response) => {
    const result = await dbManager.cleanSampleData();
    res.json({
      success: true,
      message: 'Sample records cleared successfully from MongoDB Atlas',
      deleted: result,
    });
  });

  app.post('/api/db/wipe-all', authMiddleware, async (req: Request, res: Response) => {
    const { keepProfiles } = req.body;
    await dbManager.wipeAllData(keepProfiles !== false);
    res.json({
      success: true,
      message: 'Financial records cleared. Database is now 100% fresh and empty.',
    });
  });

  app.post('/api/migrate', authMiddleware, async (req: Request, res: Response) => {
    const payload = req.body;
    if (payload && (payload.profiles || payload.data)) {
      if (payload.profiles) {
        await dbManager.replaceAll(payload);
      }
      return res.json({ success: true, message: 'Data imported/migrated successfully into MongoDB Atlas' });
    }
    res.status(400).json({ error: 'Invalid migration payload shape' });
  });

  app.get('/api/export-all', authMiddleware, async (_req: Request, res: Response) => {
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
  // GEMINI AI ADVISOR & RATE LIMITING
  // (40 messages per 8 hours, 4-hour cooldown lock)
  // ==========================================

  app.get('/api/ai/quota', optionalAuthMiddleware, (req: any, res: Response) => {
    const profileId = (req.query.profileId as string) || (req.headers['x-profile-id'] as string);
    const userId = req.user?.userId || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'default_user';
    const quotaKey = profileId ? `prof_${profileId}` : `usr_${userId}`;
    const quota = dbManager.getAIMessageQuota(quotaKey);
    res.json(quota);
  });

  app.post('/api/ai/chat', optionalAuthMiddleware, async (req: any, res: Response) => {
    try {
      const { messages, model, enableSearch, profileContext, profileId } = req.body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages array is required' });
      }

      // Check rate limit: 40 messages per 8 hours counted per profile
      const activeProfileId = profileId || profileContext?.profileId || (req.headers['x-profile-id'] as string);
      const userId = req.user?.userId || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'default_user';
      const quotaKey = activeProfileId ? `prof_${activeProfileId}` : `usr_${userId}`;
      const quotaCheck = dbManager.checkAndRecordAIMessage(quotaKey);

      if (!quotaCheck.allowed) {
        return res.status(429).json({
          error: 'AI_RATE_LIMIT_EXCEEDED',
          message: quotaCheck.quota.message || 'Profile limit reached (40 messages in 8 hours). AI assistant is cooling down.',
          quota: quotaCheck.quota,
        });
      }

      const chatResult = await chatFinancialAdvisor({
        messages,
        model,
        enableSearch: Boolean(enableSearch),
        profileContext,
      });

      res.json({
        ...chatResult,
        quota: quotaCheck.quota,
      });
    } catch (err: any) {
      console.error('[AI Chat Error]:', err);
      res.status(500).json({
        error: err.message || 'Failed to process AI conversation request',
      });
    }
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

  // Create unified HTTP Server to attach WebSocket for Gemini Live API
  const server = http.createServer(app);

  const liveWss = new WebSocketServer({ noServer: true });
  setupLiveWebSocket(liveWss);

  const activeWsConnections = new Map<string, number>();

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
    if (pathname === '/api/live' || pathname === '/live') {
      const clientIp = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || request.socket.remoteAddress || 'unknown';
      const currentActive = activeWsConnections.get(clientIp) || 0;

      // Rate limit concurrent Live Voice sessions per client IP to prevent quota drainage or memory attacks
      if (currentActive >= 4) {
        socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
        socket.destroy();
        return;
      }

      activeWsConnections.set(clientIp, currentActive + 1);

      liveWss.handleUpgrade(request, socket, head, (ws) => {
        ws.on('close', () => {
          const active = activeWsConnections.get(clientIp) || 1;
          if (active <= 1) {
            activeWsConnections.delete(clientIp);
          } else {
            activeWsConnections.set(clientIp, active - 1);
          }
        });
        liveWss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(` Ledger Financial Manager with Gemini AI & Live Audio`);
    console.log(` Running on: http://0.0.0.0:${PORT}`);
    console.log(` Live Audio WebSocket: ws://0.0.0.0:${PORT}/api/live`);
    console.log(`======================================================\n`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});
