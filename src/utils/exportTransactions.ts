import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { Transaction, Profile } from '../types';

export interface TransactionExportOptions {
  profile: Profile;
  transactions: Transaction[];
  title?: string;
  subtitle?: string;
  filenamePrefix?: string;
}

/**
 * Cleanly format numeric amounts with currency
 */
function formatAmount(amount: number, currency = 'GHS'): string {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * 1. Export Transactions as CSV (.csv)
 */
export function exportTransactionsCsv(options: TransactionExportOptions): void {
  const { profile, transactions, filenamePrefix = 'transactions' } = options;
  const currency = profile.displayCurrency || 'GHS';
  const timestamp = new Date().toISOString().split('T')[0];

  const headers = ['Date', 'Type', 'Category', 'Amount', 'Currency', 'Note', 'Recurring'];
  const rows = transactions.map((t) => [
    t.date,
    t.type.toUpperCase(),
    `"${(t.category || '').replace(/"/g, '""')}"`,
    t.amount.toFixed(2),
    t.currency || currency,
    `"${(t.note || '').replace(/"/g, '""')}"`,
    t.recurring || 'none',
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filenamePrefix}_${profile.name.replace(/\s+/g, '_')}_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 2. Export Transactions as Excel (.xlsx)
 */
export function exportTransactionsExcel(options: TransactionExportOptions): void {
  const { profile, transactions, title = 'Fimara Transactions', subtitle, filenamePrefix = 'transactions' } = options;
  const currency = profile.displayCurrency || 'GHS';
  const timestamp = new Date().toISOString().split('T')[0];

  const wb = XLSX.utils.book_new();

  // Summary Metrics
  const totalInflow = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalOutflow = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netFlow = totalInflow - totalOutflow;

  const headerRows = [
    [title.toUpperCase()],
    [subtitle || `Statement for Profile: ${profile.name}`],
    ['Generated On', new Date().toLocaleString()],
    ['Currency', currency],
    [],
    ['EXECUTIVE CASH FLOW', 'AMOUNT'],
    ['Total Income (Inflow)', totalInflow],
    ['Total Expenses (Outflow)', totalOutflow],
    ['Net Cash Flow', netFlow],
    ['Total Entries', transactions.length],
    [],
    ['Date', 'Type', 'Category', 'Amount', 'Currency', 'Note / Description', 'Recurring'],
  ];

  const dataRows = transactions.map((t) => [
    t.date,
    t.type.toUpperCase(),
    t.category,
    t.amount,
    t.currency || currency,
    t.note || '',
    t.recurring || 'none',
  ]);

  const combinedRows = [...headerRows, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(combinedRows);

  // Set column widths
  ws['!cols'] = [
    { wch: 14 }, // Date
    { wch: 12 }, // Type
    { wch: 20 }, // Category
    { wch: 14 }, // Amount
    { wch: 10 }, // Currency
    { wch: 32 }, // Note
    { wch: 14 }, // Recurring
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

  const filename = `${filenamePrefix}_${profile.name.replace(/\s+/g, '_')}_${timestamp}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * 3. Export Transactions as PDF Statement (.pdf)
 */
export function exportTransactionsPdf(options: TransactionExportOptions): void {
  const { profile, transactions, title = 'LEDGER FINANCIAL STATEMENT', subtitle, filenamePrefix = 'transactions' } = options;
  const currency = profile.displayCurrency || 'GHS';
  const timestamp = new Date().toISOString().split('T')[0];

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(title.toUpperCase(), 14, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(
    subtitle || `Profile: ${profile.name} (${profile.type || 'personal'})  ·  Generated: ${new Date().toLocaleString()}  ·  ${transactions.length} entries`,
    14,
    y + 5.5
  );

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, y + 9, pageWidth - 14, y + 9);
  y += 15;

  // Key Financial Totals Box
  const totalInflow = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalOutflow = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netFlow = totalInflow - totalOutflow;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2.5, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL MONEY IN', 20, y + 7);
  doc.text('TOTAL MONEY OUT', 75, y + 7);
  doc.text('NET PERIOD FLOW', 130, y + 7);

  doc.setFontSize(10.5);
  doc.setTextColor(5, 150, 105); // green
  doc.text(`+${formatAmount(totalInflow, currency)}`, 20, y + 15);

  doc.setTextColor(220, 38, 38); // red
  doc.text(`-${formatAmount(totalOutflow, currency)}`, 75, y + 15);

  doc.setTextColor(netFlow >= 0 ? 5 : 220, netFlow >= 0 ? 150 : 38, netFlow >= 0 ? 105 : 38);
  doc.text(`${netFlow >= 0 ? '+' : ''}${formatAmount(netFlow, currency)}`, 130, y + 15);

  y += 28;

  // Table Header
  const renderTableHeader = (currentY: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, currentY, pageWidth - 28, 6.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('Date', 17, currentY + 4.5);
    doc.text('Type', 42, currentY + 4.5);
    doc.text('Category', 68, currentY + 4.5);
    doc.text('Description / Note', 110, currentY + 4.5);
    doc.text('Amount', 165, currentY + 4.5);
    return currentY + 7.5;
  };

  y = renderTableHeader(y);

  if (transactions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No transactions recorded for this period.', 17, y + 5);
  } else {
    transactions.forEach((t, idx) => {
      // Check page overflow
      if (y > 272) {
        doc.addPage();
        y = 18;
        y = renderTableHeader(y);
      }

      // Zebra background
      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 252);
        doc.rect(14, y - 0.5, pageWidth - 28, 6, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(t.date || '', 17, y + 3.8);

      // Type tag
      doc.setFont('helvetica', 'bold');
      if (t.type === 'income') {
        doc.setTextColor(5, 150, 105);
        doc.text('INCOME', 42, y + 3.8);
      } else {
        doc.setTextColor(220, 38, 38);
        doc.text('EXPENSE', 42, y + 3.8);
      }

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text((t.category || '-').substring(0, 22), 68, y + 3.8);

      doc.setTextColor(100, 116, 139);
      doc.text((t.note || '-').substring(0, 28), 110, y + 3.8);

      doc.setFont('helvetica', 'bold');
      if (t.type === 'income') {
        doc.setTextColor(5, 150, 105);
        doc.text(`+${formatAmount(t.amount, currency)}`, 165, y + 3.8);
      } else {
        doc.setTextColor(220, 38, 38);
        doc.text(`-${formatAmount(t.amount, currency)}`, 165, y + 3.8);
      }

      y += 6;
    });
  }

  // Footer on all pages
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Fimara Financial Operating System  ·  Page ${i} of ${totalPages}  ·  Confidential`,
      pageWidth / 2,
      288,
      { align: 'center' }
    );
  }

  const filename = `${filenamePrefix}_${profile.name.replace(/\s+/g, '_')}_${timestamp}.pdf`;
  doc.save(filename);
}

