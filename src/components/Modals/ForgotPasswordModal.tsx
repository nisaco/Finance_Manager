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
      <div className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#181D27] rounded-2xl border border-[#E8E5DF] dark:border-[#2D323F] p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E5DF] dark:border-[#2D323F] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                {step === 'request' ? 'Reset Account Password' : 'Enter Reset Code'}
              </h3>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                {step === 'request'
                  ? 'Identify your account to receive a security code'
                  : `Enter the 6-digit code for ${targetEmail}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] hover:bg-[#F3F4F6] dark:hover:bg-[#222836] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1 font-medium">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="flex-1 font-medium">{successMessage}</span>
          </div>
        )}

        {/* Email Dispatch Notice */}
        {step === 'verify' && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
            <MailCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[11px] text-emerald-800 dark:text-emerald-200">
                Check Your Email Inbox
              </div>
              <div className="text-[11px] text-emerald-700/90 dark:text-emerald-300/80 mt-0.5">
                We sent a 6-digit verification code to <strong>{targetMaskedEmail || targetEmail}</strong>. Check your inbox and spam folder, then enter the code below.
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Enter Email or Username */}
        {step === 'request' && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A] dark:text-[#F3F4F6] mb-1">
                Registered Email or Username <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. alex@example.com or alex_mensah"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#D1D5DB] dark:border-[#2D323F] bg-[#FAF9F6] dark:bg-[#1E2330] text-[#1A1A1A] dark:text-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] mt-1">
                Enter your account username or the email address you used during signup.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E8E5DF] dark:border-[#2D323F]">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#222836] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !identifier.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition-all cursor-pointer"
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
              <label className="block text-xs font-semibold text-[#1A1A1A] dark:text-[#F3F4F6] mb-1">
                6-Digit Reset Code <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                className="w-full py-2.5 px-3 text-center font-mono text-base tracking-widest font-bold rounded-xl border border-[#D1D5DB] dark:border-[#2D323F] bg-[#FAF9F6] dark:bg-[#1E2330] text-[#1A1A1A] dark:text-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A] dark:text-[#F3F4F6] mb-1">
                New Password <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-[#D1D5DB] dark:border-[#2D323F] bg-[#FAF9F6] dark:bg-[#1E2330] text-[#1A1A1A] dark:text-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563] dark:hover:text-[#D1D5DB] p-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A] dark:text-[#F3F4F6] mb-1">
                Confirm New Password <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-[#D1D5DB] dark:border-[#2D323F] bg-[#FAF9F6] dark:bg-[#1E2330] text-[#1A1A1A] dark:text-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563] dark:hover:text-[#D1D5DB] p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#E8E5DF] dark:border-[#2D323F]">
              <button
                type="button"
                onClick={() => {
                  setStep('request');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] hover:underline cursor-pointer"
              >
                Back to step 1
              </button>
              <button
                type="submit"
                disabled={isLoading || resetCode.length < 6 || newPassword.length < 6}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition-all cursor-pointer"
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
