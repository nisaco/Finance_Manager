import React, { useState } from 'react';
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Trash2,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { Debt } from '../types';
import { formatCurrency, formatDate } from '../design/tokens';
import { api } from '../api/client';

interface DebtsPageProps {
  onOpenNewDebt: () => void;
  onEditDebt: (debt: Debt) => void;
  onRecordPayment: (debt: Debt) => void;
}

/**
 * Debts.
 *
 * Direction, totals, filtering and api.deleteDebt are unchanged. The settled
 * bar is gone: what matters about a debt is the amount still outstanding and
 * the date it is due, both of which are now stated outright.
 */
export const DebtsPage: React.FC<DebtsPageProps> = ({
  onOpenNewDebt,
  onEditDebt,
  onRecordPayment,
}) => {
  const { activeProfile, debts, refreshData, notify } = useLedger();
  const [filterTab, setFilterTab] = useState<'all' | 'owed_to_me' | 'i_owe'>('all');

  const currency = activeProfile?.displayCurrency || 'GHS';

  const filteredDebts = debts.filter((d) => {
    if (filterTab === 'all') return true;
    return d.direction === filterTab;
  });

  const totalOwedToMe = debts
    .filter((d) => d.direction === 'owed_to_me')
    .reduce((sum, d) => sum + Math.max(0, d.amount - (d.paid || 0)), 0);

  const totalIOwe = debts
    .filter((d) => d.direction === 'i_owe')
    .reduce((sum, d) => sum + Math.max(0, d.amount - (d.paid || 0)), 0);

  const countOwedToMe = debts.filter((d) => d.direction === 'owed_to_me').length;
  const countIOwe = debts.filter((d) => d.direction === 'i_owe').length;

  const handleDelete = async (id: string) => {
    if (confirm('Delete this debt record?')) {
      try {
        await api.deleteDebt(id);
        notify('Debt entry deleted');
        await refreshData();
      } catch (err: any) {
        notify(err.message || 'Delete failed', 'error');
      }
    }
  };

  const tabs: { id: 'all' | 'owed_to_me' | 'i_owe'; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: debts.length },
    { id: 'owed_to_me', label: 'Owed to me', count: countOwedToMe },
    { id: 'i_owe', label: 'I owe', count: countIOwe },
  ];

  return (
    <div className="space-y-5">
      {/* ---- Page header ---- */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="t-title">Debts</h1>
          <p className="t-meta mt-1">
            Money you owe and money owed to you
            {activeProfile?.name ? ` · ${activeProfile.name}` : ''}
          </p>
        </div>

        <button onClick={onOpenNewDebt} className="lg-btn lg-btn-solid shrink-0">
          <Plus className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
          Record a debt
        </button>
      </header>

      {/* ---- The two directions ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <section className="lg-card p-4 sm:p-5">
          <div className="flex items-center gap-1.5">
            <ArrowUpRight
              className="w-[15px] h-[15px] shrink-0"
              strokeWidth={1.7}
              style={{ color: 'var(--lg-pos)' }}
              aria-hidden="true"
            />
            <p className="t-eyebrow">Owed to you</p>
          </div>
          <p className="num mt-2 text-[clamp(1.375rem,5vw,1.75rem)] font-bold tracking-[-0.02em] whitespace-nowrap">
            {formatCurrency(totalOwedToMe, currency)}
          </p>
          <p className="num t-meta mt-1.5">
            {countOwedToMe} {countOwedToMe === 1 ? 'person' : 'people'}
          </p>
        </section>

        <section className="lg-card p-4 sm:p-5">
          <div className="flex items-center gap-1.5">
            <ArrowDownLeft
              className="w-[15px] h-[15px] shrink-0"
              strokeWidth={1.7}
              style={{ color: 'var(--lg-neg)' }}
              aria-hidden="true"
            />
            <p className="t-eyebrow">You owe</p>
          </div>
          <p className="num mt-2 text-[clamp(1.375rem,5vw,1.75rem)] font-bold tracking-[-0.02em] whitespace-nowrap">
            {formatCurrency(totalIOwe, currency)}
          </p>
          <p className="num t-meta mt-1.5">
            {countIOwe} {countIOwe === 1 ? 'person' : 'people'}
          </p>
        </section>
      </div>

      {/* ---- Filter ---- */}
      <div className="lg-seg" role="tablist" aria-label="Filter debts by direction">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={filterTab === t.id}
            onClick={() => setFilterTab(t.id)}
          >
            {t.label}
            <span className="num ml-1.5 text-ink-4">{t.count}</span>
          </button>
        ))}
      </div>

      {/* ---- The records ---- */}
      {filteredDebts.length === 0 ? (
        <section className="lg-card p-8 sm:p-12 text-center">
          <p className="t-card">
            {filterTab === 'all'
              ? 'Nothing recorded yet'
              : filterTab === 'i_owe'
                ? 'You owe nobody'
                : 'Nobody owes you'}
          </p>
          <p className="t-meta mt-1.5 max-w-sm mx-auto">
            {filterTab === 'all'
              ? 'Record a loan the moment it happens and you will not have to remember it later.'
              : 'Switch the filter above to see the other side of the ledger.'}
          </p>
          {filterTab === 'all' && (
            <button onClick={onOpenNewDebt} className="lg-btn lg-btn-accent mt-5">
              <Plus className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
              Record a debt
            </button>
          )}
        </section>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDebts.map((d) => {
            const isIOwe = d.direction === 'i_owe';
            const paid = d.paid || 0;
            const remaining = Math.max(0, d.amount - paid);
            const isSettled = remaining === 0;
            const pct = Math.min(100, Math.round((paid / d.amount) * 100));

            return (
              <article key={d.id} className="lg-card p-4 sm:p-5 flex flex-col">
                {/* Person and controls */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="t-card truncate">{d.person}</h2>
                    <p
                      className="t-meta mt-0.5 font-semibold"
                      style={{ color: isIOwe ? 'var(--lg-neg)' : 'var(--lg-pos)' }}
                    >
                      {isIOwe ? 'You owe them' : 'They owe you'}
                    </p>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0 -mt-1.5 -mr-1.5">
                    <button
                      onClick={() => onEditDebt(d)}
                      className="lg-iconbtn"
                      title="Edit record"
                      aria-label={`Edit the record for ${d.person}`}
                    >
                      <Edit2 className="w-[17px] h-[17px]" strokeWidth={1.7} />
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="lg-iconbtn hover:text-neg"
                      title="Delete record"
                      aria-label={`Delete the record for ${d.person}`}
                    >
                      <Trash2 className="w-[17px] h-[17px]" strokeWidth={1.7} />
                    </button>
                  </div>
                </div>

                {/* Outstanding */}
                <div className="mt-4">
                  <p className="t-eyebrow">{isSettled ? 'Status' : 'Still outstanding'}</p>
                  {isSettled ? (
                    <p
                      className="mt-1 flex items-center gap-1.5 text-[1.0625rem] font-bold"
                      style={{ color: 'var(--lg-pos)' }}
                    >
                      <CheckCircle className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                      Fully settled
                    </p>
                  ) : (
                    <p className="num mt-1 text-[clamp(1.25rem,4vw,1.5rem)] font-bold tracking-[-0.02em] whitespace-nowrap">
                      {formatCurrency(remaining, d.currency)}
                    </p>
                  )}
                </div>

                {/* Supporting figures — the bar's percentage now stated as text */}
                <dl className="mt-4 pt-3.5 border-t border-line space-y-2 text-[0.8125rem]">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-3">Original amount</dt>
                    <dd className="num font-bold">{formatCurrency(d.amount, d.currency)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-3">Settled so far</dt>
                    <dd className="num font-bold">
                      {formatCurrency(paid, d.currency)}
                      <span className="t-meta font-medium"> · {pct}%</span>
                    </dd>
                  </div>
                  {d.dueDate && (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-3 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0" strokeWidth={1.7} aria-hidden="true" />
                        Due
                      </dt>
                      <dd className="num text-ink-2">{formatDate(d.dueDate)}</dd>
                    </div>
                  )}
                </dl>

                {d.note && <p className="t-meta mt-3.5 line-clamp-2">{d.note}</p>}

                {!isSettled && (
                  <div className="mt-auto pt-4">
                    <button onClick={() => onRecordPayment(d)} className="lg-btn lg-btn-quiet lg-btn-block">
                      Record a payment
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
