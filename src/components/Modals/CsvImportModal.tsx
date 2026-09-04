import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLedger } from '../../context/LedgerContext';
import { api } from '../../api/client';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const { activeProfile, refreshData, notify } = useLedger();
  const [csvText, setCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!activeProfile || !csvText.trim()) {
      notify('Please select or paste CSV content first', 'error');
      return;
    }

    setIsImporting(true);
    try {
      const res = await api.importTransactionsCsv(activeProfile.id, csvText);
      notify(`Imported ${res.count} transactions into ${activeProfile.name}`);
      await refreshData();
      onClose();
    } catch (err: any) {
      notify(err.message || 'Import failed', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A1A1A]/40 backdrop-blur-xs">
      <div className="bg-white border border-[#E8E5DF] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#E8E5DF] shrink-0">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-[#1A1A1A]" />
            <h2 className="font-display text-base sm:text-lg font-bold text-[#1A1A1A]">
              Import Ledger Transactions
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-1 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F7F5F2] rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          <p className="text-xs text-[#6B7280]">
            Upload or paste CSV statements from bank exports or your previous Ledger backups. Format expected: <code className="text-[#1A1A1A] bg-[#F7F5F2] px-1 py-0.5 rounded border border-[#E8E5DF] font-mono-num break-all">ID,Date,Type,Category,Amount,Currency,Note</code>
          </p>

          {/* File Upload Zone */}
          <div className="border-2 border-dashed border-[#E8E5DF] hover:border-[#1A1A1A] rounded-lg p-4 text-center cursor-pointer relative bg-[#FDFCFB] transition-colors">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <Upload className="w-6 h-6 text-[#1A1A1A] mx-auto mb-1.5" />
            <p className="text-xs font-bold text-[#1A1A1A]">
              Click to select a CSV file or drag and drop here
            </p>
            <p className="text-[11px] text-[#6B7280] font-mono-num mt-0.5">
              Supports statements from standard bank exports
            </p>
          </div>

          {/* Raw Text Box */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#6B7280] font-mono-num mb-1 font-bold">
              Or Paste Raw CSV Data
            </label>
            <textarea
              rows={5}
              placeholder="Date,Type,Category,Amount,Currency,Note&#10;2026-08-01,expense,Groceries,450.00,GHS,Supermarket"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full bg-[#FDFCFB] text-[#1A1A1A] p-3 rounded-lg border border-[#E8E5DF] text-xs font-mono-num focus:outline-none focus:border-[#1A1A1A]"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E8E5DF]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-bold text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F7F5F2]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isImporting || !csvText.trim()}
              onClick={handleImport}
              className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#FFFFFF] rounded-md text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {isImporting ? 'Importing Entries...' : 'Process Import'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
