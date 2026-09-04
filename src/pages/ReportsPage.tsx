import React, { useState, useEffect } from 'react';
import {
  PieChart as PieIcon,
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
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
import { TOKENS, formatCurrency, getCategoryColor } from '../design/tokens';

export const ReportsPage: React.FC = () => {
  const { activeProfile, summary } = useLedger();
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([]);
  const [reportType, setReportType] = useState<'expense' | 'income'>('expense');
  const [isLoading, setIsLoading] = useState(true);

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
        <div className="bg-white border border-[#E8E5DF] p-3 rounded-lg shadow-xl text-xs font-mono-num space-y-1">
          <p className="font-bold text-[#1A1A1A] border-b border-[#E8E5DF] pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value, currency)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <PieIcon className="w-5 h-5 text-[#1A1A1A]" />
          <h1 className="font-display text-2xl font-bold text-[#1A1A1A]">
            Financial Analytics & Reporting
          </h1>
        </div>
        <p className="text-xs text-[#6B7280] font-mono-num mt-0.5">
          {activeProfile?.name} • Automated cash flow breakdown and 6-month historical trends
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#E8E5DF] rounded-xl p-3 sm:p-4 shadow-sm space-y-1">
          <span className="text-[10px] sm:text-[11px] text-[#6B7280] font-mono-num uppercase font-bold truncate block">Total Inflow</span>
          <div className="text-sm sm:text-base md:text-lg font-mono-num font-bold text-[#15803D] truncate">
            {formatCurrency(summary?.totalIncome || 0, currency)}
          </div>
        </div>

        <div className="bg-white border border-[#E8E5DF] rounded-xl p-3 sm:p-4 shadow-sm space-y-1">
          <span className="text-[10px] sm:text-[11px] text-[#6B7280] font-mono-num uppercase font-bold truncate block">Total Outflow</span>
          <div className="text-sm sm:text-base md:text-lg font-mono-num font-bold text-[#DC2626] truncate">
            {formatCurrency(summary?.totalExpense || 0, currency)}
          </div>
        </div>

        <div className="bg-white border border-[#E8E5DF] rounded-xl p-3 sm:p-4 shadow-sm space-y-1">
          <span className="text-[10px] sm:text-[11px] text-[#6B7280] font-mono-num uppercase font-bold truncate block">Net Cash Flow</span>
          <div className="text-sm sm:text-base md:text-lg font-mono-num font-bold text-[#1A1A1A] truncate">
            {formatCurrency(summary?.netBalance || 0, currency)}
          </div>
        </div>

        <div className="bg-white border border-[#E8E5DF] rounded-xl p-3 sm:p-4 shadow-sm space-y-1">
          <span className="text-[10px] sm:text-[11px] text-[#6B7280] font-mono-num uppercase font-bold truncate block">Savings Rate</span>
          <div className="text-sm sm:text-base md:text-lg font-mono-num font-bold text-[#1A1A1A] truncate">
            {summary?.savingsRate || 0}%
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 6-Month Inflow vs Outflow Bar Chart */}
        <div className="lg:col-span-7 bg-white border border-[#E8E5DF] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8E5DF] pb-3">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-[#1A1A1A] shrink-0" />
              <h2 className="font-display text-sm sm:text-base font-bold text-[#1A1A1A]">
                6-Month Income vs. Expense Trend
              </h2>
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#6B7280] font-mono-num">
              Monthly Inflow/Outflow ({currency})
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" stroke="#6B7280" fontSize={11} tickLine={false} />
                <YAxis stroke="#6B7280" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Bar dataKey="income" name="Inflow" fill="#15803D" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Outflow" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Donut */}
        <div className="lg:col-span-5 bg-white border border-[#E8E5DF] rounded-xl p-4 sm:p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8E5DF] pb-3">
              <div className="flex items-center space-x-2">
                <PieIcon className="w-4 h-4 text-[#1A1A1A] shrink-0" />
                <h2 className="font-display text-sm sm:text-base font-bold text-[#1A1A1A]">
                  Category Share
                </h2>
              </div>
              <div className="flex space-x-1 p-0.5 bg-[#F7F5F2] rounded border border-[#E8E5DF]">
                <button
                  onClick={() => setReportType('expense')}
                  className={`px-2 py-1 rounded text-[10px] font-bold ${
                    reportType === 'expense'
                      ? 'bg-[#DC2626] text-white shadow-xs'
                      : 'text-[#6B7280] hover:text-[#1A1A1A]'
                  }`}
                >
                  Expenses
                </button>
                <button
                  onClick={() => setReportType('income')}
                  className={`px-2 py-1 rounded text-[10px] font-bold ${
                    reportType === 'income'
                      ? 'bg-[#15803D] text-white shadow-xs'
                      : 'text-[#6B7280] hover:text-[#1A1A1A]'
                  }`}
                >
                  Incomes
                </button>
              </div>
            </div>

            <div className="h-48 sm:h-52 w-full pt-2">
              {breakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[#6B7280]">
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
          <div className="space-y-2 pt-2 border-t border-[#E8E5DF] max-h-36 overflow-y-auto pr-1">
            {breakdown.slice(0, 4).map((item) => (
              <div key={item.category} className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2 truncate mr-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getCategoryColor(item.category) }}
                  />
                  <span className="text-[#1A1A1A] font-medium truncate">{item.category}</span>
                </div>
                <span className="font-mono-num text-[11px] text-[#6B7280] font-bold shrink-0">
                  {formatCurrency(item.amount, currency)} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* Net Cumulative Curve Area Chart */}
      <div className="bg-white border border-[#E8E5DF] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-[#1A1A1A]" />
            <h2 className="font-display text-base font-bold text-[#1A1A1A]">
              Monthly Net Savings Curve
            </h2>
          </div>
          <span className="text-[11px] text-[#6B7280] font-mono-num">
            Positive Cash Retention Trend
          </span>
        </div>

        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A1A1A" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1A1A1A" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" stroke="#6B7280" fontSize={11} tickLine={false} />
              <YAxis stroke="#6B7280" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="net"
                name="Net Savings"
                stroke="#1A1A1A"
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
