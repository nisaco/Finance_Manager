import React, { useEffect, useState } from 'react';
import { BarChart3, Eye, EyeOff, PieChart, Plus, Vault } from 'lucide-react';
import { Profile, SummaryReport } from '../../types';
import { currencySymbol, formatAmount, splitAmount } from '../../design/tokens';

interface BalanceHeroProps {
  summary: SummaryReport | null;
  profile: Profile | null;
  onAddTransaction: () => void;
  onFundVault: () => void;
  onSetBudget: () => void;
  onViewReports: () => void;
}

const HIDE_KEY = 'lg.hideBalance';

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
  onViewReports,
}) => {
  /**
   * Every mobile money app in this market lets you cover the balance, because
   * people check their phone in tro-tros, queues and offices. Presentation state
   * only — it hides the rendering, never the data.
   */
  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(HIDE_KEY, hidden ? '1' : '0');
    } catch {
      /* private mode or blocked storage — the toggle still works for this session */
    }
  }, [hidden]);

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

  /** One decimal, and only when there is one — "29.2%" reads as measured, "29.0%" as noise. */
  const rateLabel = `${Number(savingsRate.toFixed(1))}%`;

  const actions = [
    { label: 'Record entry', icon: Plus, onClick: onAddTransaction },
    { label: 'Fund a vault', icon: Vault, onClick: onFundVault },
    { label: 'Set a budget', icon: PieChart, onClick: onSetBudget },
    { label: 'See reports', icon: BarChart3, onClick: onViewReports },
  ];

  return (
    <section className="lg-card lg-warmth-mesh overflow-hidden relative shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
        {/* ---- The figure ---- */}
        <div className="p-5 sm:p-7 lg:p-8 relative z-10">
          <div className="flex items-start justify-between gap-3">
            <p className="t-eyebrow flex items-center">
              <span className="w-2 h-2 rounded-full bg-accent inline-block mr-2 lg-pulse-dot" aria-hidden="true" />
              Net balance
              {profile?.name ? (
                <span className="normal-case tracking-normal font-medium text-ink-4">
                  {' '}
                  · {profile.name}
                </span>
              ) : null}
            </p>

            <button
              type="button"
              onClick={() => setHidden((v) => !v)}
              className="lg-iconbtn -mt-2.5 -mr-2.5 shrink-0 active:scale-90 transition-transform duration-150"
              aria-pressed={hidden}
              aria-label={hidden ? 'Show balance' : 'Hide balance'}
              title={hidden ? 'Show balance' : 'Hide balance'}
            >
              {hidden ? (
                <EyeOff className="w-[18px] h-[18px]" strokeWidth={1.7} />
              ) : (
                <Eye className="w-[18px] h-[18px]" strokeWidth={1.7} />
              )}
            </button>
          </div>

          {/* The symbol and the decimals are stepped down and set on the same
              baseline, so the figure reads as one number with the part that
              matters carrying the weight. */}
          <div className="mt-2.5 flex items-baseline select-none">
            <span className="num mr-2.5 text-[clamp(1.125rem,2.4vw,1.625rem)] font-medium text-ink-3">
              {symbol}
            </span>
            {hidden ? (
              <span className="t-hero tracking-[0.1em]" aria-label="Balance hidden">
                ••••••
              </span>
            ) : (
              <>
                <span className={`num t-hero ${isNegative ? 'text-neg' : ''}`}>
                  {isNegative ? '−' : ''}
                  {whole}
                </span>
                <span className="num text-[clamp(1.125rem,2.4vw,1.75rem)] font-medium text-ink-3">
                  .{fraction}
                </span>
              </>
            )}
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {/* Zero is not an increase. A flat month gets a neutral badge and no arrow. */}
            <span
              className={`lg-tag ${monthNet > 0 ? 'lg-tag-pos' : ''}`}
              style={
                monthNet < 0
                  ? {
                      background: 'var(--lg-neg-soft)',
                      borderColor: 'transparent',
                      color: 'var(--lg-neg)',
                    }
                  : undefined
              }
            >
              {monthNet !== 0 ? <>{monthNet > 0 ? '↑' : '↓'}&nbsp;</> : null}
              <span className="num">{hidden ? '••••' : formatAmount(monthNet)}</span>
            </span>
            <span className="t-meta">net movement this month</span>
          </div>

          {/* Four tiles: iOS tactile micro-press and spring */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {actions.map(({ label, icon: Icon, onClick }) => (
              <button key={label} type="button" onClick={onClick} className="lg-tile">
                <Icon className="w-[20px] h-[20px]" strokeWidth={1.7} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ---- The month, in four lines ---- */}
        <div className="border-t lg:border-t-0 lg:border-l border-line bg-sunken/60 p-5 sm:p-7 flex flex-col justify-center">
          <StatRow
            label="Income this month"
            value={hidden ? '••••' : signed(monthIncome, '+')}
            tone={monthIncome > 0 ? 'pos' : 'ink'}
          />
          <StatRow
            label="Spending this month"
            value={hidden ? '••••' : signed(monthExpense, '−')}
            tone={monthExpense > 0 ? 'neg' : 'ink'}
          />
          <StatRow
            label="Saved in vaults"
            value={hidden ? '••••' : formatAmount(savedInGoals)}
            tone="ink"
          />

          {/* Stated, not charted. A rate is one number; a bar for it adds a
              shape to read without adding anything to know. */}
          <div className="flex items-center justify-between gap-4 py-3">
            <span className="t-body inline-flex items-center gap-2.5">
              <i
                aria-hidden="true"
                className="w-[7px] h-[7px] rounded-full shrink-0"
                style={{ background: 'var(--lg-ink-4)' }}
              />
              Savings rate
            </span>
            <span className="num text-[1.0625rem] font-bold shrink-0">
              {hidden ? '••••' : rateLabel}
            </span>
          </div>

          <p className="t-meta pt-1">
            {savingsRate > 0
              ? `You kept ${rateLabel} of what came in this month.`
              : 'Nothing kept back this month yet.'}
          </p>
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
  <div className="flex items-center justify-between gap-4 py-3 border-b border-line last:border-b-0 hover:bg-surface/40 px-2 -mx-2 rounded-xl transition-colors">
    <span className="t-body inline-flex items-center gap-2.5 min-w-0">
      <i
        aria-hidden="true"
        className="w-[7px] h-[7px] rounded-full shrink-0"
        style={{ background: DOT_STYLE[tone] }}
      />
      <span className="truncate">{label}</span>
    </span>
    <span className={`num text-[1.0625rem] font-bold shrink-0 ${TONE_CLASS[tone]}`}>{value}</span>
  </div>
);
