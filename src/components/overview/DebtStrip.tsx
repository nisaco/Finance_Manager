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
          value={`${symbol} ${formatAmount(owedToMe)}`}
          tone={owedToMe > 0 ? 'pos' : 'ink'}
        />
        <Figure label="I owe" value={`${symbol} ${formatAmount(iOwe)}`} tone="ink" />
      </div>
    </SectionCard>
  );
};

const Figure: React.FC<{ label: string; value: string; tone: 'pos' | 'ink' }> = ({
  label,
  value,
  tone,
}) => (
  <div className="px-5 py-4">
    <p className="t-eyebrow">{label}</p>
    <p
      className={`num mt-2 text-[1.375rem] font-bold tracking-[-0.02em] ${
        tone === 'pos' ? 'text-pos' : 'text-ink'
      }`}
    >
      {value}
    </p>
  </div>
);
