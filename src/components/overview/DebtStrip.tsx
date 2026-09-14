import React from 'react';
import { currencySymbol, formatAmount } from '../../design/tokens';
import { SectionCard } from './SectionCard';

interface DebtStripProps {
  owedToMe: number;
  iOwe: number;
  currency: string;
  count: number;
  onReview: () => void;
}

/**
 * Debts and credit. Two figures that were previously joined into one truncated
 * metadata line; separating them is the whole fix.
 */
export const DebtStrip: React.FC<DebtStripProps> = ({
  owedToMe,
  iOwe,
  currency,
  count,
  onReview,
}) => {
  const symbol = currencySymbol(currency);

  return (
    <SectionCard
      title="Debts & credit"
      subtitle={count > 0 ? `${count} open ${count === 1 ? 'record' : 'records'}` : undefined}
      action={{ label: 'Review', onClick: onReview }}
      bodyClassName="p-0"
    >
      <div className="grid grid-cols-2 divide-x divide-line">
        {/* Zero owed is not good news, it is no news — so it is not green. */}
        <Figure
          label="Owed to me"
          symbol={symbol}
          value={formatAmount(owedToMe)}
          tone={owedToMe > 0 ? 'pos' : 'ink'}
        />
        <Figure label="I owe" symbol={symbol} value={formatAmount(iOwe)} tone="ink" />
      </div>
    </SectionCard>
  );
};

/**
 * Two of these sit side by side, so each gets half a phone screen minus gutters.
 * The figure never wraps: an amount split across two lines reads as two amounts.
 * The size is fluid instead of fixed, and the symbol is stepped down and set on
 * the same baseline so the number keeps the weight.
 */
const Figure: React.FC<{
  label: string;
  symbol: string;
  value: string;
  tone: 'pos' | 'ink';
}> = ({ label, symbol, value, tone }) => (
  <div className="px-4 sm:px-5 py-4 min-w-0">
    <p className="t-eyebrow">{label}</p>
    <p
      className={`mt-2 flex items-baseline gap-1 whitespace-nowrap ${
        tone === 'pos' ? 'text-pos' : 'text-ink'
      }`}
    >
      <span className="num text-[0.8125rem] font-semibold text-ink-3">{symbol}</span>
      <span className="num text-[clamp(1.0625rem,4.4vw,1.375rem)] font-bold tracking-[-0.02em]">
        {value}
      </span>
    </p>
  </div>
);
