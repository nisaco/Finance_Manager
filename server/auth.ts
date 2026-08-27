import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { dbManager } from './db.js';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error('JWT_SECRET environment variable is missing. Refusing to run with insecure default secret.');
  }
  return secret;
}

export const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'ledger_session';

// Rate limiter helper for login attempts
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
}

export function checkRateLimit(req: Request): boolean {
  const ip = getClientIp(req);
  const record = failedAttempts.get(ip);
  if (!record) return true;

  const now = Date.now();
  // Lockout for 5 minutes after 6 failed attempts
  if (record.count >= 6 && now - record.lastAttempt < 5 * 60 * 1000) {
    return false;
  }
  // Reset if expired
  if (now - record.lastAttempt >= 5 * 60 * 1000) {
    failedAttempts.delete(ip);
  }
  return true;
}

export function registerFailedAttempt(req: Request) {
  const ip = getClientIp(req);
  const record = failedAttempts.get(ip) || { count: 0, lastAttempt: Date.now() };
  record.count += 1;
  record.lastAttempt = Date.now();
  failedAttempts.set(ip, record);
}

export function clearFailedAttempts(req: Request) {
  const ip = getClientIp(req);
  failedAttempts.delete(ip);
}

export function generateToken(): string {
  const secret = getJwtSecret();
  return jwt.sign({ role: 'owner', app: 'ledger' }, secret, { expiresIn: '30d' });
}

export async function verifyPin(pin: string): Promise<boolean> {
  const storedHash = await dbManager.getPinHash();
  return bcrypt.compare(pin, storedHash);
}

export async function setPin(pin: string): Promise<void> {
  const hash = bcrypt.hashSync(pin, 10);
  await dbManager.setPinHash(hash);
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Allow login status, auth endpoints, Paystack webhook, and health check without token
  const openPaths = [
    '/api/auth/login',
    '/api/auth/status',
    '/api/paystack/webhook',
    '/api/health',
  ];

  if (openPaths.includes(req.path)) {
    return next();
  }

  const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Session missing or expired' });
    return;
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid session token' });
  }
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};
