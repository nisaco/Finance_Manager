/**
 * Design preview harness.
 *
 * Renders real screens, inside the real app shell, against fixture data — no
 * database, no login, no API. Two modes:
 *
 *   /                       → contact sheet: every screen at phone, tablet and
 *                             desktop width, each in its own iframe
 *   /?screen=x&state=y      → one screen, rendered directly at the current
 *                             viewport width
 *
 * The iframes matter: a CSS media query answers to the viewport, not to a
 * container, so a "phone column" in a desktop page would report desktop
 * breakpoints and quietly hide every responsive bug there is.
 *
 *   npm run preview:overview   → builds to preview-dist/
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import './preview.css';
import { Overview } from '../../src/pages/Overview';
import { TransactionsPage } from '../../src/pages/TransactionsPage';
import { BudgetsPage } from '../../src/pages/BudgetsPage';
import { DebtsPage } from '../../src/pages/DebtsPage';
import { GoalsPage } from '../../src/pages/GoalsPage';
import { HistoryPage } from '../../src/pages/HistoryPage';
import { ReportsPage } from '../../src/pages/ReportsPage';
import { Navbar } from '../../src/components/Navbar';
import { APP_VERSION } from '../../src/version';
import { Providers, ledgerEmpty, ledgerFull, noop } from './fixtures';

type ScreenId = 'overview' | 'transactions' | 'budgets' | 'debts' | 'goals' | 'history' | 'reports';

const SCREENS: Record<ScreenId, { label: string; render: () => React.ReactNode }> = {
  overview: {
    label: 'Overview',
    render: () => (
      <Overview
        onNavigateTab={noop}
        onOpenNewTx={noop}
        onOpenNewBudget={noop}
        onOpenNewGoal={noop}
        onFundGoal={noop}
        onEditTx={noop}
      />
    ),
  },
  transactions: {
    label: 'Transactions',
    render: () => (
      <TransactionsPage
        onOpenNewTx={noop}
        onEditTx={noop}
        onOpenCsvImport={noop}
        onNavigateToHistory={noop}
      />
    ),
  },
  budgets: {
    label: 'Budgets',
    render: () => <BudgetsPage onOpenNewBudget={noop} onEditBudget={noop} />,
  },
  debts: {
    label: 'Debts',
    render: () => <DebtsPage onOpenNewDebt={noop} onEditDebt={noop} onRecordPayment={noop} />,
  },
  goals: {
    label: 'Goals',
    render: () => <GoalsPage onOpenNewGoal={noop} onEditGoal={noop} onFundGoal={noop} />,
  },
  history: {
    label: 'History',
    render: () => <HistoryPage onEditTx={noop} onNavigateToSettings={noop} />,
  },
  reports: {
    label: 'Reports',
    render: () => <ReportsPage />,
  },
};

const DEVICES = [
  { id: 'phone', label: 'Phone · 390', w: 390, h: 1180 },
  { id: 'tablet', label: 'Tablet · 834', w: 834, h: 1180 },
  { id: 'desktop', label: 'Desktop · 1280', w: 1280, h: 1180 },
];

/** The real shell: header, tab bar, page frame. Same classes App.tsx uses. */
const Shell: React.FC<{ tab: string; children: React.ReactNode }> = ({ tab, children }) => (
  <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans">
    <Navbar activeTab={tab} onTabChange={noop} onOpenNewTx={noop} onOpenLiveVoice={noop} onOpenAuditLogs={noop} />
    <main className="lg-page lg-page-bottom flex-1 py-5 sm:py-7">{children}</main>
    <footer className="border-t border-line">
      <div className="lg-page py-5 text-center sm:text-left">
        <span className="t-meta">
          Ledger · Personal and business financial management
          <span className="hidden sm:inline" aria-hidden="true"> · </span>
          <span className="block sm:inline">
            Version <span className="num">{APP_VERSION}</span>
          </span>
        </span>
      </div>
    </footer>
  </div>
);

const params = new URLSearchParams(location.search);
const screen = (params.get('screen') || '') as ScreenId;
const state = params.get('state') === 'empty' ? 'empty' : 'full';

const root = createRoot(document.getElementById('root')!);

if (screen && SCREENS[screen]) {
  root.render(
    <Providers ledger={state === 'empty' ? ledgerEmpty : ledgerFull}>
      <Shell tab={screen}>{SCREENS[screen].render()}</Shell>
    </Providers>
  );
} else {
  root.render(
    <div className="min-h-screen bg-canvas text-ink p-4 sm:p-8 space-y-8">
      <header className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 border-b border-line pb-4">
        <div>
          <h1 className="t-title font-bold">Ledger · Design System Preview</h1>
          <p className="t-meta text-ink-3 mt-0.5">
            Real components rendered against fixed fixture data. Each viewport is an isolated iframe.
          </p>
        </div>
        <div className="text-xs text-ink-3">
          Version <span className="num">{APP_VERSION}</span>
        </div>
      </header>

      {(Object.keys(SCREENS) as ScreenId[]).map((sid) => (
        <section key={sid} className="max-w-7xl mx-auto space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="t-card font-bold">{SCREENS[sid].label}</h2>
            <div className="flex items-center gap-3 text-xs">
              <a
                href={`?screen=${sid}&state=full`}
                className="text-accent hover:underline font-semibold"
              >
                Populated ↗
              </a>
              <span className="text-line-strong">|</span>
              <a
                href={`?screen=${sid}&state=empty`}
                className="text-ink-3 hover:underline"
              >
                Empty ↗
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {DEVICES.map((d) => (
              <div key={d.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-ink-3 px-1">
                  <span>{d.label}</span>
                  <span className="num">{d.w}×{d.h}</span>
                </div>
                <div
                  className="bg-surface border border-line rounded-xl overflow-hidden shadow-xs"
                  style={{ height: '700px' }}
                >
                  <iframe
                    src={`?screen=${sid}&state=full`}
                    title={`${SCREENS[sid].label} on ${d.label}`}
                    style={{ width: `${d.w}px`, height: `${d.h}px`, transform: `scale(${Math.min(1, 400 / d.w)})`, transformOrigin: 'top left' }}
                    className="border-0 pointer-events-auto"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
