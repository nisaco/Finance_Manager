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
import { Navbar } from '../../src/components/Navbar';
import { APP_VERSION } from '../../src/version';
import { Providers, ledgerEmpty, ledgerFull, noop } from './fixtures';

type ScreenId = 'overview';

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
};

const DEVICES = [
  { id: 'phone', label: 'Phone · 390', w: 390, h: 1180 },
  { id: 'tablet', label: 'Tablet · 834', w: 834, h: 1180 },
  { id: 'desktop', label: 'Desktop · 1280', w: 1280, h: 1180 },
];

/** The real shell: header, tab bar, page frame. Same classes App.tsx uses. */
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans">
    <Navbar activeTab="overview" onTabChange={noop} onOpenNewTx={noop} onOpenLiveVoice={noop} onOpenAuditLogs={noop} />
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
      <Shell>{SCREENS[screen].render()}</Shell>
    </Providers>
  );
} else {
  /** Contact sheet. Every screen, every width, every state, on one page. */
  const entries = (Object.keys(SCREENS) as ScreenId[]).flatMap((id) =>
    (['full', 'empty'] as const).map((st) => ({ id, st }))
  );

  root.render(
    <div className="min-h-screen bg-canvas font-sans p-4 sm:p-8 space-y-10">
      <header>
        <p className="t-eyebrow">Ledger · design preview</p>
        <h1 className="t-title mt-1">Screens at phone, tablet and desktop width</h1>
        <p className="t-meta mt-1">
          Each panel is a real viewport, so breakpoints, tap targets and the navigation
          drawer behave exactly as they will on a device.
        </p>
      </header>

      {entries.map(({ id, st }) => (
        <section key={`${id}-${st}`} className="space-y-3">
          <h2 className="t-card">
            {SCREENS[id].label}
            <span className="t-meta font-medium">
              {' '}
              · {st === 'empty' ? 'first run, nothing recorded' : 'populated'}
            </span>
          </h2>
          <div className="flex flex-wrap gap-6 items-start">
            {DEVICES.map((d) => (
              <figure key={d.id} className="m-0">
                <figcaption className="t-eyebrow mb-2">{d.label}</figcaption>
                <iframe
                  title={`${id} ${st} ${d.id}`}
                  src={`?screen=${id}&state=${st}`}
                  width={d.w}
                  height={d.h}
                  className="bg-surface border border-line-strong rounded-xl"
                  style={{ display: 'block' }}
                />
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
