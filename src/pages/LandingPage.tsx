import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { TermsModal } from '../components/TermsModal';
import { PrivacyModal } from '../components/PrivacyModal';
import { ForgotPasswordModal } from '../components/Modals/ForgotPasswordModal';
import { AuthTransitionOverlay } from '../components/AuthTransitionOverlay';
import { LedgerLogo } from '../components/LedgerLogo';
import { api } from '../api/client';
import {
  Layers,
  ArrowRight,
  Lock,
  Mail,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  TrendingUp,
  Receipt,
  Sparkles,
  Clock,
  X,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  ArrowLeft,
  Wallet,
  Smartphone,
} from 'lucide-react';

declare global {
  interface Window {
    google?: any;
  }
}

export const LandingPage: React.FC = () => {
  const {
    login,
    register,
    loginWithGoogle,
    forgotPassword,
    resetPassword,
    sessionExpiredMessage,
    clearSessionExpiredMessage,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [authMode, setAuthMode] = useState<'signup' | 'login' | 'forgot_password'>('login');

  // Signup fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Forgot Password fields
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotTargetEmail, setForgotTargetEmail] = useState('');
  const [forgotTargetMaskedEmail, setForgotTargetMaskedEmail] = useState('');
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  // Google Identity Services (GSI) state
  const [googleClientId, setGoogleClientId] = useState<string>(
    '326677332678-ul6bsctqil1qos6fgnvph71qbas9u8jl.apps.googleusercontent.com'
  );
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const googleBtnLoginRef = useRef<HTMLDivElement>(null);
  const googleBtnSignupRef = useRef<HTMLDivElement>(null);

  // Google Sign-In & Username Selection Modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googleUsername, setGoogleUsername] = useState('');
  const [isGoogleProcessing, setIsGoogleProcessing] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Fetch OAuth client configuration on mount
  useEffect(() => {
    api
      .getAuthConfig()
      .then((cfg) => {
        if (cfg?.googleClientId) {
          setGoogleClientId(cfg.googleClientId);
        }
      })
      .catch(() => {});
  }, []);

  // Handle Google Credential Response
  const handleCredentialResponse = useCallback(
    async (response: any) => {
      if (!response?.credential) return;
      setIsGoogleProcessing(true);
      setFormError(null);
      try {
        const res = await loginWithGoogle({
          credential: response.credential,
        });
        if (!res.success) {
          setFormError(res.error || 'Google authentication failed');
          setIsGoogleProcessing(false);
        }
      } catch (err: any) {
        setFormError(err.message || 'Google authentication encountered an error');
        setIsGoogleProcessing(false);
      }
    },
    [loginWithGoogle]
  );

  // Initialize and render Google Identity Services buttons
  const renderGsiButtons = useCallback(() => {
    if (typeof window === 'undefined' || !window.google?.accounts?.id || !googleClientId) return;

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      setGsiLoaded(true);

      if (googleBtnSignupRef.current) {
        googleBtnSignupRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnSignupRef.current, {
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          type: 'standard',
          text: 'signup_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 320,
        });
      }

      if (googleBtnLoginRef.current) {
        googleBtnLoginRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnLoginRef.current, {
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          type: 'standard',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 320,
        });
      }
    } catch (err) {
      console.warn('Google Identity Services render warning:', err);
    }
  }, [googleClientId, theme, handleCredentialResponse]);

  useEffect(() => {
    if (window.google?.accounts?.id) {
      renderGsiButtons();
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(timer);
          renderGsiButtons();
        }
      }, 250);
      return () => clearInterval(timer);
    }
  }, [renderGsiButtons, authMode]);

  const handleTriggerGoogleAuth = () => {
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      try {
        const container =
          authMode === 'signup' ? googleBtnSignupRef.current : googleBtnLoginRef.current;
        const gsiBtn = container?.querySelector('div[role="button"]') as HTMLElement;
        if (gsiBtn) {
          gsiBtn.click();
          return;
        }

        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            handleOpenGoogleModal();
          }
        });
      } catch {
        handleOpenGoogleModal();
      }
    } else {
      handleOpenGoogleModal();
    }
  };

  const handleOpenGoogleModal = () => {
    setGoogleError(null);
    if (email && email.includes('@')) {
      setGoogleEmail(email);
      setGoogleUsername(username || email.split('@')[0]);
    } else if (loginIdentifier && loginIdentifier.includes('@')) {
      setGoogleEmail(loginIdentifier);
      setGoogleUsername(loginIdentifier.split('@')[0]);
    }
    setShowGoogleModal(true);
  };

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!googleEmail.trim() || !emailRegex.test(googleEmail.trim())) {
      setGoogleError('Please enter a valid Google email address.');
      return;
    }

    if (googleUsername && googleUsername.trim().length < 3) {
      setGoogleError('Username must be at least 3 characters.');
      return;
    }

    setIsGoogleProcessing(true);
    try {
      const res = await loginWithGoogle({
        email: googleEmail.trim(),
        name: googleName.trim() || googleEmail.split('@')[0],
        requestedUsername: googleUsername.trim(),
      });

      if (!res.success) {
        setIsGoogleProcessing(false);
        setGoogleError(res.error || 'Failed to authenticate with Google');
      } else {
        setShowGoogleModal(false);
      }
    } catch {
      setIsGoogleProcessing(false);
      setGoogleError('Failed to complete Google Sign-In. Please try again.');
    }
  };

  // Forgot password handlers
  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (!forgotIdentifier.trim()) {
      setForgotError('Please enter your email or username.');
      return;
    }

    setIsForgotSubmitting(true);
    try {
      const res = await forgotPassword(forgotIdentifier.trim());
      setIsForgotSubmitting(false);

      if (!res.success) {
        setForgotError(res.error || 'Failed to request password reset code');
        return;
      }

      const realEmail = res.email || forgotIdentifier.trim();
      const maskedDisplay = res.maskedEmail || realEmail;
      setForgotTargetEmail(realEmail);
      setForgotTargetMaskedEmail(maskedDisplay);
      setForgotCode('');
      setForgotStep('reset');
      setForgotSuccess(res.message || 'A 6-digit recovery code has been sent to your email.');
    } catch (err: any) {
      setIsForgotSubmitting(false);
      setForgotError(err.message || 'Error processing request');
    }
  };

  const handlePerformResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (!forgotCode.trim() || forgotCode.trim().length !== 6) {
      setForgotError('Please enter the 6-digit recovery code received in your email.');
      return;
    }

    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setForgotError('New password must be at least 6 characters.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setIsForgotSubmitting(true);
    try {
      const res = await resetPassword({
        email: forgotTargetEmail || forgotIdentifier.trim(),
        identifier: forgotIdentifier.trim(),
        code: forgotCode.trim(),
        newPassword: forgotNewPassword,
      });
      setIsForgotSubmitting(false);

      if (!res.success) {
        setForgotError(res.error || 'Failed to reset password');
        return;
      }

      setAuthMode('login');
      setLoginIdentifier(forgotTargetEmail || forgotIdentifier.trim());
      setLoginPassword('');
      setFormSuccess('Password updated successfully! Please sign in with your new password.');
      setFormError(null);
      setForgotStep('request');
      setForgotCode('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
    } catch (err: any) {
      setIsForgotSubmitting(false);
      setForgotError(err.message || 'Error resetting password');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!agreedToTerms) {
      setFormError('You must agree to the Terms & Conditions and Privacy Policy to proceed.');
      return;
    }

    if (!username.trim() || username.trim().length < 3) {
      setFormError('Username must be at least 3 characters.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const [result] = await Promise.all([
        register({
          username: username.trim(),
          email: email.trim(),
          password,
          agreedToTerms,
        }),
        new Promise((resolve) => setTimeout(resolve, 850)),
      ]);

      if (!result.success) {
        setIsSubmitting(false);
        setFormError(result.error || 'Failed to create account.');
      }
    } catch {
      setIsSubmitting(false);
      setFormError('Failed to create account. Please try again.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!loginIdentifier.trim()) {
      setFormError('Please enter your username or email.');
      return;
    }

    if (!loginPassword) {
      setFormError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const [result] = await Promise.all([
        login({
          usernameOrEmail: loginIdentifier.trim(),
          password: loginPassword,
        }),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);

      if (!result.success) {
        setIsSubmitting(false);
        setFormError(result.error || 'Invalid credentials. Please verify and try again.');
      }
    } catch {
      setIsSubmitting(false);
      setFormError('Authentication failed. Please verify credentials and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans transition-colors selection:bg-accent/20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-line bg-canvas/80 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-left">
            <LedgerLogo size={32} />
            <div>
              <span className="text-base font-bold tracking-tight text-ink font-display block leading-none">
                Fimara
              </span>
              <span className="text-[10px] uppercase font-mono-num tracking-widest text-ink-3">
                Financial Operating System
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="lg-iconbtn"
              title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-ink-3" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'signup' ? 'login' : 'signup');
                setFormError(null);
                setFormSuccess(null);
              }}
              className="lg-btn lg-btn-quiet text-xs font-semibold"
            >
              {authMode === 'signup' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero & Auth Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14 animate-in fade-in duration-200">
        {/* Left Side: Crisp Hero & Value Props */}
        <div className="flex-1 space-y-6 max-w-xl text-left">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-soft text-accent text-xs font-semibold border border-line">
            <Sparkles className="w-3.5 h-3.5" strokeWidth={1.8} />
            <span>Multi-Entity Financial Engine</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-ink leading-[1.12] font-display">
              Master your money with mathematical precision.
            </h1>
            <p className="text-sm sm:text-base text-ink-3 leading-relaxed">
              Separate personal and business cashflows, lock high-yield savings vaults with automatic 2% payouts, and track verified Paystack receipts.
            </p>
          </div>

          {/* Core Feature Grid - Crisp, no clutter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="lg-card lg-card-interactive p-3.5 space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
                <Layers className="w-4 h-4" strokeWidth={1.8} />
              </div>
              <h3 className="text-xs font-bold text-ink">Multi-Profile Ledger</h3>
              <p className="text-[11px] text-ink-3 leading-snug">
                Personal, Business &amp; Family profiles with individual PIN locks and multi-currency tracking.
              </p>
            </div>

            <div className="lg-card lg-card-interactive p-3.5 space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-pos-soft text-pos flex items-center justify-center">
                <Wallet className="w-4 h-4" strokeWidth={1.8} />
              </div>
              <h3 className="text-xs font-bold text-ink">Savings Vaults (T+1)</h3>
              <p className="text-[11px] text-ink-3 leading-snug">
                Lock target savings, earn growth, and receive next-working-day payouts directly to MoMo or Bank.
              </p>
            </div>

            <div className="lg-card lg-card-interactive p-3.5 space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-sunken text-ink flex items-center justify-center border border-line">
                <Receipt className="w-4 h-4" strokeWidth={1.8} />
              </div>
              <h3 className="text-xs font-bold text-ink">Paystack &amp; Receipts</h3>
              <p className="text-[11px] text-ink-3 leading-snug">
                Automated deposits via Mobile Money &amp; Card with verified instant email payment receipts.
              </p>
            </div>

            <div className="lg-card lg-card-interactive p-3.5 space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
                <TrendingUp className="w-4 h-4" strokeWidth={1.8} />
              </div>
              <h3 className="text-xs font-bold text-ink">Real-Time Analytics</h3>
              <p className="text-[11px] text-ink-3 leading-snug">
                Instant cashflow breakdowns, spending limits, monthly cycle resets, and Excel/PDF export.
              </p>
            </div>
          </div>

          {/* Quick Metrics Trust Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-ink-3 border-t border-line">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-pos" strokeWidth={1.8} />
              <span>Bank-Grade Encryption</span>
            </div>
            <span className="text-line-strong">•</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-accent" strokeWidth={1.8} />
              <span>GHS, USD, EUR, GBP &amp; NGN</span>
            </div>
            <span className="text-line-strong">•</span>
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-ink-3" strokeWidth={1.8} />
              <span>MTN, Telecel &amp; AT MoMo</span>
            </div>
          </div>
        </div>

        {/* Right Side: Sleek Auth Form */}
        <div className="w-full max-w-md lg-card p-6 sm:p-8 space-y-5 shadow-xl">
          {/* Auth Mode Segmented Control */}
          {authMode === 'forgot_password' ? (
            <div className="flex items-center justify-between p-1 bg-sunken rounded-xl border border-line">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setForgotError(null);
                  setForgotSuccess(null);
                  setFormError(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink-3 hover:text-ink transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span>Sign In</span>
              </button>
              <span className="px-3 py-1 text-[11px] font-bold text-ink bg-surface rounded-lg shadow-xs">
                Password Recovery
              </span>
            </div>
          ) : (
            <div className="lg-seg">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setFormError(null);
                  setFormSuccess(null);
                }}
                className={`lg-seg-btn ${authMode === 'login' ? 'active' : ''}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setFormError(null);
                  setFormSuccess(null);
                }}
                className={`lg-seg-btn ${authMode === 'signup' ? 'active' : ''}`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Session Notice */}
          {sessionExpiredMessage && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs flex items-start justify-between space-x-2">
              <div className="flex items-start space-x-2">
                <Clock className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.8} />
                <div>
                  <span className="font-bold block">Session Expired</span>
                  <span>{sessionExpiredMessage}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={clearSessionExpiredMessage}
                className="p-1 hover:opacity-75"
                aria-label="Clear notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Success Banner */}
          {formSuccess && (
            <div className="p-3 rounded-xl bg-pos-soft border border-line text-pos text-xs flex items-start space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.8} />
              <div className="flex-1 font-medium">{formSuccess}</div>
            </div>
          )}

          {/* Error Banner */}
          {formError && (
            <div className="p-3 rounded-xl bg-neg-soft border border-line text-neg text-xs flex items-start space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.8} />
              <div className="flex-1 font-medium">{formError}</div>
            </div>
          )}

          {/* FORGOT PASSWORD FORM */}
          {authMode === 'forgot_password' ? (
            <div className="space-y-4">
              {forgotSuccess && (
                <div className="p-3 rounded-xl bg-pos-soft border border-line text-pos text-xs flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.8} />
                  <div className="flex-1 font-medium">{forgotSuccess}</div>
                </div>
              )}
              {forgotError && (
                <div className="p-3 rounded-xl bg-neg-soft border border-line text-neg text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.8} />
                  <div className="flex-1 font-medium">{forgotError}</div>
                </div>
              )}

              {forgotStep === 'request' ? (
                <form onSubmit={handleRequestResetCode} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Account Email or Username
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                      <input
                        type="text"
                        required
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="Enter email or username"
                        className="lg-input pl-9 text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isForgotSubmitting}
                    className="w-full lg-btn lg-btn-solid text-xs py-2.5 flex items-center justify-center gap-2"
                  >
                    {isForgotSubmitting ? 'Sending Code...' : 'Send Recovery Code'}
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </button>
                </form>
              ) : (
                <form onSubmit={handlePerformResetPassword} className="space-y-3.5">
                  <div className="p-2.5 rounded-xl bg-sunken border border-line text-[11px] text-ink-3">
                    Code sent to: <strong className="text-ink font-mono-num">{forgotTargetMaskedEmail}</strong>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      6-Digit Code
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={forgotCode}
                        onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="lg-input pl-9 text-xs font-mono-num text-center tracking-widest font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="lg-input pl-9 pr-9 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                      >
                        {showForgotNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                      <input
                        type={showForgotConfirmPassword ? 'text' : 'password'}
                        required
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="lg-input pl-9 pr-9 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                      >
                        {showForgotConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep('request');
                        setForgotError(null);
                        setForgotSuccess(null);
                      }}
                      className="text-xs text-ink-3 hover:underline"
                    >
                      Resend code
                    </button>
                    <button
                      type="submit"
                      disabled={isForgotSubmitting || forgotCode.length !== 6 || forgotNewPassword.length < 6}
                      className="lg-btn lg-btn-solid text-xs py-2 px-4 flex items-center gap-1.5"
                    >
                      {isForgotSubmitting ? 'Updating...' : 'Set Password'}
                      <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : authMode === 'signup' ? (
            /* SIGNUP FORM */
            <form onSubmit={handleSignup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Username <span className="text-neg">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. alex_ledger"
                    className="lg-input pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Email Address <span className="text-neg">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="lg-input pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Password <span className="text-neg">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="lg-input pl-9 pr-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Confirm Password <span className="text-neg">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="lg-input pl-9 pr-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-start space-x-2 text-xs text-ink-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 rounded border-line text-accent focus:ring-accent"
                  />
                  <span className="leading-snug">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-accent underline font-semibold"
                    >
                      Terms
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={() => setShowPrivacyModal(true)}
                      className="text-accent underline font-semibold"
                    >
                      Privacy Policy
                    </button>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !agreedToTerms}
                className="w-full lg-btn lg-btn-solid text-xs py-2.5 flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? 'Creating Account...' : 'Get Started'}
                <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
              </button>

              {/* Social Login Separator */}
              <div className="relative my-2 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-line"></div>
                </div>
                <span className="relative bg-surface px-2.5 text-[10px] font-medium text-ink-3 uppercase tracking-wider font-mono-num">
                  or sign up with
                </span>
              </div>

              {/* Google Sign-in */}
              <div className="w-full flex flex-col items-center">
                <div ref={googleBtnSignupRef} className="w-full flex justify-center min-h-[40px]" />
                {!gsiLoaded && (
                  <button
                    type="button"
                    onClick={handleTriggerGoogleAuth}
                    className="w-full lg-btn lg-btn-quiet text-xs py-2 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Google</span>
                  </button>
                )}
              </div>
            </form>
          ) : (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Username or Email <span className="text-neg">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Enter username or email"
                    className="lg-input pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-ink">
                    Password <span className="text-neg">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotIdentifier(loginIdentifier);
                      setAuthMode('forgot_password');
                      setFormError(null);
                      setFormSuccess(null);
                      setForgotError(null);
                      setForgotSuccess(null);
                    }}
                    className="text-[11px] font-semibold text-accent hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="lg-input pl-9 pr-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                    title={showLoginPassword ? 'Hide password' : 'View password'}
                  >
                    {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full lg-btn lg-btn-solid text-xs py-2.5 flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In to Ledger'}
                <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
              </button>

              {/* Social Login Separator */}
              <div className="relative my-2 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-line"></div>
                </div>
                <span className="relative bg-surface px-2.5 text-[10px] font-medium text-ink-3 uppercase tracking-wider font-mono-num">
                  or sign in with
                </span>
              </div>

              {/* Google Sign-in */}
              <div className="w-full flex flex-col items-center">
                <div ref={googleBtnLoginRef} className="w-full flex justify-center min-h-[40px]" />
                {!gsiLoaded && (
                  <button
                    type="button"
                    onClick={handleTriggerGoogleAuth}
                    className="w-full lg-btn lg-btn-quiet text-xs py-2 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Google</span>
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-surface py-5 px-4 sm:px-6 lg:px-8 text-xs text-ink-3 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <LedgerLogo size={18} />
            <span className="font-medium text-ink">Ledger</span>
            <span>• Multi-Entity Financial Management</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="hover:text-ink underline transition-colors"
            >
              Terms of Service
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="hover:text-ink underline transition-colors"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </footer>

      {/* Legal Modals */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setAgreedToTerms(true)}
        isAccepted={agreedToTerms}
      />
      <PrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onAccept={() => setAgreedToTerms(true)}
        isAccepted={agreedToTerms}
      />
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        initialIdentifier={loginIdentifier}
      />

      {/* Google Sign-in & Custom Username Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md lg-card p-6 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setShowGoogleModal(false);
                setGoogleError(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-ink-3 hover:text-ink"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-sunken border border-line flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">
                  Continue with Google
                </h3>
                <p className="text-xs text-ink-3">
                  Sign in or create your Ledger account
                </p>
              </div>
            </div>

            {googleError && (
              <div className="mb-3.5 p-3 rounded-xl bg-neg-soft border border-line text-neg text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{googleError}</div>
              </div>
            )}

            <form onSubmit={handleGoogleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Google Account Email <span className="text-neg">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="user@gmail.com"
                    className="lg-input pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Your Name (Optional)
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    placeholder="e.g. Alex Pappoe"
                    className="lg-input pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Choose Username
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-3">
                    @
                  </span>
                  <input
                    type="text"
                    value={googleUsername}
                    onChange={(e) => setGoogleUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="my_username"
                    className="lg-input pl-8 text-xs font-mono-num"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="lg-btn lg-btn-quiet text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGoogleProcessing || !googleEmail.trim()}
                  className="lg-btn lg-btn-solid text-xs flex items-center gap-1.5"
                >
                  {isGoogleProcessing ? 'Authenticating...' : 'Sign In with Google'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security Transition Loader */}
      {isSubmitting && (
        <AuthTransitionOverlay
          mode={authMode === 'login' ? 'login' : 'register'}
          usernameOrEmail={authMode === 'login' ? loginIdentifier : username}
        />
      )}
    </div>
  );
};
