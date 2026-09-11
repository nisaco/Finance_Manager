import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Calendar,
  Search,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  PieChart,
  Layers,
  ChevronRight,
  RefreshCw,
  Sparkles,
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
  const { activeProfile, summary, transactions: allTx, notify, refreshData } = useLedger();

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
        // Keep current selected month if still present, else default to first (newest)
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
          t.note.toLowerCase().includes(q) ||
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
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-[#EFECE6] dark:bg-[#20242E] text-[#1A1A1A] dark:text-[#F3F4F6]">
              <History className="w-5 h-5 text-[#1A1A1A] dark:text-[#F3F4F6]" />
            </span>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#1A1A1A] dark:text-[#F3F4F6]">
              Monthly Financial History
            </h1>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Complete monthly archives of your cash flow. Select any month to view everything that happened in that period.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadHistory}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#1A1D24] text-[#1A1A1A] dark:text-[#F3F4F6] hover:bg-[#F7F5F0] dark:hover:bg-[#252830] transition-colors"
            title="Refresh History"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {onNavigateToSettings && (
            <button
              onClick={onNavigateToSettings}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#1A1D24] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] hover:bg-[#F7F5F0] dark:hover:bg-[#252830] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF]" />
              <span>Reset Balance Settings</span>
            </button>
          )}
        </div>
      </div>

      {/* Assurance Banner */}
      <div className="p-3.5 sm:p-4 rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] bg-gradient-to-r from-[#F9F8F6] to-[#F3F0E9] dark:from-[#16181E] dark:to-[#1A1D24] flex items-start space-x-3 text-xs">
        <ShieldCheck className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">
            Zero Data Loss Guarantee
          </div>
          <div className="text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
            Your monthly active net balance resets each new month (or when reset manually in settings) so you can track fresh monthly cycles. 
            <strong> All historical records are permanently saved here</strong>, and your <strong>savings vaults and debts are never reset</strong>.
          </div>
        </div>
      </div>

      {/* Month Selector Carousel / Grid */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Select Statement Month ({historyMonths.length} Archives)</span>
          </div>
          <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
            Click any month to inspect details
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-[#EFECE6]/50 dark:bg-[#20242E]/50 animate-pulse border border-[#E8E5DF] dark:border-[#2D323F]"
              />
            ))}
          </div>
        ) : historyMonths.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#16181E]">
            <Calendar className="w-8 h-8 text-[#6B7280] dark:text-[#9CA3AF] mx-auto mb-2 opacity-50" />
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              No transactions recorded yet in this profile. Transactions will automatically group by month here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {historyMonths.map((m) => {
              const isSelected = m.yearMonth === selectedMonthKey;
              const isPositive = m.net >= 0;

              return (
                <button
                  key={m.yearMonth}
                  onClick={() => setSelectedMonthKey(m.yearMonth)}
                  className={`text-left p-3.5 rounded-xl border transition-all relative overflow-hidden group ${
                    isSelected
                      ? 'bg-white dark:bg-[#1A1D24] border-[#1A1A1A] dark:border-[#FFFFFF] shadow-md ring-1 ring-[#1A1A1A] dark:ring-[#FFFFFF]'
                      : 'bg-white/80 dark:bg-[#16181E] border-[#E8E5DF] dark:border-[#2D323F] hover:border-[#BDB7AB] dark:hover:border-[#4B5563] hover:shadow-sm'
                  }`}
                >
                  {/* Active Month Indicator Pill */}
                  {m.isCurrentMonth && (
                    <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold tracking-wider uppercase bg-[#1A1A1A] text-white dark:bg-[#FFFFFF] dark:text-[#111317]">
                      Current
                    </span>
                  )}

                  <div className="text-xs font-semibold text-[#1A1A1A] dark:text-[#F3F4F6] pr-12">
                    {m.label}
                  </div>
                  <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                    {m.transactionCount} {m.transactionCount === 1 ? 'transaction' : 'transactions'}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#E8E5DF]/60 dark:border-[#2D323F]/60 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider">
                        Net Cash Flow
                      </div>
                      <div
                        className={`text-xs font-semibold font-mono-num ${
                          isPositive ? 'text-[#22C55E]' : 'text-[#DC2626]'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {formatCurrency(m.net, currency)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider">
                        Savings Rate
                      </div>
                      <div className="text-xs font-medium font-mono-num text-[#1A1A1A] dark:text-[#F3F4F6]">
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
        <div className="bg-white dark:bg-[#16181E] rounded-2xl border border-[#E8E5DF] dark:border-[#2D323F] shadow-sm overflow-hidden">
          {/* Statement Header Card */}
          <div className="p-4 sm:p-6 border-b border-[#E8E5DF] dark:border-[#2D323F] bg-gradient-to-b from-[#FDFCFB] to-[#F7F5F0] dark:from-[#1A1D24] dark:to-[#16181E]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg sm:text-xl font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                    {selectedMonth.label} Statement
                  </h2>
                  {selectedMonth.isCurrentMonth && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      Active Cycle
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                  Archived period statement • {selectedMonth.transactionCount} transactions recorded
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportMonthCsv}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[#1A1A1A] text-white dark:bg-[#FFFFFF] dark:text-[#111317] hover:opacity-90 transition-opacity shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export {selectedMonth.label} (CSV)</span>
                </button>
              </div>
            </div>

            {/* 4 Quick Stat Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <div className="p-3 rounded-xl bg-white dark:bg-[#20242E] border border-[#E8E5DF] dark:border-[#2D323F]">
                <div className="text-[10px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider flex items-center space-x-1">
                  <ArrowUpRight className="w-3 h-3 text-[#22C55E]" />
                  <span>Total Inflow</span>
                </div>
                <div className="text-sm sm:text-base font-bold font-mono-num text-[#22C55E] mt-1">
                  +{formatCurrency(selectedMonth.income, currency)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-[#20242E] border border-[#E8E5DF] dark:border-[#2D323F]">
                <div className="text-[10px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider flex items-center space-x-1">
                  <ArrowDownRight className="w-3 h-3 text-[#DC2626]" />
                  <span>Total Outflow</span>
                </div>
                <div className="text-sm sm:text-base font-bold font-mono-num text-[#DC2626] mt-1">
                  -{formatCurrency(selectedMonth.expense, currency)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-[#20242E] border border-[#E8E5DF] dark:border-[#2D323F]">
                <div className="text-[10px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider">
                  Net Balance
                </div>
                <div
                  className={`text-sm sm:text-base font-bold font-mono-num mt-1 ${
                    selectedMonth.net >= 0 ? 'text-[#22C55E]' : 'text-[#DC2626]'
                  }`}
                >
                  {selectedMonth.net >= 0 ? '+' : ''}
                  {formatCurrency(selectedMonth.net, currency)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-[#20242E] border border-[#E8E5DF] dark:border-[#2D323F]">
                <div className="text-[10px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider">
                  Savings Retained
                </div>
                <div className="text-sm sm:text-base font-bold font-mono-num text-[#1A1A1A] dark:text-[#F3F4F6] mt-1">
                  {selectedMonth.savingsRate}%
                </div>
              </div>
            </div>
          </div>

          {/* Subtabs: Itemized Ledger vs Category Breakdown */}
          <div className="px-4 sm:px-6 pt-4 border-b border-[#E8E5DF] dark:border-[#2D323F] flex items-center justify-between">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveSubTab('ledger')}
                className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeSubTab === 'ledger'
                    ? 'border-[#1A1A1A] text-[#1A1A1A] dark:border-[#FFFFFF] dark:text-[#FFFFFF]'
                    : 'border-transparent text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#FFFFFF]'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Itemized Transactions ({selectedMonth.transactions.length})</span>
              </button>

              <button
                onClick={() => setActiveSubTab('breakdown')}
                className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeSubTab === 'breakdown'
                    ? 'border-[#1A1A1A] text-[#1A1A1A] dark:border-[#FFFFFF] dark:text-[#FFFFFF]'
                    : 'border-transparent text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#FFFFFF]'
                }`}
              >
                <PieChart className="w-3.5 h-3.5" />
                <span>Spending by Category ({selectedMonth.categoryBreakdown.length})</span>
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
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-[#9CA3AF]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search ${selectedMonth.label} transactions...`}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#1A1D24] text-[#1A1A1A] dark:text-[#F3F4F6] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] dark:focus:ring-[#FFFFFF]"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="px-3 py-2 rounded-xl text-xs border border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#1A1D24] text-[#1A1A1A] dark:text-[#F3F4F6] focus:outline-none"
                    >
                      <option value="all">All Types</option>
                      <option value="income">Income Only</option>
                      <option value="expense">Expenses Only</option>
                    </select>

                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="px-3 py-2 rounded-xl text-xs border border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#1A1D24] text-[#1A1A1A] dark:text-[#F3F4F6] focus:outline-none"
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
                  <div className="py-12 text-center text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    No transactions match your search or filter in {selectedMonth.label}.
                  </div>
                ) : (
                  <div className="divide-y divide-[#E8E5DF]/60 dark:divide-[#2D323F]/60 border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl overflow-hidden">
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
              /* Category Breakdown Tab */
              <div className="space-y-4">
                {selectedMonth.categoryBreakdown.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    No expenses recorded in {selectedMonth.label}.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedMonth.categoryBreakdown.map((cat) => {
                      const color = getCategoryColor(cat.category);
                      return (
                        <div
                          key={cat.category}
                          className="p-4 rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#1A1D24] space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span className="font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">
                                {cat.category}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold font-mono-num text-[#1A1A1A] dark:text-[#F3F4F6]">
                                {formatCurrency(cat.amount, currency)}
                              </span>
                              <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] ml-1.5 font-mono-num">
                                ({cat.percentage}%)
                              </span>
                            </div>
                          </div>

                          <div className="w-full bg-[#EFECE6] dark:bg-[#20242E] h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(100, Math.max(2, cat.percentage))}%`,
                                backgroundColor: color,
                              }}
                            />
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
