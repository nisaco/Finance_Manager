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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0 bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sunken border border-line flex items-center justify-center text-ink shrink-0">
              <FileSpreadsheet className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div>
              <h2 className="t-card">
                Import Ledger Transactions
              </h2>
              <span className="t-meta num block">
                Batch ingest statements into {activeProfile?.name || 'profile'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="lg-iconbtn" aria-label="Close dialog">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <p className="t-meta">
            Upload or paste CSV statements from bank exports or your previous Ledger backups. Format expected: <code className="text-ink bg-sunken px-1.5 py-0.5 rounded-md border border-line num text-xs break-all">ID,Date,Type,Category,Amount,Currency,Note</code>
          </p>

          {/* File Upload Zone */}
          <div className="border-2 border-dashed border-line hover:border-line-strong rounded-xl p-6 text-center cursor-pointer relative bg-sunken transition-colors">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <Upload className="w-7 h-7 text-ink-3 mx-auto mb-2 stroke-[1.8]" />
            <p className="t-card">
              Click to select a CSV file or drag and drop here
            </p>
            <p className="t-meta num mt-1">
              Supports statements from standard bank exports & spreadsheets
            </p>
          </div>

          {/* Raw Text Box */}
          <div>
            <label className="block t-eyebrow mb-1.5">
              Or Paste Raw CSV Data
            </label>
            <textarea
              rows={5}
              placeholder="Date,Type,Category,Amount,Currency,Note&#10;2026-08-01,expense,Groceries,450.00,GHS,Supermarket"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full bg-sunken text-ink p-3.5 rounded-xl border border-line text-xs num focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="lg-btn lg-btn-quiet lg-btn-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isImporting || !csvText.trim()}
              onClick={handleImport}
              className="lg-btn lg-btn-solid lg-btn-sm disabled:opacity-50"
            >
              {isImporting ? 'Importing Entries...' : 'Process Import'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
