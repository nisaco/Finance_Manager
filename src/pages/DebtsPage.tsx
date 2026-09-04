import React, { useState } from 'react';
import {
  Layers,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Calendar,
  Trash2,
  Edit2,
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

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#1A1A1A]" />
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#1A1A1A]">
              Debts & Credit Ledger
            </h1>
          </div>
          <p className="text-xs text-[#6B7280] font-mono-num mt-0.5">
            {activeProfile?.name} • Bilateral payables and receivables tracker
          </p>
        </div>

        <button
          onClick={onOpenNewDebt}
          className="px-3.5 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center space-x-1.5 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Record Debt / Credit</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white border border-[#E8E5DF] rounded-xl p-3.5 sm:p-4 shadow-sm flex items-center justify-between">
          <div className="min-w-0 mr-2">
            <div className="flex items-center space-x-1.5 text-xs text-[#15803D] font-bold mb-0.5 truncate">
              <ArrowUpRight className="w-4 h-4 shrink-0" />
              <span className="truncate">Owed to Me (Receivables)</span>
            </div>
            <div className="text-lg sm:text-xl font-mono-num font-bold text-[#1A1A1A] truncate">
              {formatCurrency(totalOwedToMe, currency)}
            </div>
          </div>
          <span className="text-[11px] text-[#6B7280] font-mono-num shrink-0">
            {debts.filter((d) => d.direction === 'owed_to_me').length} records
          </span>
        </div>

        <div className="bg-white border border-[#E8E5DF] rounded-xl p-3.5 sm:p-4 shadow-sm flex items-center justify-between">
          <div className="min-w-0 mr-2">
            <div className="flex items-center space-x-1.5 text-xs text-[#DC2626] font-bold mb-0.5 truncate">
              <ArrowDownLeft className="w-4 h-4 shrink-0" />
              <span className="truncate">I Owe (Payables)</span>
            </div>
            <div className="text-lg sm:text-xl font-mono-num font-bold text-[#1A1A1A] truncate">
              {formatCurrency(totalIOwe, currency)}
            </div>
          </div>
          <span className="text-[11px] text-[#6B7280] font-mono-num shrink-0">
            {debts.filter((d) => d.direction === 'i_owe').length} records
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-[#E8E5DF] pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
            filterTab === 'all'
              ? 'bg-[#F7F5F2] text-[#1A1A1A] border border-[#E8E5DF]'
              : 'text-[#6B7280] hover:text-[#1A1A1A]'
          }`}
        >
          All Debts ({debts.length})
        </button>
        <button
          onClick={() => setFilterTab('owed_to_me')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
            filterTab === 'owed_to_me'
              ? 'bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/20'
              : 'text-[#6B7280] hover:text-[#1A1A1A]'
          }`}
        >
          Owed to Me ({debts.filter((d) => d.direction === 'owed_to_me').length})
        </button>
        <button
          onClick={() => setFilterTab('i_owe')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
            filterTab === 'i_owe'
              ? 'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20'
              : 'text-[#6B7280] hover:text-[#1A1A1A]'
          }`}
        >
          I Owe ({debts.filter((d) => d.direction === 'i_owe').length})
        </button>
      </div>

      {/* Debts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredDebts.length === 0 ? (
          <div className="col-span-full bg-white border border-[#E8E5DF] rounded-xl p-8 sm:p-12 text-center text-[#6B7280] space-y-2 shadow-sm">
            <Layers className="w-8 h-8 text-[#D5D0C7] mx-auto" />
            <p className="text-sm font-medium">No debt or loan records found.</p>
          </div>
        ) : (
          filteredDebts.map((d) => {
            const isIOwe = d.direction === 'i_owe';
            const paid = d.paid || 0;
            const remaining = Math.max(0, d.amount - paid);
            const isSettled = remaining === 0;
            const pct = Math.min(100, Math.round((paid / d.amount) * 100));

            return (
              <div
                key={d.id}
                className={`bg-white border rounded-xl p-4 sm:p-5 shadow-sm space-y-4 flex flex-col justify-between ${
                  isSettled ? 'border-[#15803D]/40 bg-[#FDFCFB]' : 'border-[#E8E5DF]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-[#1A1A1A]">{d.person}</h3>
                      <span
                        className={`inline-flex items-center text-[10px] font-mono-num px-1.5 py-0.5 rounded mt-1 font-bold ${
                          isIOwe
                            ? 'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20'
                            : 'bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/20'
                        }`}
                      >
                        {isIOwe ? 'I Owe (Payable)' : 'Owed to Me (Receivable)'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onEditDebt(d)}
                        className="p-1 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F7F5F2] rounded transition-colors"
                        title="Edit Record"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="p-1 text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {d.note && (
                    <p className="text-xs text-[#6B7280] italic mt-2 line-clamp-2">
                      "{d.note}"
                    </p>
                  )}

                  {/* Numbers */}
                  <div className="mt-3 p-3 bg-[#FDFCFB] rounded-lg border border-[#E8E5DF] space-y-1">
                    <div className="flex justify-between text-xs font-mono-num">
                      <span className="text-[#6B7280]">Total Contract:</span>
                      <span className="text-[#1A1A1A] font-bold">
                        {formatCurrency(d.amount, d.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-mono-num">
                      <span className="text-[#6B7280]">Paid / Settled:</span>
                      <span className="text-[#15803D] font-semibold">
                        {formatCurrency(paid, d.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-mono-num pt-1 border-t border-[#E8E5DF]">
                      <span className="text-[#6B7280]">Remaining Balance:</span>
                      <span className={`font-bold ${isSettled ? 'text-[#15803D]' : 'text-[#1A1A1A]'}`}>
                        {isSettled ? 'FULLY SETTLED' : formatCurrency(remaining, d.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1 mt-3">
                    <div className="w-full bg-[#F7F5F2] rounded-full h-2 overflow-hidden border border-[#E8E5DF]">
                      <div
                        className="bg-[#15803D] h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-mono-num text-[#6B7280]">
                      <span className="font-semibold">{pct}% settled</span>
                      {d.dueDate && (
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-[#6B7280]" />
                          <span>Due {formatDate(d.dueDate)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!isSettled && (
                  <div className="pt-3 border-t border-[#E8E5DF]">
                    <button
                      onClick={() => onRecordPayment(d)}
                      className="w-full py-1.5 bg-[#F7F5F2] hover:bg-[#E8E5DF] text-[#1A1A1A] rounded border border-[#E8E5DF] text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Record Installment Payment</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
