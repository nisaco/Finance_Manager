/**
 * WebAuthn Platform Biometrics Service (Fingerprint, Face ID, Windows Hello, Touch ID)
 * Provides instant biometric unlock for offline/online sessions without third-party dependencies.
 */

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

const BIOMETRICS_PREFIX = 'fimara_biometric_cred_';
const LAST_BIOMETRIC_USER_KEY = 'fimara_last_biometric_user';

export async function isBiometricsSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return false;
  }
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return false;
  } catch {
    return false;
  }
}

export function isBiometricsConfigured(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem(`${BIOMETRICS_PREFIX}${userId}`));
}

export function getLastBiometricUser(): { id: string; username: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_BIOMETRIC_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function registerBiometrics(userId: string, username: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supported = await isBiometricsSupported();
    if (!supported) {
      return { success: false, error: 'Platform biometrics (Fingerprint/Face ID) are not supported on this device.' };
    }

    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const userIdBuffer = new TextEncoder().encode(userId);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Fimara Ledger',
          id: window.location.hostname || undefined,
        },
        user: {
          id: userIdBuffer,
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: 'Biometric registration was cancelled.' };
    }

    const credIdBase64 = bufferToBase64(credential.rawId);
    localStorage.setItem(`${BIOMETRICS_PREFIX}${userId}`, credIdBase64);
    localStorage.setItem(LAST_BIOMETRIC_USER_KEY, JSON.stringify({ id: userId, username }));

    return { success: true };
  } catch (err: any) {
    console.error('[Biometrics] Registration error:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Biometric prompt was dismissed or timed out.' };
    }
    return { success: false, error: err.message || 'Failed to setup biometrics.' };
  }
}

export async function verifyBiometrics(userId?: string): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const supported = await isBiometricsSupported();
    if (!supported) {
      return { success: false, error: 'Biometric authentication is not supported on this device.' };
    }

    let targetUserId = userId;
    if (!targetUserId) {
      const last = getLastBiometricUser();
      if (last) targetUserId = last.id;
    }

    let credIdBuffer: ArrayBuffer | undefined;
    if (targetUserId) {
      const stored = localStorage.getItem(`${BIOMETRICS_PREFIX}${targetUserId}`);
      if (stored) {
        credIdBuffer = base64ToBuffer(stored);
      }
    }

    const challenge = window.crypto.getRandomValues(new Uint8Array(32));

    const options: CredentialRequestOptions = {
      publicKey: {
        challenge,
        rpId: window.location.hostname || undefined,
        allowCredentials: credIdBuffer
          ? [
              {
                id: credIdBuffer,
                type: 'public-key',
                transports: ['internal'],
              },
            ]
          : undefined,
        userVerification: 'required',
        timeout: 60000,
      },
    };

    const assertion = await navigator.credentials.get(options);
    if (!assertion) {
      return { success: false, error: 'Biometric authentication was cancelled.' };
    }

    return { success: true, userId: targetUserId };
  } catch (err: any) {
    console.error('[Biometrics] Verification error:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Biometric scan was canceled or not recognized.' };
    }
    return { success: false, error: err.message || 'Biometric verification failed.' };
  }
}

export function disableBiometrics(userId: string): void {
  try {
    localStorage.removeItem(`${BIOMETRICS_PREFIX}${userId}`);
    const last = getLastBiometricUser();
    if (last && last.id === userId) {
      localStorage.removeItem(LAST_BIOMETRIC_USER_KEY);
    }
  } catch {}
}

