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
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-[#374151] dark:text-[#D1D5DB] leading-relaxed">
          
          {/* Prominent Legal Disclaimer Callout */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2 text-xs">
            <div className="flex items-center space-x-2 font-bold text-sm">
              <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>IMPORTANT LEGAL NOTICE &amp; NON-BANK STATUS</span>
            </div>
            <p className="leading-relaxed">
              Ledger is a financial management software tool and digital budgeting ledger. <strong>Ledger is NOT a bank, NOT a depository institution, NOT an investment fund, and does NOT generate income or pay interest.</strong> You cannot earn percentages or yields on savings goals. All features are self-directed budgeting mechanisms.
            </p>
          </div>

          <section className="space-y-2">
            <h3 className="font-bold text-[#1A1A1A] dark:text-[#F3F4F6] flex items-center gap-1.5 text-sm">
              <Shield className="w-4 h-4 text-emerald-600" /> 1. Non-Banking &amp; Non-Yield Generating Principle
            </h3>
            <p className="text-xs leading-5">
              You explicitly acknowledge and agree that Ledger is solely a technology and ledger management platform. Ledger does not operate as a financial institution or investment advisor. <strong>Savings goals and vaults do NOT earn interest, percentages, capital gains, or yields.</strong> We are not an income generator. Any balance shown in a savings goal represents funds ring-fenced from your own deposits for your personal budgeting milestones.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-[#1A1A1A] dark:text-[#F3F4F6] text-sm">
              2. Payment Collection &amp; Licensed Custodial Rails
            </h3>
            <p className="text-xs leading-5">
              Ledger does not custody or hold customer funds directly on its own balance sheet. All deposit inflows and withdrawal disbursements are collected, routed, and processed via certified, licensed third-party Payment Service Providers (specifically <strong>Paystack Payments Limited</strong> and partner commercial banks and Mobile Money telecommunication operators including MTN MoMo, Telecel Cash, and AirtelTigo Money). Deposit receipts and transaction references are transmitted electronically to your registered email address.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-[#1A1A1A] dark:text-[#F3F4F6] text-sm">
              3. User Right to Withdraw Funds &amp; Payout Policy
            </h3>
            <p className="text-xs leading-5">
              Users retain unalienable ownership of their deposited principal and are entitled to request the withdrawal of their available savings vault balances at any time via the platform’s <strong>Withdraw Funds / Request Payout</strong> interface. Outbound payouts are settled to the user's verified Mobile Money wallet or nominated commercial bank account. To prevent unauthorized account drainage, all withdrawal requests are subject to automated verification and administrative anti-fraud clearance before disbursement.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-[#1A1A1A] dark:text-[#F3F4F6] text-sm">
              4. Standard Transaction &amp; Disbursement Fees (2.0%)
            </h3>
            <p className="text-xs leading-5">
              To cover third-party payment gateway transaction settlement costs, telecommunication network wallet transfer levies, clearing house charges, and technical system infrastructure operations, a non-negotiable <strong>2.0% protocol processing &amp; disbursement fee</strong> is automatically assessed and deducted from the gross requested withdrawal amount at the moment of payout.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-[#1A1A1A] dark:text-[#F3F4F6] text-sm">
              5. Time-Locked Discipline Vaults &amp; Early Liquidation Penalty (10.0%)
            </h3>
            <p className="text-xs leading-5">
              Users may voluntarily designate a savings goal as a <strong>Time-Locked Vault</strong> for fixed maturity terms (e.g., 30, 90, 180, or 365 days) as a personal self-discipline commitment against impulsive spending. By setting a locked vault, you explicitly agree to the following enforceable terms:
            </p>
            <ul className="text-xs leading-5 list-disc pl-5 space-y-1 text-[#4B5563] dark:text-[#9CA3AF]">
              <li>
                <strong>Early Liquidation Penalty:</strong> If you elect to unlock, liquidate, or withdraw funds from a time-locked vault <em>prior to the agreed maturity date</em>, an <strong>Early Liquidation Penalty of 10.0%</strong> of the withdrawn amount shall be deducted from your payout, in addition to the standard 2.0% processing fee (total 12.0% deduction).
              </li>
              <li>
                <strong>Post-Maturity Withdrawals:</strong> If you withdraw funds on or after the scheduled lock maturity date, NO penalty is charged (only the standard 2.0% processing fee applies).
              </li>
              <li>
                <strong>Liquidated Damages Agreement:</strong> You acknowledge that this penalty is not punitive, but represents agreed-upon liquidated damages to enforce your voluntary commitment and offset administrative overheads.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-[#1A1A1A] dark:text-[#F3F4F6] text-sm">
              6. Security, Profile Locks &amp; User Liability
            </h3>
            <p className="text-xs leading-5">
              Ledger equips users with optional multi-profile PIN locks and session safeguards. You are solely responsible for maintaining the confidentiality of your credentials and PIN codes. Ledger will not be liable for any unauthorized transfers, data breaches, or compromised payouts resulting from device theft, shared credentials, or incorrect account/wallet numbers provided by the user.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-[#1A1A1A] dark:text-[#F3F4F6] text-sm">
              7. Absolute Limitation of Liability &amp; Hold Harmless
            </h3>
            <p className="text-xs leading-5">
              To the fullest extent permissible by applicable law, you agree to <strong>fully indemnify, defend, and hold harmless Ledger, its creators, operators, and affiliates</strong> from and against any claims, losses, damages, liabilities, regulatory inquiries, or expenses (including legal fees) arising out of your use of the platform, third-party payment gateway downtime (including Paystack or telecommunication network outages), inaccurate financial inputs, or delays in payout disbursement. You agree that Ledger’s total aggregate liability shall under no circumstances exceed the total fees collected directly from your account in the preceding 30 days.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-[#1A1A1A] dark:text-[#F3F4F6] text-sm">
              8. Compliance with Financial Regulations &amp; Anti-Money Laundering (AML)
            </h3>
            <p className="text-xs leading-5">
              You agree not to utilize Ledger for any unlawful activity, money laundering, terrorist financing, or fraudulent transactions. Ledger and its payment partners reserve the right to freeze suspicious transfers, request proof of identity, or report unlawful conduct to relevant regulatory authorities without prior notice.
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
