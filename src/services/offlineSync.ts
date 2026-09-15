import { Profile, Transaction, Budget, Goal, Debt, SummaryReport } from '../types';

export interface OfflineLedgerState {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  debts: Debt[];
  summary: SummaryReport | null;
  lastCachedAt: number;
}

export type OfflineActionType =
  | 'CREATE_TRANSACTION'
  | 'UPDATE_TRANSACTION'
  | 'DELETE_TRANSACTION';

export interface OfflineMutation {
  id: string; // Unique client mutation ID
  type: OfflineActionType;
  userId: string;
  profileId: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

const STORAGE_PREFIX = 'fimara_offline_';
const QUEUE_KEY = `${STORAGE_PREFIX}sync_queue`;
const PROFILES_KEY_PREFIX = `${STORAGE_PREFIX}profiles_`;
const DATA_KEY_PREFIX = `${STORAGE_PREFIX}data_`;

// Security validator to sanitize inputs before saving/queuing offline
function validateMutationPayload(type: OfflineActionType, payload: any): boolean {
  if (!payload || typeof payload !== 'object') return false;

  if (type === 'CREATE_TRANSACTION' || type === 'UPDATE_TRANSACTION') {
    const { amount, type: txType, category } = payload;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return false;
    if (txType !== 'income' && txType !== 'expense') return false;
    if (typeof category !== 'string' || category.trim().length === 0) return false;
  } else if (type === 'DELETE_TRANSACTION') {
    if (!payload.id || typeof payload.id !== 'string') return false;
  }

  return true;
}

// Dispatch custom event when sync queue changes so UI components update reactively
function notifyQueueChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fimara_offline_queue_updated'));
  }
}

/**
 * Persist cached profile list for authenticated user
 */
export function saveOfflineProfiles(userId: string, profiles: Profile[]): void {
  if (!userId || !Array.isArray(profiles)) return;
  try {
    localStorage.setItem(`${PROFILES_KEY_PREFIX}${userId}`, JSON.stringify(profiles));
  } catch (err) {
    console.warn('[OfflineSync] Failed to persist offline profiles:', err);
  }
}

/**
 * Load cached profiles for authenticated user
 */
export function loadOfflineProfiles(userId: string): Profile[] | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${PROFILES_KEY_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    console.warn('[OfflineSync] Failed to load offline profiles:', err);
    return null;
  }
}

/**
 * Persist profile-specific financial ledger state
 */
export function saveOfflineLedgerData(
  userId: string,
  profileId: string,
  data: {
    transactions: Transaction[];
    budgets: Budget[];
    goals: Goal[];
    debts: Debt[];
    summary: SummaryReport | null;
  }
): void {
  if (!userId || !profileId) return;
  try {
    const state: OfflineLedgerState = {
      transactions: data.transactions || [],
      budgets: data.budgets || [],
      goals: data.goals || [],
      debts: data.debts || [],
      summary: data.summary || null,
      lastCachedAt: Date.now(),
    };
    localStorage.setItem(`${DATA_KEY_PREFIX}${userId}_${profileId}`, JSON.stringify(state));
  } catch (err) {
    console.warn('[OfflineSync] Failed to cache profile ledger data:', err);
  }
}

/**
 * Load cached profile financial state
 */
export function loadOfflineLedgerData(userId: string, profileId: string): OfflineLedgerState | null {
  if (!userId || !profileId) return null;
  try {
    const raw = localStorage.getItem(`${DATA_KEY_PREFIX}${userId}_${profileId}`);
    if (!raw) return null;
    return JSON.parse(raw) as OfflineLedgerState;
  } catch (err) {
    console.warn('[OfflineSync] Failed to parse cached profile ledger data:', err);
    return null;
  }
}

/**
 * Get all pending sync actions for a user
 */
export function getPendingMutations(userId: string): OfflineMutation[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const all: OfflineMutation[] = JSON.parse(raw);
    return Array.isArray(all) ? all.filter((m) => m.userId === userId) : [];
  } catch {
    return [];
  }
}

/**
 * Queue a mutation to be synchronized once online
 */
export function queueOfflineMutation(
  userId: string,
  profileId: string,
  type: OfflineActionType,
  payload: any
): OfflineMutation | null {
  if (!userId || !profileId) {
    console.error('[OfflineSync] Cannot queue mutation without authenticated user & profile');
    return null;
  }

  if (!validateMutationPayload(type, payload)) {
    console.error('[OfflineSync] Rejected invalid mutation payload for security');
    return null;
  }

  const mutation: OfflineMutation = {
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    userId,
    profileId,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
  };

  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const queue: OfflineMutation[] = raw ? JSON.parse(raw) : [];
    // Enforce safety max queue limit (prevent local storage overflow)
    if (queue.length >= 200) {
      console.warn('[OfflineSync] Queue full, cannot add more offline mutations');
      return null;
    }
    queue.push(mutation);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    notifyQueueChange();
    return mutation;
  } catch (err) {
    console.error('[OfflineSync] Failed to store mutation in queue:', err);
    return null;
  }
}

/**
 * Drain and execute sync queue in order with provided executor
 */
export async function drainOfflineSyncQueue(
  userId: string,
  executor: (mutation: OfflineMutation) => Promise<boolean>
): Promise<{ success: number; failed: number }> {
  if (!userId) return { success: 0, failed: 0 };

  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return { success: 0, failed: 0 };

  let queue: OfflineMutation[];
  try {
    queue = JSON.parse(raw);
  } catch {
    localStorage.removeItem(QUEUE_KEY);
    return { success: 0, failed: 0 };
  }

  if (!Array.isArray(queue) || queue.length === 0) return { success: 0, failed: 0 };

  const userMutations = queue.filter((m) => m.userId === userId);
  const otherMutations = queue.filter((m) => m.userId !== userId);

  let success = 0;
  let failed = 0;
  const remainingUserMutations: OfflineMutation[] = [];

  for (const mutation of userMutations) {
    try {
      const ok = await executor(mutation);
      if (ok) {
        success++;
      } else {
        mutation.retryCount = (mutation.retryCount || 0) + 1;
        if (mutation.retryCount <= 3) {
          remainingUserMutations.push(mutation);
        } else {
          console.warn('[OfflineSync] Discarding mutation after 3 failed attempts:', mutation.id);
        }
        failed++;
      }
    } catch (err) {
      console.error('[OfflineSync] Error executing mutation:', err);
      mutation.retryCount = (mutation.retryCount || 0) + 1;
      if (mutation.retryCount <= 3) {
        remainingUserMutations.push(mutation);
      }
      failed++;
    }
  }

  const newQueue = [...otherMutations, ...remainingUserMutations];
  localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
  notifyQueueChange();

  return { success, failed };
}

