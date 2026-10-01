import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  MessageSquare,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Smartphone,
  RefreshCw,
  FileText
} from 'lucide-react';
import { useLedger } from '../../context/LedgerContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { parseGhanaMoMoSms, ParsedTransactionData } from '../../services/momoParser';
import {
  queueOfflineMutation,
  loadOfflineLedgerData,
  saveOfflineLedgerData,
} from '../../services/offlineSync';
import { Transaction } from '../../types';

interface SmartParserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_EXPENSE_CATEGORIES = [
  'Groceries & Household',
  'Transport & Fuel',
  'Dining & Leisure',
  'Housing & Utilities',
  'Health & Wellness',
  'Tech & Software',
  'Savings & Investments',
  'Debt Repayments',
  'General Expense',
];

const COMMON_INCOME_CATEGORIES = [
  'Salary & Wages',
  'Consulting & Retainer',
  'Side Project Sales',
  'Investments & Dividends',
  'Refund',
  'Other Income',
];

export const SmartParserModal: React.FC<SmartParserModalProps> = ({ isOpen, onClose }) => {
  const { activeProfile, refreshData, notify } = useLedger();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'sms' | 'receipt'>('sms');
  const [smsText, setSmsText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');

  // Parsed / Editable Transaction Form State
  const [parsedData, setParsedData] = useState<ParsedTransactionData | null>(null);
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState('GHS');
  const [formCategory, setFormCategory] = useState(COMMON_EXPENSE_CATEGORIES[0]);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNote, setFormNote] = useState('');
  const [formReference, setFormReference] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Real-time quick regex test on SMS text change
  const handleSmsChange = (text: string) => {
    setSmsText(text);
    if (text.trim().length > 15) {
      const localResult = parseGhanaMoMoSms(text);
      if (localResult && localResult.amount > 0) {
        applyParsedData(localResult);
      }
    }
  };

  const applyParsedData = (data: ParsedTransactionData) => {
    setParsedData(data);
    const mappedType = data.type === 'income' ? 'income' : 'expense';
    setFormType(mappedType);
    setFormAmount(data.amount > 0 ? data.amount.toString() : '');
    setFormCurrency(data.currency || 'GHS');
    setFormDate(data.date || new Date().toISOString().split('T')[0]);
    setFormNote(data.description || (data.senderOrRecipient ? `Payment to ${data.senderOrRecipient}` : 'MoMo Transaction'));
    setFormReference(data.reference || '');

    if (mappedType === 'income') {
      setFormCategory(COMMON_INCOME_CATEGORIES.includes(data.category) ? data.category : 'Other Income');
    } else {
      setFormCategory(COMMON_EXPENSE_CATEGORIES.includes(data.category) ? data.category : 'General Expense');
    }
  };

  // Run AI Deep Parse or Fallback to Regex
  const handleParseWithAI = async () => {
    if (!smsText.trim()) {
      notify('Please enter or paste an SMS notification first.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (isOffline) {
        const local = parseGhanaMoMoSms(smsText);
        if (local) {
          applyParsedData(local);
          notify('Parsed offline using local heuristics');
        } else {
          notify('Could not automatically parse SMS offline. Please review manually.', 'warning');
        }
        setIsProcessing(false);
        return;
      }

      const res = await api.parseTransactionWithAI({ text: smsText });
      if (res.success && res.data) {
        applyParsedData({
          type: res.data.type,
          amount: res.data.amount,
          currency: res.data.currency || 'GHS',
          category: res.data.category,
          description: res.data.description,
          date: res.data.date,
          reference: res.data.reference,
          senderOrRecipient: res.data.merchantOrParty,
          fee: res.data.fee,
          confidence: 0.95,
          source: 'ai',
        });
        notify('Transaction extracted via Gemini AI');
      } else {
        // Fallback
        const fallback = parseGhanaMoMoSms(smsText);
        if (fallback) {
          applyParsedData(fallback);
          notify('Extracted via local pattern matching');
        } else {
          notify('Could not identify transaction fields. Please enter manually.', 'warning');
        }
      }
    } catch (err: any) {
      const fallback = parseGhanaMoMoSms(smsText);
      if (fallback) {
        applyParsedData(fallback);
        notify('Extracted via local pattern matching (AI unavailable)');
      } else {
        notify('Failed to parse SMS alert. Please enter details manually.', 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Receipt Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('Please upload a valid image file (PNG, JPG, WEBP)', 'error');
      return;
    }

    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setPreviewImage(dataUrl);

      // Extract raw base64 without prefix
      const base64Data = dataUrl.split(',')[1];
      if (!base64Data) return;

      setIsProcessing(true);
      try {
        const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
        if (isOffline) {
          notify('Visual receipt scanning requires an active internet connection.', 'warning');
          setIsProcessing(false);
          return;
        }

        const res = await api.parseTransactionWithAI({
          imageBase64: base64Data,
          mimeType: file.type,
        });

        if (res.success && res.data) {
          applyParsedData({
            type: res.data.type,
            amount: res.data.amount,
            currency: res.data.currency || 'GHS',
            category: res.data.category,
            description: res.data.description,
            date: res.data.date,
            reference: res.data.reference,
            senderOrRecipient: res.data.merchantOrParty,
            fee: res.data.fee,
            confidence: 0.92,
            source: 'ai',
          });
          notify('Receipt scanned and analyzed successfully');
        } else {
          notify('Could not clearly read receipt data. Please verify fields.', 'warning');
        }
      } catch (err: any) {
        notify('Receipt OCR parsing failed: ' + (err.message || 'Unknown error'), 'error');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add Transaction to Ledger (Online or Queued Offline)
  const handleAddToLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) {
      notify('No active profile selected', 'error');
      return;
    }

    const numAmount = parseFloat(formAmount);
    if (!numAmount || numAmount <= 0) {
      notify('Please enter a valid amount', 'error');
      return;
    }

    setIsAdding(true);
    try {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      const finalNote = formReference
        ? `${formNote.trim()} (Ref: ${formReference.trim()})`
        : formNote.trim();

      const newTxPayload = {
        profileId: activeProfile.id,
        type: formType,
        amount: numAmount,
        currency: formCurrency,
        category: formCategory,
        date: formDate,
        note: finalNote || 'Parsed Transaction',
        recurring: 'none' as const,
      };

      if (isOffline) {
        const tempId = `offline_${Date.now()}`;
        queueOfflineMutation(user?.id || 'anonymous', activeProfile.id, 'CREATE_TRANSACTION', newTxPayload);

        if (user?.id) {
          const cached = loadOfflineLedgerData(user.id, activeProfile.id);
          if (cached) {
            const optimisticTx: Transaction = {
              id: tempId,
              ...newTxPayload,
              createdAt: new Date().toISOString(),
              pendingSync: true,
            };
            cached.transactions = [optimisticTx, ...cached.transactions];
            saveOfflineLedgerData(user.id, activeProfile.id, cached);
          }
        }
        notify('Transaction queued offline · Will sync when reconnected');
      } else {
        await api.createTransaction(newTxPayload);
        notify('Transaction added to ledger successfully', 'success');
      }

      await refreshData();
      onClose();
    } catch (err: any) {
      notify('Failed to save transaction: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="smart-parser-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/70 backdrop-blur-sm animate-in fade-in-50 duration-200"
    >
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl bg-surface border border-line shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center text-accent">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="smart-parser-title" className="text-sm sm:text-base font-bold text-ink">
                Smart MoMo &amp; Receipt Parser
              </h2>
              <p className="text-[11px] text-ink-3">
                Auto-extract Ghana MoMo alerts, bank SMS, or receipt photos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-raised transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-line bg-surface-raised/40 p-1 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('sms')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
              activeTab === 'sms'
                ? 'bg-surface text-ink shadow-sm border border-line'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-accent" />
            <span>Paste MoMo / Bank SMS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('receipt')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
              activeTab === 'receipt'
                ? 'bg-surface text-ink shadow-sm border border-line'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-accent" />
            <span>Scan Receipt Photo</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'sms' ? (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-ink-3" />
                    SMS Alert Text
                  </label>
                  <span className="text-[10px] text-ink-3 font-mono-num">
                    MTN MoMo · Telecel · AT · Banks
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={smsText}
                  onChange={(e) => handleSmsChange(e.target.value)}
                  placeholder="e.g. Payment received for GHS 250.00 from KODJO MENSAH. Current Balance: GHS 1,450.00. Ref: 28472910..."
                  className="lg-input w-full text-xs font-mono resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[11px] text-ink-3">
                  Local regex parsing runs instantly offline. AI deep scan extracts complex details.
                </p>
                <button
                  type="button"
                  onClick={handleParseWithAI}
                  disabled={isProcessing || !smsText.trim()}
                  className="lg-btn lg-btn-quiet lg-btn-sm flex items-center gap-1.5 text-accent"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>{isProcessing ? 'Analyzing...' : 'Parse with AI'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />

              {previewImage ? (
                <div className="relative rounded-xl border border-line overflow-hidden bg-canvas aspect-video max-h-48 flex items-center justify-center">
                  <img
                    src={previewImage}
                    alt="Receipt preview"
                    className="object-contain w-full h-full"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewImage(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-ink/80 text-surface hover:bg-ink transition-colors"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-line hover:border-accent/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 bg-surface-raised/30 hover:bg-surface-raised transition-colors group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-ink">
                      Take photo or upload receipt
                    </p>
                    <p className="text-[11px] text-ink-3 mt-0.5">
                      Supports JPG, PNG, WEBP invoices and receipts
                    </p>
                  </div>
                </button>
              )}

              {isProcessing && (
                <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 flex items-center gap-2 text-accent text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>Gemini Vision AI is analyzing merchant, total amount, and line items...</span>
                </div>
              )}
            </div>
          )}

          {/* Parsed Result Form & Editor */}
          <form onSubmit={handleAddToLedger} className="pt-2 border-t border-line space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink uppercase tracking-wider">
                Transaction Preview &amp; Edit
              </span>
              {parsedData && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono-num px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  {parsedData.source === 'ai' ? 'AI Extracted' : 'Offline Match'}
                </span>
              )}
            </div>

            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormType('expense');
                  setFormCategory(COMMON_EXPENSE_CATEGORIES[0]);
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  formType === 'expense'
                    ? 'border-neg/40 bg-neg/10 text-neg'
                    : 'border-line text-ink-3 hover:text-ink'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Expense / Outflow</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormType('income');
                  setFormCategory(COMMON_INCOME_CATEGORIES[0]);
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  formType === 'income'
                    ? 'border-pos/40 bg-pos/10 text-pos'
                    : 'border-line text-ink-3 hover:text-ink'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Income / Inflow</span>
              </button>
            </div>

            {/* Amount and Currency */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-ink mb-1">
                  Amount <span className="text-neg">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="lg-input w-full text-sm font-mono-num font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Currency
                </label>
                <select
                  value={formCurrency}
                  onChange={(e) => setFormCurrency(e.target.value)}
                  className="lg-input w-full text-xs font-mono-num font-semibold"
                >
                  <option value="GHS">GHS (GH₵)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>

            {/* Category and Date */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="lg-input w-full text-xs"
                >
                  {(formType === 'income' ? COMMON_INCOME_CATEGORIES : COMMON_EXPENSE_CATEGORIES).map(
                    (cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="lg-input w-full text-xs font-mono-num"
                />
              </div>
            </div>

            {/* Note & Reference */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Description / Counterparty
              </label>
              <input
                type="text"
                placeholder="e.g. MTN MoMo - Cash Out at Vendor"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                className="lg-input w-full text-xs"
              />
            </div>

            {formReference && (
              <div className="text-[11px] text-ink-3 flex items-center justify-between px-1">
                <span>Reference ID:</span>
                <span className="font-mono text-ink font-semibold">{formReference}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAdding || !formAmount || parseFloat(formAmount) <= 0}
              className="w-full lg-btn lg-btn-solid text-xs py-2.5 flex items-center justify-center gap-2 mt-3"
            >
              <FileText className="w-4 h-4" />
              <span>{isAdding ? 'Adding to Ledger...' : 'Add to Ledger'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
