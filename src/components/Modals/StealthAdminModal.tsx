import React, { useState } from 'react';
import { Shield, Key, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLedger } from '../../context/LedgerContext';

interface StealthAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StealthAdminModal: React.FC<StealthAdminModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { adminLogin } = useAuth();
  const { notify } = useLedger();
  const [secretKey, setSecretKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKey.trim()) {
      setError('Please enter the Admin Secret Key.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await adminLogin(secretKey.trim());
      if (res.success) {
        notify('Stealth Admin clearance verified. Administrative privileges unlocked.', 'info');
        setSecretKey('');
        onClose();
        onSuccess();
      } else {
        setError(res.error || 'Authentication failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid admin secret key. Access denied.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-surface text-ink rounded-2xl border border-line shadow-2xl p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="lg-iconbtn absolute top-4 right-4"
          aria-label="Close stealth dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-solid text-on-solid flex items-center justify-center shadow-xs">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="t-card">Stealth Security Clearance</h2>
              <span className="text-[10px] num font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-warn border border-warn/30">
                5-Tap Auth
              </span>
            </div>
            <p className="t-meta mt-0.5">Owner &amp; Admin Master Verification</p>
          </div>
        </div>

        <p className="t-meta leading-relaxed mb-4 bg-sunken p-3.5 rounded-xl border border-line">
          Enter the <code className="text-ink font-bold num">ADMIN_SECRET_KEY</code> defined in your platform environment to instantly unlock the Admin Portal and elevate your session.
        </p>

        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neg-soft border border-neg-soft text-neg text-xs mb-4">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block t-eyebrow flex items-center justify-between">
              <span>Admin Secret Key</span>
              <span className="t-meta num">Confidential</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-3">
                <Key className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Enter ADMIN_SECRET_KEY..."
                autoFocus
                className="w-full pl-9 pr-10 py-2.5 bg-sunken border border-line rounded-xl text-xs num text-ink placeholder-ink-3 focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-3 hover:text-ink transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="lg-btn lg-btn-quiet lg-btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !secretKey.trim()}
              className="lg-btn lg-btn-solid lg-btn-sm disabled:opacity-40 flex items-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Unlock Admin Portal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
