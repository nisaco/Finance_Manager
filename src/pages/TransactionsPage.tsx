import React, { useState, useMemo } from 'react';
import { Search, Download, Upload, Plus, History, X } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { ReceiptRow } from '../components/ReceiptRow';
import { Transaction } from '../types';
import { formatCurrency } from '../design/tokens';
import { api } from '../api/client';

interface TransactionsPageProps {
  onOpenNewTx: () => void;
  onEditTx: (tx: Transaction) => void;
  onOpenCsvImport: () => void;
  onNavigateToHistory?: () => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  onOpenNewTx,
  onEditTx,
  onOpenCsvImport,
  onNavigateToHistory,
}) => {
  const { activeProfile, transactions, refreshData, notify } = useLedger();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const currency = activeProfile?.displayCurrency || 'GHS';

  // Distinct category list
  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => set.add(t.category));
    return Array.from(set).sort();
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (selectedType !== 'all' && t.type !== selectedType) return false;
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.category.toLowerCase().includes(q) ||
          t.note.toLowerCase().includes(q) ||
          t.amount.toString().includes(q)
        );
      }
      return true;
    });
  }, [transactions, selectedType, selectedCategory, dateFrom, dateTo, searchQuery]);

  // Totals for filtered records
  const { totalInflow, totalOutflow, net } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    filteredTransactions.forEach((t) => {
      if (t.type === 'income') inflow += t.amount;
      else outflow += t.amount;
    });
    return { totalInflow: inflow, totalOutflow: outflow, net: inflow - outflow };
  }, [filteredTransactions]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to permanently delete this transaction?')) {
      try {
        await api.deleteTransaction(id);
        notify('Transaction deleted from ledger');
        await refreshData();
      } catch (err: any) {
        notify(err.message || 'Delete failed', 'error');
      }
    }
  };

  const handleExportCsv = () => {
    if (!activeProfile) return;
    window.location.href = `/api/transactions/export?profileId=${activeProfile.id}`;
  };

  /* formatCurrency() is shared by the whole app and returns an unsigned
     string (it runs Math.abs internally), so a negative net used to render as
     a positive figure that was only distinguishable by its colour. Colour
     alone is not a signal, so the sign is stated here. Zero stays unsigned. */
  const signed = (value: number) => {
    const text = formatCurrency(Math.abs(value), currency);
    if (value > 0) return `+${text}`;
    if (value < 0) return `\u2212${text}`;
    return text;
  };

  const typeTabs: { id: 'all' | 'income' | 'expense'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'income', label: 'Money in' },
    { id: 'expense', label: 'Money out' },
  ];

  const isFiltered =
    searchQuery.trim() !== '' ||
    selectedType !== 'all' ||
    selectedCategory !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedCategory('all');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="space-y-5">
      {/* ---- Page header ---- */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="lg-row-icon">
              <History className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
            </span>
            <h1 className="t-title">Transactions</h1>
          </div>
          <p className="t-meta mt-2">
            Every entry in your ledger
            {activeProfile?.name ? ` · ${activeProfile.name}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onOpenCsvImport}
            className="lg-btn lg-btn-quiet lg-btn-sm"
            aria-label="Import transactions from a CSV file"
          >
            <Upload className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
            <span className="hidden sm:inline">Import</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="lg-btn lg-btn-quiet lg-btn-sm"
            aria-label="Export transactions to a CSV file"
          >
            <Download className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {onNavigateToHistory && (
            <button
              onClick={onNavigateToHistory}
              className="lg-btn lg-btn-quiet lg-btn-sm"
              aria-label="Open monthly history"
            >
              <History className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
              <span className="hidden sm:inline">History</span>
            </button>
          )}

          <button onClick={onOpenNewTx} className="lg-btn lg-btn-accent">
            <Plus className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
            New entry
          </button>
        </div>
      </header>

      {/* ---- Filters ---- */}
      <section className="lg-card p-4 sm:p-5 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search
            className="w-[18px] h-[18px] text-ink-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            strokeWidth={1.7}
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search a category, note or amount"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search transactions"
            className="lg-input pl-11"
          />
        </div>

        {/* Type */}
        <div className="lg-seg" role="tablist" aria-label="Filter by type">
          {typeTabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={selectedType === t.id}
              onClick={() => setSelectedType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Category and dates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="lg-label" htmlFor="tx-filter-category">
              Category
            </label>
            <select
              id="tx-filter-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="lg-select"
            >
              <option value="all">All categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="lg-label" htmlFor="tx-filter-from">
              From
            </label>
            <input
              id="tx-filter-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="lg-input num"
            />
          </div>

          {/* The "to" bound had state but no control, so the upper half of the
              date range could never be set. It has one now. */}
          <div>
            <label className="lg-label" htmlFor="tx-filter-to">
              To
            </label>
            <input
              id="tx-filter-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="lg-input num"
            />
          </div>
        </div>

        {isFiltered && (
          <button onClick={clearFilters} className="lg-btn lg-btn-ghost lg-btn-sm -ml-2.5">
            <X className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
            Clear filters
          </button>
        )}
      </section>

      {/* ---- What the filter selected ---- */}
      <section className="lg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="t-meta">
            Showing <span className="num font-bold text-ink">{filteredTransactions.length}</span> of{' '}
            <span className="num">{transactions.length}</span>{' '}
            {transactions.length === 1 ? 'entry' : 'entries'}
          </p>
          <span className="lg-tag">
            {selectedType === 'all' ? 'All entries' : selectedType === 'income' ? 'Income' : 'Expense'}
          </span>
        </div>

        <dl className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
          <div className="flex items-center justify-between gap-4 rounded-xl bg-sunken px-4 py-3 sm:block sm:py-3">
            <dt className="t-eyebrow">Money in</dt>
            <dd
              className="num t-card whitespace-nowrap sm:mt-1"
              style={{ color: 'var(--lg-pos)' }}
            >
              {totalInflow > 0 ? `+${formatCurrency(totalInflow, currency)}` : formatCurrency(totalInflow, currency)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-sunken px-4 py-3 sm:block sm:py-3">
            <dt className="t-eyebrow">Money out</dt>
            <dd
              className="num t-card whitespace-nowrap sm:mt-1"
              style={{ color: 'var(--lg-neg)' }}
            >
              {totalOutflow > 0 ? `\u2212${formatCurrency(totalOutflow, currency)}` : formatCurrency(totalOutflow, currency)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-sunken px-4 py-3 sm:block sm:py-3">
            <dt className="t-eyebrow">Net</dt>
            <dd
              className="num t-card whitespace-nowrap sm:mt-1"
              style={{
                color: net === 0 ? 'var(--lg-ink)' : net > 0 ? 'var(--lg-pos)' : 'var(--lg-neg)',
              }}
            >
              {signed(net)}
            </dd>
          </div>
        </dl>
      </section>

      {/* ---- The entries ---- */}
      <section className="lg-card">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <p className="t-card">{isFiltered ? 'Nothing matches' : 'No transactions yet'}</p>
            <p className="t-meta mt-1.5 max-w-sm mx-auto">
              {isFiltered
                ? 'Try widening the date range or clearing a filter.'
                : 'Record your first entry and this page fills itself in.'}
            </p>
            {isFiltered ? (
              <button onClick={clearFilters} className="lg-btn lg-btn-quiet mt-5">
                Clear filters
              </button>
            ) : (
              <button onClick={onOpenNewTx} className="lg-btn lg-btn-accent mt-5">
                <Plus className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
                New entry
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-line">
            {filteredTransactions.map((tx) => (
              <ReceiptRow
                key={tx.id}
                transaction={tx}
                displayCurrency={currency}
                onEdit={onEditTx}
                onDelete={handleDelete}
                showActions={true}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
