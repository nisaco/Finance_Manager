import React from 'react';
import { Lock, Plus } from 'lucide-react';
import { Goal } from '../../types';
import { currencySymbol, formatAmount } from '../../design/tokens';
import { SectionCard } from './SectionCard';

interface VaultListProps {
  goals: Goal[];
  currency: string;
  totalSaved: number;
  onViewAll: () => void;
  onCreate: () => void;
  onFund: (goal: Goal) => void;
}

/**
 * Savings vaults. Same three-vault preview, same fund handler, same Paystack
 * provenance badge — now legible, and with the bank details the badge used to
 * only hint at.
 */
export const VaultList: React.FC<VaultListProps> = ({
  goals,
  currency,
  totalSaved,
  onViewAll,
  onCreate,
  onFund,
}) => {
  const shown = goals.slice(0, 3);
  const symbol = currencySymbol(currency);

  return (
    <SectionCard
      title="Savings vaults"
      subtitle={
        goals.length > 0
          ? `${symbol} ${formatAmount(totalSaved)} across ${goals.length} ${
              goals.length === 1 ? 'vault' : 'vaults'
            }`
          : undefined
      }
      action={goals.length > 0 ? { label: 'All vaults', onClick: onViewAll } : undefined}
    >
      {goals.length === 0 ? (
        <div className="py-6 text-center">
          <p className="t-body text-ink">No vaults yet</p>
          <p className="t-meta mt-1.5">Name what you are saving for and it becomes easier to keep.</p>
          <button
            onClick={onCreate}
            className="mt-4 inline-flex items-center gap-1.5 text-[0.875rem] font-bold text-accent hover:text-accent-hover transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[1.7]" />
            Create a vault
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((g) => {
            const target = g.target > 0 ? g.target : 0;
            const pct = target > 0 ? Math.min(100, Math.round((g.current / target) * 100)) : 0;
            const isPaystack = g.paystackDestination?.type === 'paystack_recipient';
            const bank = g.paystackDestination?.bankName;
            const last4 = g.paystackDestination?.accountLast4;

            return (
              <li key={g.id} className="rounded-xl border border-line bg-sunken p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="t-card truncate flex items-center gap-1.5">
                      {g.isLocked ? (
                        <Lock className="w-3.5 h-3.5 stroke-[1.8] text-ink-3 shrink-0" aria-label="Locked vault" />
                      ) : null}
                      <span className="truncate">{g.name}</span>
                    </p>
                    <p className="t-meta mt-1 truncate">
                      {isPaystack
                        ? `Paystack vault${bank ? ` · ${bank}` : ''}${last4 ? ` ····${last4}` : ''}`
                        : g.deadline
                        ? `Target date · ${new Date(g.deadline).toLocaleDateString('en-GB', {
                            month: 'short',
                            year: 'numeric',
                          })}`
                        : 'Manual vault'}
                    </p>
                  </div>

                  <button
                    onClick={() => onFund(g)}
                    className="shrink-0 h-8 px-3 rounded-lg bg-surface border border-line-strong hover:bg-canvas text-ink text-[0.8125rem] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Fund
                  </button>
                </div>

                {/* Saved, target and share as one sentence of figures. The bar
                    that used to sit here restated the percentage in a second
                    form without making it any clearer. */}
                <div className="mt-2.5 flex items-baseline justify-between gap-3 flex-wrap">
                  <span className="num text-[0.9375rem] font-bold text-ink whitespace-nowrap">
                    {symbol} {formatAmount(g.current)}
                    <span className="t-meta font-medium"> of {formatAmount(target)}</span>
                  </span>
                  <span
                    className="num text-[0.8125rem] font-bold shrink-0"
                    style={{ color: pct >= 100 ? 'var(--lg-pos)' : 'var(--lg-ink-4)' }}
                  >
                    {pct >= 100 ? 'Funded' : `${pct}% funded`}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
};
