import React, { useState, useEffect } from 'react';
import {
  PieChart as PieIcon,
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { useLedger } from '../context/LedgerContext';
import { api } from '../api/client';
import { MonthlyTrend, CategoryBreakdown } from '../types';
import { formatCurrency, getCategoryColor } from '../design/tokens';
import { exportFinancialReportPdf, exportFinancialReportExcel } from '../utils/exportReports';

export const ReportsPage: React.FC = () => {
  const { activeProfile, summary, transactions, budgets, goals, debts, showNotification } = useLedger();
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([]);
  const [reportType, setReportType] = useState<'expense' | 'income'>('expense');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | null>(null);

  const currency = activeProfile?.displayCurrency || 'GHS';

  useEffect(() => {
    if (activeProfile) {
      loadReports();
    }
  }, [activeProfile, reportType]);

  const loadReports = async () => {
    if (!activeProfile) return;
    setIsLoading(true);
    try {
      const [trendRes, breakdownRes] = await Promise.all([
        api.getTrendReport(activeProfile.id, 6),
        api.getCategoryBreakdown(activeProfile.id, reportType),
      ]);
      setTrends(trendRes.trend || []);
      setBreakdown(breakdownRes.breakdown || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-line p-3 rounded-xl shadow-md text-xs num space-y-1">
          <p className="font-bold text-ink border-b border-line pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }} className="font-semibold">
              {entry.name}: {formatCurrency(entry.value, currency)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleExportPdf = () => {
    if (!activeProfile) return;
    setIsExporting('pdf');
    try {
      exportFinancialReportPdf({
        profile: activeProfile,
        transactions,
        budgets,
        goals,
        debts,
        summary: {
          totalIncome: summary?.totalIncome || 0,
          totalExpense: summary?.totalExpense || 0,
          netBalance: summary?.netBalance || 0,
          savingsRate: summary?.savingsRate,
        },
      });
      showNotification('Financial Report PDF downloaded successfully', 'success');
    } catch (err: any) {
      console.error('PDF export error:', err);
      showNotification('Failed to generate PDF report', 'error');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportExcel = () => {
    if (!activeProfile) return;
    setIsExporting('excel');
    try {
      exportFinancialReportExcel({
        profile: activeProfile,
        transactions,
        budgets,
        goals,
        debts,
        summary: {
          totalIncome: summary?.totalIncome || 0,
          totalExpense: summary?.totalExpense || 0,
          netBalance: summary?.netBalance || 0,
          savingsRate: summary?.savingsRate,
        },
      });
      showNotification('Excel financial spreadsheet (.xlsx) downloaded successfully', 'success');
    } catch (err: any) {
      console.error('Excel export error:', err);
      showNotification('Failed to generate Excel file', 'error');
    } finally {
      setIsExporting(null);
    }
  };

  const netBalance = summary?.netBalance || 0;
  const isPositiveNet = netBalance > 0;
  const isNegativeNet = netBalance < 0;

  return (
    <div className="space-y-6">
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header with Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="t-title text-ink font-bold">Financial Analytics &amp; Reports</h1>
          <p className="t-meta text-ink-3 mt-1">
            {activeProfile?.name ? `${activeProfile.name} · ` : ''}
            Cash flow breakdowns, category distribution trends, and official statement export
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting !== null}
            className="lg-btn lg-btn-quiet text-xs"
            title="Download formatted PDF financial statement"
          >
            <FileText className="w-4 h-4 text-neg" strokeWidth={1.7} />
            <span>{isExporting === 'pdf' ? 'Generating PDF...' : 'Export PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting !== null}
            className="lg-btn lg-btn-solid text-xs"
            title="Download detailed Excel spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" strokeWidth={1.7} />
            <span>{isExporting === 'excel' ? 'Generating Excel...' : 'Export Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="lg-card p-4 space-y-1">
          <span className="t-eyebrow text-ink-3 block truncate">Total Inflow</span>
          <div className="text-base sm:text-lg md:text-xl num font-bold text-pos truncate">
            +{formatCurrency(summary?.totalIncome || 0, currency)}
          </div>
        </div>

        <div className="lg-card p-4 space-y-1">
          <span className="t-eyebrow text-ink-3 block truncate">Total Outflow</span>
          <div className="text-base sm:text-lg md:text-xl num font-bold text-neg truncate">
            -{formatCurrency(summary?.totalExpense || 0, currency)}
          </div>
        </div>

        <div className="lg-card p-4 space-y-1">
          <span className="t-eyebrow text-ink-3 block truncate">Net Cash Flow</span>
          <div
            className={`text-base sm:text-lg md:text-xl num font-bold truncate ${
              isPositiveNet ? 'text-pos' : isNegativeNet ? 'text-neg' : 'text-ink'
            }`}
          >
            {isPositiveNet ? '+' : isNegativeNet ? '−' : ''}
            {formatCurrency(Math.abs(netBalance), currency)}
          </div>
        </div>

        <div className="lg-card p-4 space-y-1">
          <span className="t-eyebrow text-ink-3 block truncate">Savings Rate</span>
          <div className="text-base sm:text-lg md:text-xl num font-bold text-ink truncate">
            {summary?.savingsRate || 0}%
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* 6-Month Inflow vs Outflow Bar Chart */}
        <div className="lg:col-span-7 lg-card p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-ink" strokeWidth={1.7} />
              <h2 className="t-card font-bold text-ink">
                6-Month Income vs. Expense Trend
              </h2>
            </div>
            <span className="text-xs text-ink-3 num">
              Monthly Inflow / Outflow ({currency})
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" stroke="var(--lg-ink-3, #667085)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--lg-ink-3, #667085)" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Bar dataKey="income" name="Inflow" fill="var(--lg-pos, #067A55)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Outflow" fill="var(--lg-neg, #B42318)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Donut & Ranked List */}
        <div className="lg:col-span-5 lg-card p-4 sm:p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-ink" strokeWidth={1.7} />
                <h2 className="t-card font-bold text-ink">
                  Category Share
                </h2>
              </div>
              <div className="lg-seg">
                <button
                  type="button"
                  onClick={() => setReportType('expense')}
                  className={`lg-seg-btn ${reportType === 'expense' ? 'active' : ''}`}
                >
                  Expenses
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('income')}
                  className={`lg-seg-btn ${reportType === 'income' ? 'active' : ''}`}
                >
                  Incomes
                </button>
              </div>
            </div>

            <div className="h-48 sm:h-52 w-full pt-2">
              {breakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-ink-3">
                  No category records available for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdown}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {breakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getCategoryColor(entry.category)}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top Category List */}
          <div className="space-y-2 pt-3 border-t border-line max-h-40 overflow-y-auto pr-1 divide-y divide-line">
            {breakdown.slice(0, 5).map((item) => (
              <div key={item.category} className="flex justify-between items-center text-xs pt-2 first:pt-0">
                <div className="flex items-center gap-2 truncate mr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: getCategoryColor(item.category) }}
                    aria-hidden="true"
                  />
                  <span className="text-ink font-semibold truncate">{item.category}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="num font-bold text-ink">
                    {formatCurrency(item.amount, currency)}
                  </span>
                  <span className="num text-xs text-ink-3 ml-1.5 font-semibold">
                    ({item.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Net Cumulative Curve Area Chart */}
      <div className="lg-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-ink" strokeWidth={1.7} />
            <h2 className="t-card font-bold text-ink">
              Monthly Net Savings Curve
            </h2>
          </div>
          <span className="text-xs text-ink-3 num">
            Cash Retention Trend
          </span>
        </div>

        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--lg-accent, #0F5257)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--lg-accent, #0F5257)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" stroke="var(--lg-ink-3, #667085)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--lg-ink-3, #667085)" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="net"
                name="Net Savings"
                stroke="var(--lg-accent, #0F5257)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#netGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
