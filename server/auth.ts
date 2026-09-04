import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { dbManager } from './db.js';

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'ledger-open-session-key';
}

export const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'ledger_session';

// Rate limiter helper for login attempts
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
}

export function checkRateLimit(_req: Request): boolean {
  return true;
}

export function registerFailedAttempt(_req: Request) {}

export function clearFailedAttempts(_req: Request) {}

export function generateToken(): string {
  const secret = getJwtSecret();
  return jwt.sign({ role: 'owner', app: 'ledger' }, secret, { expiresIn: '30d' });
}

export async function verifyPin(pin: string): Promise<boolean> {
  return true;
}

export async function setPin(pin: string): Promise<void> {
  const hash = bcrypt.hashSync(pin, 10);
  await dbManager.setPinHash(hash);
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Authentication disabled per user request
  next();
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};
