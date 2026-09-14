import React, { useState, useMemo } from 'react';
import { Search, Download, Upload, Plus, History, X, ChevronDown, FileSpreadsheet, FileText, File } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { ReceiptRow } from '../components/ReceiptRow';
import { Transaction } from '../types';
import { formatCurrency } from '../design/tokens';
import { api } from '../api/client';
import { exportTransactionsCsv, exportTransactionsExcel, exportTransactionsPdf } from '../utils/exportTransactions';

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
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

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

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (!activeProfile) return;
    setExportDropdownOpen(false);

    const exportData = {
      profile: activeProfile,
      transactions: filteredTransactions,
      title: `${activeProfile.name} Transactions Statement`,
      subtitle: isFiltered
        ? `Filtered View (${filteredTransactions.length} entries)`
        : `Complete Transaction Record (${filteredTransactions.length} entries)`,
      filenamePrefix: `transactions_${activeProfile.name.toLowerCase()}`,
    };

    try {
      if (format === 'csv') {
        exportTransactionsCsv(exportData);
        notify(`Exported ${filteredTransactions.length} entries as CSV`);
      } else if (format === 'excel') {
        exportTransactionsExcel(exportData);
        notify(`Exported ${filteredTransactions.length} entries as Excel spreadsheet (.xlsx)`);
      } else if (format === 'pdf') {
        exportTransactionsPdf(exportData);
        notify(`Generated and downloaded PDF Statement`);
      }
    } catch (err: any) {
      notify(`Export failed: ${err.message}`, 'error');
    }
  };

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
            aria-label="Import transactions from CSV or Excel file"
          >
            <Upload className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
            <span className="hidden sm:inline">Import (CSV / Excel)</span>
            <span className="sm:hidden">Import</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="lg-btn lg-btn-quiet lg-btn-sm"
              aria-label="Export transactions in various formats"
              aria-expanded={exportDropdownOpen}
            >
              <Download className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} strokeWidth={1.7} />
            </button>

            {exportDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setExportDropdownOpen(false)}
                />
                <div className="lg-pop fixed sm:absolute right-3 sm:right-0 left-3 sm:left-auto mt-2 sm:w-56 z-50 overflow-hidden shadow-2xl">
                  <div className="px-3.5 py-2 border-b border-line">
                    <span className="t-eyebrow block">Export Format</span>
                    <span className="t-meta text-[11px] block text-ink-3">
                      {filteredTransactions.length} entries selected
                    </span>
                  </div>

                  <div className="p-1.5 space-y-1">
                    <button
                      onClick={() => handleExport('csv')}
                      className="lg-row w-full text-left"
                    >
                      <File className="w-4 h-4 text-accent shrink-0" strokeWidth={1.8} />
                      <div className="flex-1 min-w-0">
                        <span className="t-body block text-xs font-bold text-ink">CSV File (.csv)</span>
                        <span className="t-meta block text-[11px]">Standard delimited table</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleExport('excel')}
                      className="lg-row w-full text-left"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-pos shrink-0" strokeWidth={1.8} />
                      <div className="flex-1 min-w-0">
                        <span className="t-body block text-xs font-bold text-ink">Excel Workbook (.xlsx)</span>
                        <span className="t-meta block text-[11px]">Formatted with summaries</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleExport('pdf')}
                      className="lg-row w-full text-left"
                    >
                      <FileText className="w-4 h-4 text-warn shrink-0" strokeWidth={1.8} />
                      <div className="flex-1 min-w-0">
                        <span className="t-body block text-xs font-bold text-ink">PDF Statement (.pdf)</span>
                        <span className="t-meta block text-[11px]">Printable formal report</span>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

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

          <button onClick={onOpenNewTx} className="lg-btn lg-btn-accent lg-btn-sm">
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
            className="lg-input pl-11 text-xs"
          />
        </div>

        {/* Type */}
        <div className="lg-seg" role="tablist" aria-label="Filter by type">
          {typeTabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={selectedType === t.id}
              className={`lg-seg-btn ${selectedType === t.id ? 'active' : ''}`}
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
              className="lg-select text-xs"
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
              className="lg-input num text-xs"
            />
          </div>

          <div>
            <label className="lg-label" htmlFor="tx-filter-to">
              To
            </label>
            <input
              id="tx-filter-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="lg-input num text-xs"
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
          <p className="t-meta text-xs">
            Showing <span className="num font-bold text-ink">{filteredTransactions.length}</span> of{' '}
            <span className="num">{transactions.length}</span>{' '}
            {transactions.length === 1 ? 'entry' : 'entries'}
          </p>
          <span className="lg-tag text-[10px]">
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
            <p className="t-meta mt-1.5 max-w-sm mx-auto text-xs">
              {isFiltered
                ? 'Try widening the date range or clearing a filter.'
                : 'Record your first entry and this page fills itself in.'}
            </p>
            {isFiltered ? (
              <button onClick={clearFilters} className="lg-btn lg-btn-quiet lg-btn-sm mt-5">
                Clear filters
              </button>
            ) : (
              <button onClick={onOpenNewTx} className="lg-btn lg-btn-accent lg-btn-sm mt-5">
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
