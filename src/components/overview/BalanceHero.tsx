import React from 'react';
import { PieChart, Plus, Vault } from 'lucide-react';
import { Profile, SummaryReport } from '../../types';
import {
  currencySymbol,
  formatAmount,
  splitAmount,
} from '../../design/tokens';

interface BalanceHeroProps {
  summary: SummaryReport | null;
  profile: Profile | null;
  onAddTransaction: () => void;
  onFundVault: () => void;
  onSetBudget: () => void;
}

/**
 * The single most important number in the product, treated like one.
 *
 * Reads only from the summary the server already returns — no new fields, no
 * new requests, no derived figures that could disagree with the ledger.
 */
export const BalanceHero: React.FC<BalanceHeroProps> = ({
  summary,
  profile,
  onAddTransaction,
  onFundVault,
  onSetBudget,
}) => {
  const currency = summary?.currency || profile?.displayCurrency || 'GHS';
  const symbol = currencySymbol(currency);

  const netBalance = summary?.netBalance ?? 0;
  const { whole, fraction } = splitAmount(netBalance);
  const isNegative = netBalance < 0;

  const monthIncome = summary?.monthIncome ?? 0;
  const monthExpense = summary?.monthExpense ?? 0;
  const monthNet = summary?.monthNet ?? 0;
  const savingsRate = summary?.savingsRate ?? 0;
  const savedInGoals = summary?.totalSavedInGoals ?? 0;

  const rateClamped = Math.max(0, Math.min(100, Math.round(savingsRate)));
  /** One decimal, and only when there is one — "29.2%" reads as measured, "29.0%" as noise. */
  const rateLabel = `${Number(savingsRate.toFixed(1))}%`;

  return (
    <section className="lg-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
        {/* ---- The figure ---- */}
        <div className="p-6 sm:p-7 lg:p-8">
          <p className="t-eyebrow">
            Net balance
            {profile?.name ? <span className="normal-case tracking-normal font-medium text-ink-4"> · {profile.name}</span> : null}
          </p>

          {/* The symbol and the decimals are stepped down and set on the same
              baseline, so the figure reads as one number with the part that
              matters carrying the weight. Sizes are explicit rather than em —
              em would resolve against the inherited size, not the hero size. */}
          <div className="mt-3 flex items-baseline">
            <span className="num mr-2.5 text-[clamp(1rem,2.2vw,1.5rem)] font-medium text-ink-3">
              {symbol}
            </span>
            <span className={`num t-hero ${isNegative ? 'text-neg' : ''}`}>
              {isNegative ? '−' : ''}
              {whole}
            </span>
            <span className="num text-[clamp(1.125rem,2.4vw,1.75rem)] font-medium text-ink-3">
              .{fraction}
            </span>
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {/* Zero is not an increase. A flat month gets a neutral badge and no arrow. */}
            <span
              className={`lg-tag ${monthNet > 0 ? 'lg-tag-pos' : ''}`}
              style={
                monthNet < 0
                  ? { background: 'var(--lg-neg-soft)', borderColor: 'transparent', color: 'var(--lg-neg)' }
                  : undefined
              }
            >
              {monthNet !== 0 ? <>{monthNet > 0 ? '↑' : '↓'}&nbsp;</> : null}
              <span className="num">{formatAmount(monthNet)}</span>
            </span>
            <span className="t-meta">net movement this month</span>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <button
              onClick={onAddTransaction}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-solid hover:bg-solid-hover text-on-solid text-[0.9375rem] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Plus className="w-[17px] h-[17px] stroke-[1.7]" />
              Record entry
            </button>
            <button
              onClick={onFundVault}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-surface border border-line-strong hover:bg-sunken text-ink text-[0.9375rem] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Vault className="w-[17px] h-[17px] stroke-[1.7]" />
              Fund a vault
            </button>
            <button
              onClick={onSetBudget}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-surface border border-line-strong hover:bg-sunken text-ink text-[0.9375rem] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <PieChart className="w-[17px] h-[17px] stroke-[1.7]" />
              Set a budget
            </button>
          </div>
        </div>

        {/* ---- The month, in four lines ---- */}
        <div className="border-t lg:border-t-0 lg:border-l border-line bg-sunken/60 p-6 sm:p-7 flex flex-col justify-center">
          <StatRow
            label="Income this month"
            value={signed(monthIncome, '+')}
            tone={monthIncome > 0 ? 'pos' : 'ink'}
          />
          <StatRow
            label="Spending this month"
            value={signed(monthExpense, '−')}
            tone={monthExpense > 0 ? 'neg' : 'ink'}
          />
          <StatRow
            label="Saved in vaults"
            value={formatAmount(savedInGoals)}
            tone="ink"
          />

          <div className="pt-4 mt-1">
            <div className="flex items-baseline justify-between gap-4">
              <span className="t-body">Savings rate</span>
              <span className="num t-title">{rateLabel}</span>
            </div>
            <div className="lg-track mt-2.5" role="img" aria-label={`Savings rate ${rateClamped} percent`}>
              <span
                style={{
                  width: `${rateClamped}%`,
                  background: rateClamped > 0 ? 'var(--lg-pos)' : 'var(--lg-line-strong)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/** A sign in front of zero is a lie about direction. */
function signed(value: number, sign: '+' | '−'): string {
  return value === 0 ? formatAmount(0) : `${sign}${formatAmount(value)}`;
}

const TONE_CLASS: Record<'pos' | 'neg' | 'ink', string> = {
  pos: 'text-pos',
  neg: 'text-neg',
  ink: 'text-ink',
};

const DOT_STYLE: Record<'pos' | 'neg' | 'ink', string> = {
  pos: 'var(--lg-pos)',
  neg: 'var(--lg-neg)',
  ink: 'var(--lg-ink-4)',
};

const StatRow: React.FC<{
  label: string;
  value: string;
  tone: 'pos' | 'neg' | 'ink';
}> = ({ label, value, tone }) => (
  <div className="flex items-center justify-between gap-4 py-3 border-b border-line last:border-b-0">
    <span className="t-body inline-flex items-center gap-2.5 min-w-0">
      <i
        aria-hidden="true"
        className="w-[7px] h-[7px] rounded-full shrink-0"
        style={{ background: DOT_STYLE[tone] }}
      />
      <span className="truncate">{label}</span>
    </span>
    <span className={`num text-[1.0625rem] font-bold shrink-0 ${TONE_CLASS[tone]}`}>
      {value}
    </span>
  </div>
);
