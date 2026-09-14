import React, { useState } from 'react';
import { KeyRound, Mail, ArrowRight, CheckCircle2, AlertCircle, X, Eye, EyeOff, MailCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIdentifier?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialIdentifier = '',
}) => {
  const { forgotPassword, resetPassword } = useAuth();

  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [targetEmail, setTargetEmail] = useState('');
  const [targetMaskedEmail, setTargetMaskedEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanInput = identifier.trim();
    if (!cleanInput) {
      setError('Please enter your registered email address or username.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await forgotPassword(cleanInput);
      setIsLoading(false);

      if (!res.success) {
        setError(res.error || 'Could not find an account with that email or username.');
        return;
      }

      const realEmail = res.email || cleanInput;
      const masked = res.maskedEmail || realEmail;
      setTargetEmail(realEmail);
      setTargetMaskedEmail(masked);
      setResetCode('');
      setSuccessMessage(
        res.message || 'A 6-digit verification code has been dispatched to your email address.'
      );
      setStep('verify');
    } catch {
      setIsLoading(false);
      setError('A network error occurred. Please try again.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = resetCode.trim();
    if (cleanCode.length < 6) {
      setError('Please enter the full 6-digit reset code.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your new password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPassword({
        email: targetEmail || identifier.trim(),
        identifier: identifier.trim(),
        code: cleanCode,
        newPassword,
      });

      setIsLoading(false);
      if (!res.success) {
        setError(res.error || 'Failed to reset password. Please check the code.');
        return;
      }

      setSuccessMessage('Password reset successfully! You are now logged in.');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch {
      setIsLoading(false);
      setError('A network error occurred. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-surface rounded-2xl border border-line p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sunken border border-line flex items-center justify-center text-ink shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="t-card">
                {step === 'request' ? 'Reset Account Password' : 'Enter Reset Code'}
              </h3>
              <p className="t-meta num mt-0.5">
                {step === 'request'
                  ? 'Identify your account to receive a security code'
                  : `Enter the 6-digit code for ${targetEmail}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg-iconbtn"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-neg-soft border border-neg-soft rounded-xl text-xs text-neg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1 font-medium">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 bg-pos-soft border border-pos-soft rounded-xl text-xs text-pos flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="flex-1 font-medium">{successMessage}</span>
          </div>
        )}

        {/* Email Dispatch Notice */}
        {step === 'verify' && (
          <div className="p-3.5 bg-sunken border border-line rounded-xl text-xs flex items-start gap-2.5">
            <MailCheck className="w-4 h-4 text-pos shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[11px] text-ink">
                Check Your Email Inbox
              </div>
              <div className="t-meta num mt-0.5">
                We sent a 6-digit verification code to <strong>{targetMaskedEmail || targetEmail}</strong>. Check your inbox and spam folder, then enter the code below.
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Enter Email or Username */}
        {step === 'request' && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="block t-eyebrow mb-1">
                Registered Email or Username <span className="text-neg">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. alex@example.com or alex_mensah"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-line bg-sunken text-ink focus:outline-none focus:border-accent"
                />
              </div>
              <p className="t-meta mt-1">
                Enter your account username or the email address you used during signup.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={onClose}
                className="lg-btn lg-btn-quiet lg-btn-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !identifier.trim()}
                className="lg-btn lg-btn-solid lg-btn-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Finding Account...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Enter Code & Set New Password */}
        {step === 'verify' && (
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            <div>
              <label className="block t-eyebrow mb-1">
                6-Digit Reset Code <span className="text-neg">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                className="w-full py-2.5 px-3 text-center num text-base tracking-widest font-bold rounded-xl border border-line bg-sunken text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block t-eyebrow mb-1">
                New Password <span className="text-neg">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-line bg-sunken text-ink focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block t-eyebrow mb-1">
                Confirm New Password <span className="text-neg">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-line bg-sunken text-ink focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink p-1 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => {
                  setStep('request');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="t-meta font-semibold hover:underline cursor-pointer"
              >
                Back to step 1
              </button>
              <button
                type="submit"
                disabled={isLoading || resetCode.length < 6 || newPassword.length < 6}
                className="lg-btn lg-btn-solid lg-btn-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    Set Password & Sign In
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
