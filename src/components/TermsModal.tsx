import React from 'react';
import { X, Shield, FileText, CheckCircle2 } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  isAccepted?: boolean;
}

export const TermsModal: React.FC<TermsModalProps> = ({
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
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                Terms and Conditions
              </h2>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                Last updated: January 2026 • Ledger Financial Platform
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
              <Shield className="w-4 h-4 text-[#2563EB]" /> 1. Agreement to Terms
            </h3>
            <p className="text-xs leading-5">
              By accessing, registering, or using Ledger (&quot;the Service&quot;), you agree to be bound by these Terms and Conditions. If you do not agree with all of these terms, you are expressly prohibited from using the platform and must discontinue access immediately.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">
              2. User Accounts &amp; Multi-Profile System
            </h3>
            <p className="text-xs leading-5">
              Users must provide accurate, complete, and updated registration details, including a valid email address and secure password. Each user account can create and maintain multiple sub-profiles (Personal, Business, Savings, Family). You are solely responsible for maintaining the confidentiality of your credentials, individual profile PINs, and account activities.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">
              3. Email Usage &amp; Paystack Payment Referencing
            </h3>
            <p className="text-xs leading-5">
              Your registered email address is utilized for financial transaction receipts, automated settlement referencing, and transaction logging through our integration with Paystack financial rails. By signing up, you explicitly authorize Ledger and Paystack to transmit electronic transaction confirmations, receipts, and audit trail notifications to this email address.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">
              4. Security, Profile Locking &amp; PIN Verification
            </h3>
            <p className="text-xs leading-5">
              Ledger equips users with optional profile locking mechanisms backed by cryptographic hashing. You agree not to disclose your security PINs to unauthorized third parties. Ledger will not be liable for unauthorized transactions or modifications resulting from compromised credentials on your devices.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">
              5. Acceptable Financial Usage
            </h3>
            <p className="text-xs leading-5">
              You agree not to use the platform for unlawful, fraudulent, money-laundering, or unauthorized payment activities. All ledger entries, goals, and transfer requests must reflect bona fide financial records.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">
              6. Limitation of Liability
            </h3>
            <p className="text-xs leading-5">
              To the fullest extent permitted by law, Ledger and its affiliates shall not be liable for any indirect, incidental, or consequential damages resulting from system downtime, third-party payment rail delays (including banking network latency), or erroneous financial inputs made by the user.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E8E5DF] dark:border-[#2D323F] bg-[#FAF9F6] dark:bg-[#111317]">
          <div className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Mandatory acceptance required for registration.
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
