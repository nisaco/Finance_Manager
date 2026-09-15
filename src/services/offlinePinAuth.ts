/**
 * Secure client-side offline PIN hashing and verification engine.
 * Uses Web Crypto API (SHA-256) with user-scoped salting and brute-force lockout protection.
 */

const PIN_KEY_PREFIX = 'fimara_offline_pin_';
const ATTEMPTS_KEY_PREFIX = 'fimara_offline_attempts_';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15-minute brute-force cooldown

/**
 * Hash a 4-digit PIN with a user-scoped salt using browser Web Crypto SHA-256
 */
export async function hashOfflinePin(userId: string, pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = `fimara_salt_${userId}_offline_v1`;
  const data = encoder.encode(`${salt}:${pin.trim()}`);
  
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback djb2-derived hex hash in non-standard environments
  let hash = 5381;
  const str = `${salt}:${pin.trim()}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Save user's hashed offline PIN locally on this device
 */
export async function saveOfflinePin(userId: string, pin: string): Promise<string> {
  if (!userId || !pin || pin.trim().length < 4) {
    throw new Error('PIN must be at least 4 digits');
  }
  const hash = await hashOfflinePin(userId, pin.trim());
  try {
    localStorage.setItem(`${PIN_KEY_PREFIX}${userId}`, hash);
    // Clear any previous lockout status
    localStorage.removeItem(`${ATTEMPTS_KEY_PREFIX}${userId}`);
  } catch (err) {
    console.warn('[OfflinePin] Failed to save offline PIN hash:', err);
  }
  return hash;
}

/**
 * Check if the user has an offline PIN configured on this device
 */
export function hasOfflinePin(userId: string): boolean {
  if (!userId) return false;
  try {
    const hash = localStorage.getItem(`${PIN_KEY_PREFIX}${userId}`);
    return Boolean(hash && hash.length > 0);
  } catch {
    return false;
  }
}

/**
 * Check brute-force lockout status
 */
export function getOfflineLockoutStatus(userId: string): {
  isLocked: boolean;
  lockRemainingMinutes: number;
  failedAttempts: number;
} {
  if (!userId) return { isLocked: false, lockRemainingMinutes: 0, failedAttempts: 0 };
  try {
    const raw = localStorage.getItem(`${ATTEMPTS_KEY_PREFIX}${userId}`);
    if (!raw) return { isLocked: false, lockRemainingMinutes: 0, failedAttempts: 0 };
    
    const { count, lockedUntil } = JSON.parse(raw);
    const now = Date.now();

    if (lockedUntil && now < lockedUntil) {
      const remainingMs = lockedUntil - now;
      return {
        isLocked: true,
        lockRemainingMinutes: Math.ceil(remainingMs / (60 * 1000)),
        failedAttempts: count || MAX_ATTEMPTS,
      };
    }

    // Cooldown expired
    if (lockedUntil && now >= lockedUntil) {
      localStorage.removeItem(`${ATTEMPTS_KEY_PREFIX}${userId}`);
      return { isLocked: false, lockRemainingMinutes: 0, failedAttempts: 0 };
    }

    return {
      isLocked: false,
      lockRemainingMinutes: 0,
      failedAttempts: count || 0,
    };
  } catch {
    return { isLocked: false, lockRemainingMinutes: 0, failedAttempts: 0 };
  }
}

/**
 * Verify entered 4-digit PIN against stored hash with attack protection
 */
export async function verifyOfflinePin(
  userId: string,
  enteredPin: string
): Promise<{
  success: boolean;
  error?: string;
  remainingAttempts?: number;
}> {
  if (!userId) {
    return { success: false, error: 'User identifier required' };
  }

  // 1. Check brute-force lockout
  const lockout = getOfflineLockoutStatus(userId);
  if (lockout.isLocked) {
    return {
      success: false,
      error: `Too many incorrect attempts. Screen locked for ${lockout.lockRemainingMinutes} more minute${
        lockout.lockRemainingMinutes === 1 ? '' : 's'
      }.`,
    };
  }

  // 2. Fetch stored hash
  const storedHash = localStorage.getItem(`${PIN_KEY_PREFIX}${userId}`);
  if (!storedHash) {
    return {
      success: false,
      error: 'No offline PIN configured on this device. Please connect to internet to sign in.',
    };
  }

  // 3. Compute hash and compare
  const enteredHash = await hashOfflinePin(userId, enteredPin.trim());

  if (enteredHash === storedHash) {
    // Reset failed counter
    localStorage.removeItem(`${ATTEMPTS_KEY_PREFIX}${userId}`);
    return { success: true };
  }

  // Failed attempt: increment counter
  const newCount = lockout.failedAttempts + 1;
  const isNowLocked = newCount >= MAX_ATTEMPTS;
  const lockedUntil = isNowLocked ? Date.now() + LOCKOUT_MS : undefined;

  localStorage.setItem(
    `${ATTEMPTS_KEY_PREFIX}${userId}`,
    JSON.stringify({ count: newCount, lockedUntil })
  );

  if (isNowLocked) {
    return {
      success: false,
      error: `5 incorrect PIN attempts. Screen locked for 15 minutes to protect your financial data.`,
      remainingAttempts: 0,
    };
  }

  return {
    success: false,
    error: `Incorrect PIN. ${MAX_ATTEMPTS - newCount} attempt${
      MAX_ATTEMPTS - newCount === 1 ? '' : 's'
    } remaining.`,
    remainingAttempts: MAX_ATTEMPTS - newCount,
  };
}

