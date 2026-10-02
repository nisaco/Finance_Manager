/**
 * Bank-Grade Session Lock & Timeout Configuration Service
 * Provides configurable auto-lock timeouts (Immediate, 1m, 5m, 15m, 30m, Never),
 * background privacy shield state, and in-app secure lock tracking.
 */

export type LockTimeoutOption = 'immediate' | '1min' | '5min' | '15min' | '30min' | 'never';

const LOCK_TIMEOUT_KEY = 'fimara_security_lock_timeout';
const PRIVACY_MASK_KEY = 'fimara_security_privacy_mask';
const APP_LOCKED_KEY = 'fimara_security_is_locked';
const LAST_ACTIVE_KEY = 'ledger_last_activity';

export const LOCK_TIMEOUT_OPTIONS: { id: LockTimeoutOption; label: string; description: string; ms: number }[] = [
  {
    id: 'immediate',
    label: 'Immediately',
    description: 'Locks as soon as you minimize or switch away from Fimara',
    ms: 0,
  },
  {
    id: '1min',
    label: '1 Minute',
    description: 'Locks after 1 minute of inactivity',
    ms: 60 * 1000,
  },
  {
    id: '5min',
    label: '5 Minutes (Default)',
    description: 'Standard banking timeout: locks after 5 minutes',
    ms: 5 * 60 * 1000,
  },
  {
    id: '15min',
    label: '15 Minutes',
    description: 'Locks after 15 minutes of inactivity',
    ms: 15 * 60 * 1000,
  },
  {
    id: '30min',
    label: '30 Minutes',
    description: 'Locks after 30 minutes of inactivity',
    ms: 30 * 60 * 1000,
  },
  {
    id: 'never',
    label: 'Never',
    description: 'Only locks when you explicitly sign out (Not recommended)',
    ms: Number.POSITIVE_INFINITY,
  },
];

export function getLockTimeout(): LockTimeoutOption {
  if (typeof window === 'undefined') return '5min';
  try {
    const stored = localStorage.getItem(LOCK_TIMEOUT_KEY);
    if (stored && ['immediate', '1min', '5min', '15min', '30min', 'never'].includes(stored)) {
      return stored as LockTimeoutOption;
    }
  } catch {}
  return '5min';
}

export function setLockTimeout(option: LockTimeoutOption): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCK_TIMEOUT_KEY, option);
  } catch {}
}

export function getLockTimeoutMs(option?: LockTimeoutOption): number {
  const opt = option || getLockTimeout();
  const found = LOCK_TIMEOUT_OPTIONS.find((o) => o.id === opt);
  return found ? found.ms : 5 * 60 * 1000;
}

export function isPrivacyShieldEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(PRIVACY_MASK_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setPrivacyShieldEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRIVACY_MASK_KEY, enabled ? 'true' : 'false');
  } catch {}
}

export function isAppLockActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(APP_LOCKED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAppLockActive(locked: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (locked) {
      localStorage.setItem(APP_LOCKED_KEY, 'true');
    } else {
      localStorage.removeItem(APP_LOCKED_KEY);
      // Refresh active activity timestamp on unlock
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    }
  } catch {}
}

