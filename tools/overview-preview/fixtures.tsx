/**
 * Fixture data and context stubs for the design preview harness.
 *
 * Mocks the DATA only. Every component rendered against these fixtures is the
 * one the product ships, so what you see in the preview is what users get.
 * Not part of the application build.
 */
import React from 'react';
import { LedgerContext, type LedgerContextType } from '../../src/context/LedgerContext';
import { ThemeContext } from '../../src/context/ThemeContext';
import { AuthContext } from '../../src/context/AuthContext';
import type { Budget, Debt, Goal, Profile, SummaryReport, Transaction } from '../../src/types';

const iso = (day: number) => {
  const d = new Date();
  d.setDate(day);
  return d.toISOString();
};

export const noop = () => undefined;
const asyncNoop = async () => undefined;

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
): Transaction =>
  ({
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
  }) as Transaction;

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
] as unknown as Budget[];

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
  {
    id: 'd1',
    profileId: 'p1',
    direction: 'owed_to_me',
    person: 'Kwabena Mensah',
    amount: 2400,
    paid: 400,
    currency: 'GHS',
    dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5).toISOString(),
    note: 'Split the equipment purchase',
    createdAt: iso(2),
  },
  {
    id: 'd2',
    profileId: 'p1',
    direction: 'owed_to_me',
    person: 'Adinkra Labs',
    amount: 1550,
    paid: 400,
    currency: 'GHS',
    note: 'Second invoice, net 30',
    createdAt: iso(4),
  },
  {
    id: 'd3',
    profileId: 'p1',
    direction: 'i_owe',
    person: 'Ama Serwaa',
    amount: 1875,
    paid: 0,
    currency: 'GHS',
    dueDate: iso(2),
    note: 'Covered the rent shortfall',
    createdAt: iso(1),
  },
] as unknown as Debt[];

export const ledgerFull = {
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

/** First run. Reviewed as deliberately as the populated state. */
export const ledgerEmpty = {
  ...ledgerFull,
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

const themeValue = {
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: noop,
  toggleTheme: noop,
  uiStyle: 'modern',
  setUiStyle: noop,
  uiDensity: 'standard',
  setUiDensity: noop,
} as any;

const authValue = {
  user: { id: 'u1', username: 'jeffrey', email: 'jnkpappoe@gmail.com', role: 'admin' },
  isAuthenticated: true,
  isLoading: false,
  login: async () => ({ success: true }),
  adminLogin: async () => ({ success: true }),
  register: async () => ({ success: true }),
  logout: asyncNoop,
  setUserRole: async () => ({ success: true }),
  refreshUser: asyncNoop,
  loginWithGoogle: async () => ({ success: true }),
  updateUsername: async () => ({ success: true }),
} as any;

/** Wraps children in every provider the shell and pages read from. */
export const Providers: React.FC<{
  ledger: LedgerContextType;
  children: React.ReactNode;
}> = ({ ledger, children }) => (
  <AuthContext.Provider value={authValue}>
    <ThemeContext.Provider value={themeValue}>
      <LedgerContext.Provider value={ledger}>{children}</LedgerContext.Provider>
    </ThemeContext.Provider>
  </AuthContext.Provider>
);
