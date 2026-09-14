import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Search,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Receipt,
  PieChart,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { api } from '../api/client';
import { MonthlyHistoryRecord, Transaction } from '../types';
import { formatCurrency, getCategoryColor } from '../design/tokens';
import { ReceiptRow } from '../components/ReceiptRow';

interface HistoryPageProps {
  onEditTx?: (tx: Transaction) => void;
  onNavigateToSettings?: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onEditTx, onNavigateToSettings }) => {
  const { activeProfile, transactions: allTx, notify } = useLedger();

  const [historyMonths, setHistoryMonths] = useState<MonthlyHistoryRecord[]>([]);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'breakdown'>('ledger');

  const currency = activeProfile?.displayCurrency || 'GHS';

  // Load monthly history from API
  const loadHistory = async () => {
    if (!activeProfile) return;
    setIsLoading(true);
    try {
      const res = await api.getMonthlyHistory(activeProfile.id);
      setHistoryMonths(res.months || []);
      if (res.months && res.months.length > 0) {
        setSelectedMonthKey((prev) => {
          if (prev && res.months.some((m) => m.yearMonth === prev)) return prev;
          return res.months[0].yearMonth;
        });
      }
    } catch (err: any) {
      notify(err.message || 'Failed to load monthly history', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [activeProfile?.id, allTx.length]);

  // Selected month data
  const selectedMonth = useMemo(() => {
    return historyMonths.find((m) => m.yearMonth === selectedMonthKey) || historyMonths[0] || null;
  }, [historyMonths, selectedMonthKey]);

  // Categories in selected month
  const availableCategories = useMemo(() => {
    if (!selectedMonth) return [];
    const set = new Set<string>();
    selectedMonth.transactions.forEach((t) => set.add(t.category));
    return Array.from(set).sort();
  }, [selectedMonth]);

  // Filtered transactions for the selected month
  const filteredTransactions = useMemo(() => {
    if (!selectedMonth) return [];
    return selectedMonth.transactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.category.toLowerCase().includes(q) ||
          (t.note || '').toLowerCase().includes(q) ||
          t.amount.toString().includes(q)
        );
      }
      return true;
    });
  }, [selectedMonth, filterType, filterCategory, searchQuery]);

  // Export current month as CSV
  const handleExportMonthCsv = () => {
    if (!selectedMonth) return;
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Currency', 'Notes', 'Payment Method'];
    const rows = selectedMonth.transactions.map((t) => [
      t.date,
      t.type,
      `"${t.category.replace(/"/g, '""')}"`,
      t.amount,
      t.currency,
      `"${(t.note || '').replace(/"/g, '""')}"`,
      (t as any).paymentMethod || 'cash',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial-statement-${selectedMonth.yearMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify(`Downloaded ${selectedMonth.label} CSV statement`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="t-title text-ink font-bold">Monthly Financial History</h1>
          <p className="t-meta text-ink-3 mt-1">
            Archived records of past monthly billing cycles. Select any month to inspect detailed cash flow.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadHistory}
            disabled={isLoading}
            className="lg-btn lg-btn-quiet text-xs"
            title="Refresh History"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} strokeWidth={1.7} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {onNavigateToSettings && (
            <button
              type="button"
              onClick={onNavigateToSettings}
              className="lg-btn lg-btn-ghost text-xs text-ink-3"
            >
              <RotateCcw className="w-3.5 h-3.5 text-ink-3" strokeWidth={1.7} />
              <span>Reset Settings</span>
            </button>
          )}
        </div>
      </div>

      {/* Assurance Banner */}
      <div className="lg-card p-4 bg-sunken flex items-start gap-3 text-xs">
        <ShieldCheck className="w-5 h-5 text-pos shrink-0 mt-0.5" strokeWidth={1.7} />
        <div className="space-y-1">
          <div className="font-semibold text-ink">
            Permanent Historical Archive
          </div>
          <div className="text-ink-3 leading-relaxed">
            Your monthly active net balance resets each new cycle so you can track fresh budgets. 
            All historical transactions remain permanently preserved and searchable here.
          </div>
        </div>
      </div>

      {/* Month Selector Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="t-eyebrow text-ink-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" strokeWidth={1.7} />
            <span>Select Statement Month ({historyMonths.length} Archives)</span>
          </div>
          <span className="text-xs text-ink-3">
            Click a month to inspect
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-sunken animate-pulse border border-line"
              />
            ))}
          </div>
        ) : historyMonths.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-line bg-surface">
            <Calendar className="w-8 h-8 text-ink-4 mx-auto mb-2" strokeWidth={1.7} />
            <p className="text-xs text-ink-3">
              No transactions recorded yet in this profile. Transactions will automatically group by month here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {historyMonths.map((m) => {
              const isSelected = m.yearMonth === selectedMonthKey;
              const isPositive = m.net > 0;
              const isNegative = m.net < 0;

              return (
                <button
                  type="button"
                  key={m.yearMonth}
                  onClick={() => setSelectedMonthKey(m.yearMonth)}
                  className={`text-left p-3.5 rounded-xl border transition-all relative overflow-hidden ${
                    isSelected
                      ? 'bg-surface border-ink shadow-xs ring-1 ring-ink'
                      : 'bg-surface border-line hover:border-line-strong hover:bg-sunken'
                  }`}
                >
                  {/* Active Month Indicator Pill */}
                  {m.isCurrentMonth && (
                    <span className="absolute top-2.5 right-2.5 lg-tag bg-ink text-surface">
                      Current
                    </span>
                  )}

                  <div className="text-xs font-bold text-ink pr-12">
                    {m.label}
                  </div>
                  <div className="text-xs text-ink-3 mt-0.5">
                    {m.transactionCount} {m.transactionCount === 1 ? 'transaction' : 'transactions'}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between">
                    <div>
                      <div className="text-xs text-ink-3">
                        Net Flow
                      </div>
                      <div
                        className={`text-xs num font-bold ${
                          isPositive ? 'text-pos' : isNegative ? 'text-neg' : 'text-ink'
                        }`}
                      >
                        {isPositive ? '+' : isNegative ? '−' : ''}
                        {formatCurrency(Math.abs(m.net), currency)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-ink-3">
                        Savings Rate
                      </div>
                      <div className="text-xs num font-semibold text-ink">
                        {m.savingsRate}%
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Deep-Dive Statement For Selected Month */}
      {selectedMonth && (
        <div className="lg-card overflow-hidden">
          {/* Statement Header Card */}
          <div className="p-4 sm:p-6 border-b border-line bg-sunken space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="t-card font-bold text-ink">
                    {selectedMonth.label} Statement
                  </h2>
                  {selectedMonth.isCurrentMonth && (
                    <span className="lg-tag bg-pos-soft text-pos border-line">
                      Active Cycle
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-3 mt-1">
                  Archived period statement · {selectedMonth.transactionCount} transactions recorded
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportMonthCsv}
                  className="lg-btn lg-btn-solid text-xs"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.7} />
                  <span>Export {selectedMonth.label} (CSV)</span>
                </button>
              </div>
            </div>

            {/* 4 Quick Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-surface border border-line">
                <div className="text-xs text-ink-3 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-pos" strokeWidth={1.7} />
                  <span>Total Inflow</span>
                </div>
                <div className="text-sm sm:text-base num font-bold text-pos mt-1">
                  +{formatCurrency(selectedMonth.income, currency)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-line">
                <div className="text-xs text-ink-3 flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5 text-neg" strokeWidth={1.7} />
                  <span>Total Outflow</span>
                </div>
                <div className="text-sm sm:text-base num font-bold text-neg mt-1">
                  -{formatCurrency(selectedMonth.expense, currency)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-line">
                <div className="text-xs text-ink-3">
                  Net Balance
                </div>
                <div
                  className={`text-sm sm:text-base num font-bold mt-1 ${
                    selectedMonth.net > 0 ? 'text-pos' : selectedMonth.net < 0 ? 'text-neg' : 'text-ink'
                  }`}
                >
                  {selectedMonth.net > 0 ? '+' : selectedMonth.net < 0 ? '−' : ''}
                  {formatCurrency(Math.abs(selectedMonth.net), currency)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-line">
                <div className="text-xs text-ink-3">
                  Savings Retained
                </div>
                <div className="text-sm sm:text-base num font-bold text-ink mt-1">
                  {selectedMonth.savingsRate}%
                </div>
              </div>
            </div>
          </div>

          {/* Subtabs: Itemized Ledger vs Category Breakdown */}
          <div className="px-4 sm:px-6 pt-4 border-b border-line">
            <div className="lg-seg max-w-md">
              <button
                type="button"
                onClick={() => setActiveSubTab('ledger')}
                className={`lg-seg-btn ${activeSubTab === 'ledger' ? 'active' : ''}`}
              >
                <Receipt className="w-3.5 h-3.5 mr-1" strokeWidth={1.7} />
                <span>Transactions ({selectedMonth.transactions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('breakdown')}
                className={`lg-seg-btn ${activeSubTab === 'breakdown' ? 'active' : ''}`}
              >
                <PieChart className="w-3.5 h-3.5 mr-1" strokeWidth={1.7} />
                <span>Category Spend ({selectedMonth.categoryBreakdown.length})</span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6">
            {activeSubTab === 'ledger' ? (
              <div className="space-y-4">
                {/* Search & In-Month Filters */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" strokeWidth={1.7} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search ${selectedMonth.label} transactions...`}
                      className="lg-input w-full pl-9"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="lg-select"
                    >
                      <option value="all">All Types</option>
                      <option value="income">Income Only</option>
                      <option value="expense">Expenses Only</option>
                    </select>

                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="lg-select"
                    >
                      <option value="all">All Categories</option>
                      {availableCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Transactions Table / List */}
                {filteredTransactions.length === 0 ? (
                  <div className="py-12 text-center text-xs text-ink-3">
                    No transactions match your search or filter in {selectedMonth.label}.
                  </div>
                ) : (
                  <div className="border border-line rounded-xl overflow-hidden bg-surface divide-y divide-line">
                    {filteredTransactions.map((tx) => (
                      <ReceiptRow
                        key={tx.id}
                        transaction={tx}
                        displayCurrency={currency}
                        onEdit={onEditTx ? () => onEditTx(tx) : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Category Breakdown Tab - No progress bars, clean figures */
              <div className="space-y-4">
                {selectedMonth.categoryBreakdown.length === 0 ? (
                  <div className="py-12 text-center text-xs text-ink-3">
                    No expenses recorded in {selectedMonth.label}.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {selectedMonth.categoryBreakdown.map((cat) => {
                      const color = getCategoryColor(cat.category);
                      return (
                        <div
                          key={cat.category}
                          className="p-4 rounded-xl border border-line bg-sunken flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                              aria-hidden="true"
                            />
                            <span className="t-card font-semibold text-ink truncate">
                              {cat.category}
                            </span>
                          </div>
                          <div className="text-right shrink-0 pl-3">
                            <div className="num font-bold text-ink text-sm">
                              {formatCurrency(cat.amount, currency)}
                            </div>
                            <div className="num text-xs font-semibold text-ink-3 mt-0.5">
                              {cat.percentage}% of spend
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
