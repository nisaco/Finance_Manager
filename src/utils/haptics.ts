/**
 * Tactile Haptic Feedback Utility
 * Delivers subtle, bank-grade tactile micro-vibrations on mobile touch devices
 * (PIN digit taps, successful transaction logs, and warnings).
 */

class HapticService {
  private hasSupport(): boolean {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function';
  }

  /**
   * Crisp, ultra-light micro-tap (e.g., keypad digit press, tab switch)
   */
  tap(): void {
    if (!this.hasSupport()) return;
    try {
      navigator.vibrate(10);
    } catch {}
  }

  /**
   * Positive double-pulse confirmation (e.g., transaction saved, biometrics unlocked)
   */
  success(): void {
    if (!this.hasSupport()) return;
    try {
      navigator.vibrate([15, 40, 20]);
    } catch {}
  }

  /**
   * Subtle alert pulse (e.g., 80% budget threshold reached, lockout countdown)
   */
  warning(): void {
    if (!this.hasSupport()) return;
    try {
      navigator.vibrate([30, 40, 30]);
    } catch {}
  }

  /**
   * Triple alert pulse (e.g., wrong PIN entered, transaction delete confirm)
   */
  error(): void {
    if (!this.hasSupport()) return;
    try {
      navigator.vibrate([30, 50, 30, 50, 40]);
    } catch {}
  }
}

export const haptic = new HapticService();

