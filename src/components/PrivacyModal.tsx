import React from 'react';
import { X, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  isAccepted?: boolean;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  isAccepted = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-[#FFFFFF] dark:bg-[#151921] border border-[#E8E5DF] dark:border-[#2D323F] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden transition-colors"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E5DF] dark:border-[#2D323F]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F5F4F0] dark:bg-[#1E2330] flex items-center justify-center text-[#1A1A1A] dark:text-[#F3F4F6]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                Privacy Policy
              </h2>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                Data Protection &amp; Confidentiality Standards • Fimara
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#1A1A1A] dark:text-[#9CA3AF] dark:hover:text-[#F3F4F6] hover:bg-[#F5F4F0] dark:hover:bg-[#1E2330] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm text-[#374151] dark:text-[#D1D5DB] leading-relaxed">
          <section className="space-y-2">
            <h3 className="font-semibold text-[#1A1A1A] dark:text-[#F3F4F6] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" /> 1. Information We Collect
            </h3>
            <p className="text-xs leading-5">
              When creating an account on Fimara, we collect your chosen username, email address, cryptographically salted password hash, and the exact timestamp of your legal terms acceptance. When you track finances, your profile configurations, financial records, budget allocations, savings goals, and debts are stored securely in dedicated, isolated collections.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">
              2. Purpose of Email Collection &amp; Paystack Integration
            </h3>
            <p className="text-xs leading-5">
              Your email is specifically designated for:
            </p>
            <ul className="list-disc pl-5 text-xs space-y-1">
              <li>Providing transaction references and instant electronic payment receipts for Paystack transactions.</li>
              <li>Account security verification, password recovery, and critical security notices.</li>
              <li>Audit log transparency and settlement reconciliations.</li>
            </ul>
            <p className="text-xs leading-5 mt-1">
              We never sell, rent, or lease your email address or financial records to third-party advertisers.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">
              3. Data Security &amp; Cryptographic Hashing
            </h3>
            <p className="text-xs leading-5">
              Passwords and profile PINs are never stored in plaintext; they are secured using industry-standard bcrypt hashing algorithms. Sensitive session credentials are transmitted exclusively over encrypted HTTPS/TLS channels with HTTP-only cookies and Bearer tokens.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">
              4. Multi-Profile Isolation
            </h3>
            <p className="text-xs leading-5">
              Each user’s workspace strictly isolates profiles and monetary records from other registered users. Within your account, profile locking adds a zero-knowledge PIN layer to safeguard discrete budgets or business ledgers from unauthorized casual viewing.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">
              5. Data Retention &amp; User Rights
            </h3>
            <p className="text-xs leading-5">
              You retain full ownership of your financial data. You may export your transaction ledgers in standardized CSV formats at any time, edit profiles, lock sensitive categories, or delete records directly through your dashboard.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E8E5DF] dark:border-[#2D323F] bg-[#FAF9F6] dark:bg-[#111317]">
          <div className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Strict privacy and end-to-end data isolation.
          </div>
          <div className="flex items-center space-x-2">
            {onAccept && !isAccepted && (
              <button
                type="button"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#1A1A1A] dark:bg-[#F3F4F6] text-[#FFFFFF] dark:text-[#111317] hover:opacity-90 transition-opacity"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Agree &amp; Confirm
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-[#D1D5DB] dark:border-[#374151] text-[#374151] dark:text-[#D1D5DB] hover:bg-[#E5E7EB] dark:hover:bg-[#1F2937] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
