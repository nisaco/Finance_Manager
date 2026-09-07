import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { Transaction, Budget, Goal, Debt, Profile } from '../types';

export interface ReportExportData {
  profile: Profile;
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  debts: Debt[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    savingsRate?: number;
  };
}

/**
 * Export complete financial report as Excel spreadsheet (.xlsx)
 */
export function exportFinancialReportExcel(data: ReportExportData): void {
  const { profile, transactions, budgets, goals, debts, summary } = data;
  const currency = profile.displayCurrency || 'GHS';
  const timestamp = new Date().toISOString().split('T')[0];

  const wb = XLSX.utils.book_new();

  // 1. Executive Summary Sheet
  const summaryRows = [
    ['LEDGER FINANCIAL EXECUTIVE SUMMARY'],
    ['Generated On', new Date().toLocaleString()],
    ['Profile Name', profile.name],
    ['Profile Type', profile.type],
    ['Currency', currency],
    [],
    ['KEY PERFORMANCE INDICATORS', 'AMOUNT'],
    ['Total Income (Inflow)', `${currency} ${summary.totalIncome.toFixed(2)}`],
    ['Total Expenses (Outflow)', `${currency} ${summary.totalExpense.toFixed(2)}`],
    ['Net Cash Flow', `${currency} ${summary.netBalance.toFixed(2)}`],
    ['Savings Rate', summary.savingsRate ? `${summary.savingsRate}%` : 'N/A'],
    ['Total Saved in Vaults', `${currency} ${goals.reduce((sum, g) => sum + (g.current || 0), 0).toFixed(2)}`],
    ['Total Liabilities (Debts I Owe)', `${currency} ${debts.filter(d => d.direction === 'i_owe').reduce((sum, d) => sum + Math.max(0, d.amount - (d.paid || 0)), 0).toFixed(2)}`],
    ['Total Receivables (Owed to Me)', `${currency} ${debts.filter(d => d.direction === 'owed_to_me').reduce((sum, d) => sum + Math.max(0, d.amount - (d.paid || 0)), 0).toFixed(2)}`],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // 2. Transactions Sheet
  const txRows = transactions.map((t) => ({
    'Date': t.date,
    'Type': t.type.toUpperCase(),
    'Category': t.category,
    'Amount': t.amount,
    'Currency': t.currency,
    'Note / Description': t.note || '',
    'Recurring': t.recurring || 'none',
  }));
  const wsTx = XLSX.utils.json_to_sheet(txRows.length > 0 ? txRows : [{ 'Notice': 'No transactions recorded' }]);
  XLSX.utils.book_append_sheet(wb, wsTx, 'Transactions');

  // 3. Budgets Sheet
  const budgetRows = budgets.map((b) => ({
    'Category': b.category,
    'Budget Limit': b.limit,
    'Current Spent (Capped 105%)': b.spent ?? 0,
    'Raw Actual Spent': b.rawSpent ?? b.spent ?? 0,
    'Remaining': b.remaining ?? Math.max(0, b.limit - (b.spent || 0)),
    'Status': b.status === 'exceeded_locked' ? 'EXCEEDED (FROZEN AT 105%)' : 'NORMAL',
    'Currency': b.currency,
  }));
  const wsBudgets = XLSX.utils.json_to_sheet(budgetRows.length > 0 ? budgetRows : [{ 'Notice': 'No budgets set' }]);
  XLSX.utils.book_append_sheet(wb, wsBudgets, 'Budgets');

  // 4. Savings Vaults Sheet
  const goalRows = goals.map((g) => ({
    'Vault Name': g.name,
    'Target Amount': g.target,
    'Total Saved': g.current || 0,
    'Target Deadline': g.deadline || 'No Deadline',
    'Status': (g.status || 'active').toUpperCase(),
    'Currency': g.currency,
  }));
  const wsGoals = XLSX.utils.json_to_sheet(goalRows.length > 0 ? goalRows : [{ 'Notice': 'No savings vaults' }]);
  XLSX.utils.book_append_sheet(wb, wsGoals, 'Savings Vaults');

  // 5. Debts Sheet
  const debtRows = debts.map((d) => ({
    'Counterparty': d.person,
    'Direction': d.direction === 'i_owe' ? 'I OWE' : 'OWED TO ME',
    'Total Amount': d.amount,
    'Amount Settled': d.paid || 0,
    'Remaining Balance': Math.max(0, d.amount - (d.paid || 0)),
    'Due Date': d.dueDate || 'Open',
    'Status': (d.paid >= d.amount ? 'SETTLED' : 'ACTIVE'),
    'Currency': d.currency,
  }));
  const wsDebts = XLSX.utils.json_to_sheet(debtRows.length > 0 ? debtRows : [{ 'Notice': 'No debt obligations' }]);
  XLSX.utils.book_append_sheet(wb, wsDebts, 'Debts & Obligations');

  // Trigger download
  const filename = `Ledger_Report_${profile.name.replace(/\s+/g, '_')}_${timestamp}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Export complete financial report as PDF (.pdf)
 */
export function exportFinancialReportPdf(data: ReportExportData): void {
  const { profile, transactions, budgets, goals, debts, summary } = data;
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
  doc.setFontSize(18);
  doc.setTextColor(26, 26, 26);
  doc.text('LEDGER FINANCIAL REPORT', 14, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(`Generated: ${new Date().toLocaleString()}  |  Profile: ${profile.name} (${currency})`, 14, y + 6);

  doc.setDrawColor(232, 229, 223);
  doc.setLineWidth(0.5);
  doc.line(14, y + 10, pageWidth - 14, y + 10);
  y += 18;

  // Key Financial Metrics Box
  doc.setFillColor(247, 245, 242);
  doc.roundedRect(14, y, pageWidth - 28, 26, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 26, 26);
  doc.text('EXECUTIVE CASH FLOW SUMMARY', 18, y + 7);

  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('TOTAL INFLOW', 18, y + 14);
  doc.text('TOTAL OUTFLOW', 65, y + 14);
  doc.text('NET BALANCE', 115, y + 14);
  doc.text('SAVINGS RATE', 160, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(21, 128, 61); // green
  doc.text(`${currency} ${summary.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 18, y + 21);

  doc.setTextColor(185, 28, 28); // red
  doc.text(`${currency} ${summary.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 65, y + 21);

  doc.setTextColor(summary.netBalance >= 0 ? 21 : 185, summary.netBalance >= 0 ? 128 : 28, summary.netBalance >= 0 ? 61 : 28);
  doc.text(`${currency} ${summary.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 115, y + 21);

  doc.setTextColor(26, 26, 26);
  doc.text(`${summary.savingsRate ?? 0}%`, 160, y + 21);

  y += 34;

  // Section 1: Budgets & 105% Cap Compliance
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(26, 26, 26);
  doc.text('Budget Health & Threshold Tracking', 14, y);
  y += 6;

  // Table header
  doc.setFillColor(232, 229, 223);
  doc.rect(14, y, pageWidth - 28, 6, 'F');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  doc.text('Category', 16, y + 4.5);
  doc.text('Budget Limit', 75, y + 4.5);
  doc.text('Spent (Capped)', 115, y + 4.5);
  doc.text('Status', 155, y + 4.5);
  y += 7;

  if (budgets.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.text('No budgets currently set for this profile.', 16, y + 4);
    y += 8;
  } else {
    budgets.slice(0, 8).forEach((b) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(26, 26, 26);
      doc.text(b.category, 16, y + 4);
      doc.text(`${currency} ${b.limit.toLocaleString()}`, 75, y + 4);
      doc.text(`${currency} ${(b.spent ?? 0).toLocaleString()}`, 115, y + 4);

      if (b.status === 'exceeded_locked' || (b.percentage ?? 0) >= 105) {
        doc.setTextColor(185, 28, 28);
        doc.text('Exceeded (Locked @ 105%)', 155, y + 4);
      } else {
        doc.setTextColor(21, 128, 61);
        doc.text(`Normal (${b.percentage ?? 0}%)`, 155, y + 4);
      }
      y += 6;
    });
  }

  y += 6;

  // Section 2: Savings Vaults
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(26, 26, 26);
  doc.text('Savings Vaults & Target Deadlines', 14, y);
  y += 6;

  doc.setFillColor(232, 229, 223);
  doc.rect(14, y, pageWidth - 28, 6, 'F');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  doc.text('Vault Name', 16, y + 4.5);
  doc.text('Target', 75, y + 4.5);
  doc.text('Saved Balance', 115, y + 4.5);
  doc.text('Maturity / Status', 155, y + 4.5);
  y += 7;

  if (goals.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.text('No savings vaults configured.', 16, y + 4);
    y += 8;
  } else {
    goals.slice(0, 8).forEach((g) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(26, 26, 26);
      doc.text(g.name.substring(0, 25), 16, y + 4);
      doc.text(`${currency} ${g.target.toLocaleString()}`, 75, y + 4);
      doc.text(`${currency} ${(g.current || 0).toLocaleString()}`, 115, y + 4);
      const isPending = g.status === 'pending_withdrawal';
      const isWithdrawn = g.status === 'withdrawn';
      const statusText = isWithdrawn ? 'Withdrawn' : isPending ? 'Pending Payout' : (g.deadline || 'Active');
      doc.text(statusText, 155, y + 4);
      y += 6;
    });
  }

  y += 6;

  // Section 3: Recent Transactions (up to 15)
  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(26, 26, 26);
  doc.text('Recent Transactions Statement', 14, y);
  y += 6;

  doc.setFillColor(232, 229, 223);
  doc.rect(14, y, pageWidth - 28, 6, 'F');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  doc.text('Date', 16, y + 4.5);
  doc.text('Type', 42, y + 4.5);
  doc.text('Category', 70, y + 4.5);
  doc.text('Note', 115, y + 4.5);
  doc.text('Amount', 165, y + 4.5);
  y += 7;

  const recentTxs = transactions.slice(0, 15);
  recentTxs.forEach((t) => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(75, 85, 99);
    doc.text(t.date, 16, y + 4);
    doc.text(t.type.toUpperCase(), 42, y + 4);
    doc.text(t.category.substring(0, 20), 70, y + 4);
    doc.text((t.note || '-').substring(0, 24), 115, y + 4);

    if (t.type === 'income') {
      doc.setTextColor(21, 128, 61);
      doc.text(`+${currency} ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 165, y + 4);
    } else {
      doc.setTextColor(185, 28, 28);
      doc.text(`-${currency} ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 165, y + 4);
    }
    y += 5.5;
  });

  // Footer
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Ledger Financial Operating System — Page ${i} of ${totalPages} — Confidential`,
      pageWidth / 2,
      288,
      { align: 'center' }
    );
  }

  const filename = `Ledger_Report_${profile.name.replace(/\s+/g, '_')}_${timestamp}.pdf`;
  doc.save(filename);
}
