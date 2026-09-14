import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
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
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedCount, setParsedCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const lowerName = file.name.toLowerCase();

    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csvData = XLSX.utils.sheet_to_csv(worksheet);
          setCsvText(csvData);

          // Estimate rows
          const lines = csvData.trim().split('\n').filter((l) => l.trim().length > 0);
          setParsedCount(Math.max(0, lines.length - 1));
          notify(`Parsed Excel sheet "${firstSheetName}" with ${Math.max(0, lines.length - 1)} rows`);
        } catch (err: any) {
          notify('Failed to parse Excel file. Please ensure it is a valid spreadsheet.', 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Standard CSV or text
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvText(text);
        const lines = text.trim().split('\n').filter((l) => l.trim().length > 0);
        setParsedCount(Math.max(0, lines.length - 1));
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    if (!activeProfile || !csvText.trim()) {
      notify('Please select or paste statement data first', 'error');
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
              <FileSpreadsheet className="w-5 h-5 stroke-[1.8] text-accent" />
            </div>
            <div>
              <h2 className="t-card font-bold">
                Import Transactions (CSV &amp; Excel)
              </h2>
              <span className="t-meta num block text-xs">
                Batch ingest statements into {activeProfile?.name || 'profile'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="lg-iconbtn" aria-label="Close dialog">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <p className="t-meta text-xs leading-relaxed">
            Upload CSV or Excel spreadsheets (<code className="text-ink bg-sunken px-1.5 py-0.5 rounded-md border border-line num text-xs">.xlsx</code>, <code className="text-ink bg-sunken px-1.5 py-0.5 rounded-md border border-line num text-xs">.xls</code>, <code className="text-ink bg-sunken px-1.5 py-0.5 rounded-md border border-line num text-xs">.csv</code>). Standard expected headers: <code className="text-ink bg-sunken px-1.5 py-0.5 rounded-md border border-line num text-xs break-all">Date, Type, Category, Amount, Currency, Note</code>
          </p>

          {/* File Upload Zone */}
          <div className="border-2 border-dashed border-line hover:border-line-strong rounded-xl p-6 text-center cursor-pointer relative bg-sunken transition-colors">
            <input
              type="file"
              accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <Upload className="w-7 h-7 text-accent mx-auto mb-2 stroke-[1.8]" />
            <p className="t-card text-sm font-bold">
              {fileName ? fileName : 'Click to select CSV or Excel (.xlsx / .xls) file'}
            </p>
            <p className="t-meta num mt-1 text-xs">
              {parsedCount !== null
                ? `Detected ~${parsedCount} entries ready for import`
                : 'Drag and drop bank statements, exports, or spreadsheets here'}
            </p>
          </div>

          {/* Raw Text Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="t-eyebrow">
                Statement Data Preview
              </label>
              {csvText && (
                <button
                  type="button"
                  onClick={() => {
                    setCsvText('');
                    setFileName(null);
                    setParsedCount(null);
                  }}
                  className="text-xs text-ink-3 hover:text-ink underline"
                >
                  Clear
                </button>
              )}
            </div>
            <textarea
              rows={5}
              placeholder="Date,Type,Category,Amount,Currency,Note&#10;2026-08-01,expense,Groceries,450.00,GHS,Supermarket"
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                const lines = e.target.value.trim().split('\n').filter((l) => l.trim().length > 0);
                setParsedCount(Math.max(0, lines.length - 1));
              }}
              className="w-full bg-sunken text-ink p-3 rounded-xl border border-line text-xs font-mono-num num focus:outline-none focus:border-accent"
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
