/**
 * Design preview harness.
 *
 * Renders the real Overview page against a fixed dataset so a screen can be
 * reviewed without a database, a login or a running API. It imports the same
 * component the product ships — nothing here is a mock of the UI, only of the
 * data. Not part of the application build.
 *
 *   npm run preview:overview   → builds to preview-dist/
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import './preview.css';
import { Overview } from '../../src/pages/Overview';
import { LedgerContext, type LedgerContextType } from '../../src/context/LedgerContext';
import type { Budget, Debt, Goal, Profile, SummaryReport, Transaction } from '../../src/types';

const iso = (day: number) => {
  const d = new Date();
  d.setDate(day);
  return d.toISOString();
};

const profile = {
  id: 'p1',
  name: 'Personal',
  displayCurrency: 'GHS',
  color: '#0F5257',
  type: 'personal',
} as unknown as Profile;

const summary: SummaryReport = {
  currency: 'GHS',
  netBalance: 48920.65,
  totalIncome: 132480,
  totalExpense: 83559.35,
  monthIncome: 18450,
  monthExpense: 13057.9,
  monthNet: 5392.1,
  savingsRate: 29.2,
  totalSavedInGoals: 9240,
  totalIOwe: 1875,
  totalOwedToMe: 3150,
  transactionCount: 248,
} as unknown as SummaryReport;

const tx = (
  id: string,
  type: 'income' | 'expense',
  amount: number,
  category: string,
  day: number,
  description: string,
  recurring: 'none' | 'weekly' | 'monthly' = 'none'
): Transaction => ({
  id,
  profileId: 'p1',
  type,
  amount,
  currency: 'GHS',
  category,
  date: iso(day),
  note: '',
  description,
  recurring,
  createdAt: iso(day),
});

const transactions: Transaction[] = [
  tx('t1', 'income', 7500, 'Consulting & Retainer', 13, 'Consulting retainer — Adinkra Labs'),
  tx('t2', 'expense', 4200, 'Housing & Utilities', 12, 'Rent — East Legon apartment', 'monthly'),
  tx('t3', 'expense', 862.4, 'Groceries & Household', 11, 'Melcom — household restock'),
  tx('t4', 'expense', 418.75, 'Tech & Software', 10, 'Vercel & Figma subscriptions', 'monthly'),
  tx('t5', 'expense', 1500, 'Savings & Investments', 9, 'Transfer to Emergency Fund'),
  tx('t6', 'income', 1180, 'Side Project Sales', 8, 'Side project sale — template licence'),
  tx('t7', 'expense', 1340, 'Dining & Leisure', 7, 'Restaurants and outings'),
  tx('t8', 'expense', 612, 'Transport & Fuel', 6, 'Fuel and rides'),
  tx('t9', 'expense', 821.75, 'Groceries & Household', 5, 'Weekly market run'),
  tx('t10', 'expense', 1302.95, 'Health & Wellness', 4, 'Dental treatment'),
  tx('t11', 'expense', 2000, 'Family Support', 3, 'Monthly family support', 'monthly'),
];

const budgets: Budget[] = [
  { id: 'b1', profileId: 'p1', category: 'Housing & Utilities', limit: 4500, currency: 'GHS', spent: 4200, percentage: 93 },
  { id: 'b2', profileId: 'p1', category: 'Groceries & Household', limit: 2200, currency: 'GHS', spent: 1684.15, percentage: 77 },
  { id: 'b3', profileId: 'p1', category: 'Dining & Leisure', limit: 1000, currency: 'GHS', spent: 1340, percentage: 134 },
  { id: 'b4', profileId: 'p1', category: 'Transport & Fuel', limit: 1200, currency: 'GHS', spent: 612, percentage: 51 },
  { id: 'b5', profileId: 'p1', category: 'Tech & Software', limit: 600, currency: 'GHS', spent: 418.75, percentage: 70 },
  { id: 'b6', profileId: 'p1', category: 'Health & Wellness', limit: 1500, currency: 'GHS', spent: 1302.95, percentage: 87 },
];

const goals = [
  {
    id: 'g1',
    profileId: 'p1',
    name: 'Emergency Fund',
    target: 10000,
    current: 6200,
    currency: 'GHS',
    paystackDestination: { type: 'paystack_recipient', bankName: 'GTBank', accountLast4: '4471' },
  },
  {
    id: 'g2',
    profileId: 'p1',
    name: 'MacBook Pro',
    target: 6000,
    current: 2040,
    currency: 'GHS',
    deadline: new Date(new Date().getFullYear(), 11, 1).toISOString(),
    paystackDestination: { type: 'none' },
  },
  {
    id: 'g3',
    profileId: 'p1',
    name: 'Accra land deposit',
    target: 12500,
    current: 1000,
    currency: 'GHS',
    isLocked: true,
    paystackDestination: { type: 'paystack_recipient', bankName: 'Fidelity', accountLast4: '8802' },
  },
] as unknown as Goal[];

const debts = [
  { id: 'd1', profileId: 'p1' },
  { id: 'd2', profileId: 'p1' },
  { id: 'd3', profileId: 'p1' },
] as unknown as Debt[];

const noop = () => undefined;
const asyncNoop = async () => undefined;

const value = {
  profiles: [profile],
  activeProfile: profile,
  setActiveProfileId: noop,
  selectProfile: noop,
  unlockedProfileIds: ['p1'],
  pendingLockedProfile: null,
  setPendingLockedProfile: noop,
  unlockProfile: async () => true,
  lockProfile: noop,
  isProfileLockedForUser: () => false,
  profileModalOpen: false,
  setProfileModalOpen: noop,
  editingProfile: null,
  openCreateProfileModal: noop,
  openEditProfileModal: noop,
  closeProfileModal: noop,
  fetchProfiles: asyncNoop,
  transactions,
  budgets,
  goals,
  debts,
  summary,
  isLoading: false,
  refreshData: asyncNoop,
  notify: noop,
  showNotification: noop,
  notification: null,
  clearNotification: noop,
  loadData: asyncNoop,
} as unknown as LedgerContextType;

/** The empty-state variant, so first-run is reviewed as deliberately as the full one. */
const emptyValue = {
  ...value,
  transactions: [],
  budgets: [],
  goals: [],
  debts: [],
  summary: {
    ...summary,
    netBalance: 0,
    monthIncome: 0,
    monthExpense: 0,
    monthNet: 0,
    savingsRate: 0,
    totalSavedInGoals: 0,
    totalIOwe: 0,
    totalOwedToMe: 0,
    transactionCount: 0,
  },
} as unknown as LedgerContextType;

const Frame: React.FC<{ label: string; ctx: LedgerContextType }> = ({ label, ctx }) => (
  <section className="border-t border-line">
    <p className="t-eyebrow max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-7">{label}</p>
    <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      <LedgerContext.Provider value={ctx}>
        <Overview
          onNavigateTab={noop}
          onOpenNewTx={noop}
          onOpenNewBudget={noop}
          onOpenNewGoal={noop}
          onFundGoal={noop}
          onEditTx={noop}
        />
      </LedgerContext.Provider>
    </main>
  </section>
);

createRoot(document.getElementById('root')!).render(
  <div className="min-h-screen bg-canvas">
    <Frame label="Overview — populated" ctx={value} />
    <Frame label="Overview — first run, nothing recorded yet" ctx={emptyValue} />
  </div>
);
