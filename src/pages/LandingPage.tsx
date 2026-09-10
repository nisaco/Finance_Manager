import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { TermsModal } from '../components/TermsModal';
import { PrivacyModal } from '../components/PrivacyModal';
import { AuthTransitionOverlay } from '../components/AuthTransitionOverlay';
import {
  Shield,
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
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { login, register, sessionExpiredMessage, clearSessionExpiredMessage } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [authMode, setAuthMode] = useState<'signup' | 'login'>('login');

  // Signup fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!agreedToTerms) {
      setFormError('You cannot sign up without agreeing to the Terms & Conditions and Privacy Policy.');
      return;
    }

    if (!username.trim() || username.trim().length < 3) {
      setFormError('Username must be at least 3 characters.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setFormError('Please enter a valid email address for Paystack receipts and referencing.');
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
      // If success, keep isSubmitting true until unmount so the smooth auth transition stays fluid
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
      // If success, keep isSubmitting true until unmount so the smooth auth transition stays fluid
    } catch {
      setIsSubmitting(false);
      setFormError('Authentication failed. Please verify credentials and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-[#0F1115] text-[#1A1A1A] dark:text-[#F3F4F6] flex flex-col font-sans transition-colors selection:bg-[#1A1A1A] dark:selection:bg-[#F3F4F6] selection:text-[#FDFCFB] dark:selection:text-[#111317]">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E8E5DF] dark:border-[#2D323F] bg-[#FAF9F6]/90 dark:bg-[#111317]/90 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-[#1A1A1A] dark:bg-[#F3F4F6] text-[#FFFFFF] dark:text-[#111317] flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
              L
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-[#1A1A1A] dark:text-[#F3F4F6]">
                Ledger
              </div>
              <div className="text-[10px] uppercase font-mono tracking-widest text-[#6B7280] dark:text-[#9CA3AF]">
                Multi-User Financial Engine
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] hover:bg-[#F0EEE6] dark:hover:bg-[#1E2330] text-[#6B7280] dark:text-[#9CA3AF] transition-colors"
              title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                setAuthMode(authMode === 'signup' ? 'login' : 'signup');
                setFormError(null);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[#E8E5DF] dark:border-[#2D323F] hover:bg-[#F0EEE6] dark:hover:bg-[#1E2330] text-[#1A1A1A] dark:text-[#F3F4F6] transition-colors"
            >
              {authMode === 'signup' ? 'Sign In Instead' : 'Create Account'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Left Side: Product Intro & Value Proposition */}
        <div className="flex-1 space-y-6 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[#EFECE6] dark:bg-[#1C2230] text-[#4B5563] dark:text-[#9CA3AF] border border-[#E0DCD3] dark:border-[#2D3548]">
            <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
            Multi-User &amp; Multi-Profile Platform
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1A1A1A] dark:text-[#F3F4F6] leading-tight">
            Financial precision, multi-profile control, and integrated Paystack receipts.
          </h1>

          <p className="text-base text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
            Create an account to manage your finances across multiple distinct profiles: Personal, Business, Savings, and Family. Secure each profile with private PIN locks, track multi-currency balances, and link your email for verified Paystack transaction routing.
          </p>

          {/* Pillars List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="p-3.5 rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] bg-[#FFFFFF] dark:bg-[#151921] space-y-1.5 shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-[#EBF5FF] dark:bg-[#1E293B] text-[#2563EB] flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                Multi-User &amp; Profiles
              </h3>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] leading-4">
                Each registered user can spawn independent profiles with custom currencies and PIN protection.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] bg-[#FFFFFF] dark:bg-[#151921] space-y-1.5 shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-[#ECFDF5] dark:bg-[#064E3B]/30 text-[#10B981] flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                Seamless Payments &amp; Receipts
              </h3>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] leading-4">
                Automated bank transfers and savings deposits with automatic email receipts and payment reconciliation.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] bg-[#FFFFFF] dark:bg-[#151921] space-y-1.5 shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-[#F5F3FF] dark:bg-[#312E81]/30 text-[#8B5CF6] flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                Profile PIN Locking
              </h3>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] leading-4">
                Lock sensitive business or savings ledgers with bcrypt cryptographic verification.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] bg-[#FFFFFF] dark:bg-[#151921] space-y-1.5 shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-[#FFFBEB] dark:bg-[#78350F]/20 text-[#D97706] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                Real-Time Analytics
              </h3>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] leading-4">
                Live net worth, budget category tracking, debt payoff schedules, and CSV data exports.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form Card */}
        <div className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#151921] border border-[#E8E5DF] dark:border-[#2D323F] rounded-2xl shadow-xl p-6 sm:p-8 transition-colors">
          {/* Mode Switcher Tabs */}
          <div className="flex p-1 bg-[#F5F4F0] dark:bg-[#1B202C] rounded-xl mb-5">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setFormError(null);
                setFormSuccess(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                authMode === 'login'
                  ? 'bg-[#FFFFFF] dark:bg-[#252C3D] text-[#1A1A1A] dark:text-[#F3F4F6] shadow-sm'
                  : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6]'
              }`}
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
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                authMode === 'signup'
                  ? 'bg-[#FFFFFF] dark:bg-[#252C3D] text-[#1A1A1A] dark:text-[#F3F4F6] shadow-sm'
                  : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6]'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Session Expired Notice */}
          {sessionExpiredMessage && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs flex items-start justify-between space-x-2 animate-in fade-in">
              <div className="flex items-start space-x-2">
                <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-bold block">Session Expired</span>
                  <span>{sessionExpiredMessage}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={clearSessionExpiredMessage}
                className="p-1 text-amber-700 dark:text-amber-300 hover:opacity-75"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Form Header */}
          <div className="mb-5">
            <h2 className="text-xl font-bold text-[#1A1A1A] dark:text-[#F3F4F6] flex items-center gap-2">
              {authMode === 'signup' ? 'Create your user account' : 'Welcome back to Ledger'}
            </h2>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1">
              {authMode === 'signup'
                ? 'Sign up to manage multiple profiles, budgets, and automated financial records.'
                : 'Enter your credentials to access your financial profiles and transactions.'}
            </p>
          </div>

          {/* Success Banner */}
          {formSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-200 text-xs flex items-start space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div className="flex-1 font-medium">{formSuccess}</div>
            </div>
          )}

          {/* Error Banner */}
          {formError && (
            <div className="mb-4 p-3 rounded-xl bg-[#FEF2F2] dark:bg-[#450A0A]/40 border border-[#FCA5A5] dark:border-[#7F1D1D] text-[#B91C1C] dark:text-[#FCA5A5] text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{formError}</div>
            </div>
          )}

          {/* SIGNUP FORM */}
          {authMode === 'signup' ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] mb-1.5">
                  Username <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. alex_ledger"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-[#D1D5DB] dark:border-[#2D323F] bg-[#FAF9F6] dark:bg-[#1E2330] text-[#1A1A1A] dark:text-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] dark:focus:ring-[#F3F4F6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] mb-1.5">
                  Email Address (for Paystack referencing &amp; receipts) <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-[#D1D5DB] dark:border-[#2D323F] bg-[#FAF9F6] dark:bg-[#1E2330] text-[#1A1A1A] dark:text-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] dark:focus:ring-[#F3F4F6]"
                  />
                </div>
                <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] mt-1">
                  Paystack transfer receipts and webhook reconciliations will be routed here.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] mb-1.5">
                    Password <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-[#D1D5DB] dark:border-[#2D323F] bg-[#FAF9F6] dark:bg-[#1E2330] text-[#1A1A1A] dark:text-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] dark:focus:ring-[#F3F4F6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] mb-1.5">
                    Confirm Password <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-[#D1D5DB] dark:border-[#2D323F] bg-[#FAF9F6] dark:bg-[#1E2330] text-[#1A1A1A] dark:text-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] dark:focus:ring-[#F3F4F6]"
                    />
                  </div>
                </div>
              </div>

              {/* Mandatory Terms & Conditions + Privacy Policy Checkbox */}
              <div className="p-3.5 rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] bg-[#FAF9F6] dark:bg-[#181D27] space-y-2">
                <div className="flex items-start space-x-2.5">
                  <input
                    type="checkbox"
                    id="termsAgreementCheckbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-[#1A1A1A] dark:text-[#F3F4F6] rounded border-[#D1D5DB] dark:border-[#374151] focus:ring-[#1A1A1A] dark:focus:ring-[#F3F4F6] cursor-pointer"
                  />
                  <label
                    htmlFor="termsAgreementCheckbox"
                    className="text-xs leading-5 text-[#374151] dark:text-[#D1D5DB] cursor-pointer select-none"
                  >
                    I have read, understand, and agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTermsModal(true);
                      }}
                      className="font-semibold underline text-[#2563EB] hover:text-[#1D4ED8]"
                    >
                      Terms and Conditions
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPrivacyModal(true);
                      }}
                      className="font-semibold underline text-[#2563EB] hover:text-[#1D4ED8]"
                    >
                      Privacy Policy
                    </button>
                    .
                  </label>
                </div>
                {!agreedToTerms && (
                  <div className="text-[11px] text-[#DC2626] dark:text-[#EF4444] font-medium pl-6.5">
                    * Agreement is strictly mandatory to sign up and access the system.
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !agreedToTerms}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-[#FFFFFF] dark:text-[#111317] bg-[#1A1A1A] dark:bg-[#F3F4F6] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
              >
                {isSubmitting ? 'Creating User Account...' : 'Complete Sign Up & Enter'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] mb-1.5">
                  Username or Email <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Enter your username or email"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-[#D1D5DB] dark:border-[#2D323F] bg-[#FAF9F6] dark:bg-[#1E2330] text-[#1A1A1A] dark:text-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] dark:focus:ring-[#F3F4F6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] mb-1.5">
                  Password <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-[#D1D5DB] dark:border-[#2D323F] bg-[#FAF9F6] dark:bg-[#1E2330] text-[#1A1A1A] dark:text-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] dark:focus:ring-[#F3F4F6]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-[#FFFFFF] dark:text-[#111317] bg-[#1A1A1A] dark:bg-[#F3F4F6] hover:opacity-90 disabled:opacity-50 shadow-md transition-all mt-2 cursor-pointer"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In to Ledger'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-3 border-t border-[#E8E5DF] dark:border-[#2D323F] flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setFormError(null);
                    setFormSuccess(null);
                  }}
                  className="text-xs text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] underline cursor-pointer"
                >
                  Don&apos;t have an account yet? Sign up here
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8E5DF] dark:border-[#2D323F] bg-[#FAF9F6] dark:bg-[#111317] py-6 px-4 sm:px-6 lg:px-8 text-xs text-[#6B7280] dark:text-[#9CA3AF] transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            Ledger • Personal &amp; Business Financial Management
          </div>
          <div className="flex items-center space-x-5">
            <button
              onClick={() => setShowTermsModal(true)}
              className="hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] underline transition-colors"
            >
              Terms &amp; Conditions
            </button>
            <span>•</span>
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] underline transition-colors"
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

      {/* Animated iOS-Style Security Transition Loader */}
      {isSubmitting && (
        <AuthTransitionOverlay
          mode={authMode === 'login' ? 'login' : 'register'}
          usernameOrEmail={authMode === 'login' ? loginIdentifier : username}
        />
      )}
    </div>
  );
};
