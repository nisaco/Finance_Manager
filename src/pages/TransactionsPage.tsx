import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  History,
} from 'lucide-react';
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

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-[#1A1A1A]" />
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#1A1A1A]">
              Ledger Transactions
            </h1>
          </div>
          <p className="text-xs text-[#6B7280] font-mono-num mt-0.5">
            {activeProfile?.name} • Double-entry itemized financial records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenCsvImport}
            className="flex-1 xs:flex-initial px-2.5 sm:px-3 py-2 bg-[#F7F5F2] hover:bg-[#E8E5DF] text-[#1A1A1A] rounded-lg border border-[#E8E5DF] text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex-1 xs:flex-initial px-2.5 sm:px-3 py-2 bg-[#F7F5F2] hover:bg-[#E8E5DF] text-[#1A1A1A] rounded-lg border border-[#E8E5DF] text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
            <span>Export CSV</span>
          </button>

          {onNavigateToHistory && (
            <button
              onClick={onNavigateToHistory}
              className="flex-1 xs:flex-initial px-2.5 sm:px-3 py-2 bg-[#F7F5F2] hover:bg-[#E8E5DF] text-[#1A1A1A] rounded-lg border border-[#E8E5DF] text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <History className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
              <span>Monthly History</span>
            </button>
          )}

          <button
            onClick={onOpenNewTx}
            className="w-full xs:w-auto px-3.5 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span>Record Entry</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#E8E5DF] rounded-xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search category, note, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FDFCFB] text-[#1A1A1A] pl-9 pr-3 py-2 rounded-lg border border-[#E8E5DF] text-xs focus:outline-none focus:border-[#1A1A1A]"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-xs focus:outline-none focus:border-[#1A1A1A]"
            >
              <option value="all">All Types (Inflow & Outflow)</option>
              <option value="expense">Expenses Only (Outflow)</option>
              <option value="income">Incomes Only (Inflow)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-xs focus:outline-none focus:border-[#1A1A1A]"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Start */}
          <div>
            <input
              type="date"
              title="From date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-[#FDFCFB] text-[#1A1A1A] px-3 py-2 rounded-lg border border-[#E8E5DF] text-xs font-mono-num focus:outline-none focus:border-[#1A1A1A]"
            />
          </div>

        </div>

        {/* Filter Summary Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#E8E5DF] text-xs text-[#6B7280] font-mono-num">
          <div>
            Showing <span className="text-[#1A1A1A] font-bold">{filteredTransactions.length}</span> of {transactions.length} entries
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Inflow: <span className="text-[#15803D] font-bold">+{formatCurrency(totalInflow, currency)}</span></span>
            <span>Outflow: <span className="text-[#B91C1C] font-bold">-{formatCurrency(totalOutflow, currency)}</span></span>
            <span>Net: <span className={net >= 0 ? 'text-[#15803D] font-bold' : 'text-[#B91C1C] font-bold'}>{formatCurrency(net, currency)}</span></span>
          </div>
        </div>
      </div>

      {/* Transactions List (Receipt Aesthetic) */}
      <div className="bg-white border border-[#E8E5DF] rounded-xl p-3 sm:p-5 shadow-sm space-y-2">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 space-y-2 text-[#6B7280]">
            <Receipt className="w-8 h-8 text-[#D5D0C7] mx-auto" />
            <p className="text-sm">No ledger entries match your filter criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E8E5DF]">
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
      </div>

    </div>
  );
};
