import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { dbManager } from './db.js';

let runtimeSecret: string | null = null;

export function getJwtSecret(): string {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== '') {
    return process.env.JWT_SECRET;
  }
  if (!runtimeSecret) {
    runtimeSecret = crypto.randomBytes(32).toString('hex');
    console.warn('[SECURITY] JWT_SECRET environment variable not provided. Generated a secure ephemeral 256-bit runtime secret.');
  }
  return runtimeSecret;
}

export const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'ledger_session';

export interface AuthTokenPayload {
  userId: string;
  username: string;
  email: string;
  role?: 'admin' | 'user';
}

export function generateToken(payload: AuthTokenPayload): string {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, { expiresIn: '30d' });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as AuthTokenPayload;
    if (decoded && decoded.userId) {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

export function extractToken(req: Request): string | null {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export async function authMiddleware(req: any, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  // Fetch full normalized user to always have up-to-date role
  const user = await dbManager.findUserById(payload.userId);
  if (user) {
    req.user = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  } else {
    req.user = payload;
  }
  next();
}

export async function adminMiddleware(req: any, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in as an administrator.' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  const user = await dbManager.findUserById(payload.userId);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied: Admin "God Mode" privileges required.' });
    return;
  }

  req.user = user;
  next();
}

export function optionalAuthMiddleware(req: any, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}

export async function verifyPin(pin: string): Promise<boolean> {
  return true;
}

export async function setPin(pin: string): Promise<void> {
  const hash = bcrypt.hashSync(pin, 10);
  await dbManager.setPinHash(hash);
}

const failedAttemptsMap = new Map<string, { count: number; lockedUntil: number }>();

export function checkRateLimit(key: string, maxAttempts = 5, lockDurationMs = 15 * 60 * 1000): { allowed: boolean; remainingMs?: number } {
  const record = failedAttemptsMap.get(key);
  if (!record) return { allowed: true };
  const now = Date.now();
  if (record.lockedUntil > now) {
    return { allowed: false, remainingMs: record.lockedUntil - now };
  }
  if (record.count >= maxAttempts) {
    record.lockedUntil = now + lockDurationMs;
    return { allowed: false, remainingMs: lockDurationMs };
  }
  return { allowed: true };
}

export function registerFailedAttempt(key: string, maxAttempts = 5, lockDurationMs = 15 * 60 * 1000): void {
  const now = Date.now();
  const record = failedAttemptsMap.get(key) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= maxAttempts) {
    record.lockedUntil = now + lockDurationMs;
  }
  failedAttemptsMap.set(key, record);
}

export function clearFailedAttempts(key: string): void {
  failedAttemptsMap.delete(key);
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};
