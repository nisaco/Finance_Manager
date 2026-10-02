/**
 * Smart Budget Velocity & Burn Rate Analytics Engine
 * Calculates pacing ratios, daily safe-to-spend allowances, 80% thresholds,
 * and exhaustion date projections across all budget categories.
 */

import { Budget } from '../types';

export interface BudgetVelocityMetrics {
  budgetId: string;
  category: string;
  currency: string;
  spent: number;
  limit: number;
  remaining: number;
  percentage: number;
  
  // Calendar Metrics
  currentDay: number;
  daysInMonth: number;
  daysRemaining: number;
  monthProgressPct: number;
  
  // Velocity & Projection
  dailyBurnRate: number;
  dailySafeAllowance: number;
  projectedMonthEndSpend: number;
  velocityRatio: number; // e.g. 1.35 = 35% faster than day of month implies
  
  // Threshold & Health Flags
  isOverLimit: boolean;
  isNearLimit: boolean; // >= 80%
  isBurningFast: boolean; // Pacing hot before 80%
  isFrozen: boolean;
  
  // Projections & Insights
  estimatedExhaustionDay: number | null; // e.g., 22
  statusHeadline: string;
  statusBadge: string;
  statusTone: 'pos' | 'warn' | 'neg' | 'ink';
}

export interface OverallVelocitySummary {
  totalLimit: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentage: number;
  dailySafeTotal: number;
  monthProgressPct: number;
  daysRemaining: number;
  hotCategoriesCount: number;
  nearLimitCount: number;
  overLimitCount: number;
  healthyCount: number;
  overallStatusHeadline: string;
  overallTone: 'pos' | 'warn' | 'neg' | 'ink';
}

export function calculateBudgetVelocity(budget: Budget, refDate: Date = new Date()): BudgetVelocityMetrics {
  const now = refDate;
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Total days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = Math.min(daysInMonth, Math.max(1, now.getDate()));
  const daysRemaining = Math.max(1, daysInMonth - currentDay);
  const monthProgressPct = Math.round((currentDay / daysInMonth) * 100);

  const spent = budget.spent || 0;
  const limit = budget.limit || 0;
  const remaining = limit - spent;
  const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
  const isFrozen = budget.status === 'exceeded_locked' || Boolean(budget.isExceeded);
  const isOverLimit = percentage >= 100 || isFrozen;
  const isNearLimit = percentage >= 80 && !isOverLimit;

  // Daily figures
  const dailyBurnRate = currentDay > 0 ? spent / currentDay : spent;
  const dailySafeAllowance = Math.max(0, remaining / daysRemaining);
  const projectedMonthEndSpend = dailyBurnRate * daysInMonth;

  // Velocity ratio: how fast spending is progressing relative to the calendar
  // e.g., at Day 10 (32% of month), if 60% spent, velocityRatio is 60 / 32 = ~1.875
  const baselinePct = Math.max(1, monthProgressPct);
  const velocityRatio = percentage / baselinePct;
  const isBurningFast = !isOverLimit && !isNearLimit && velocityRatio >= 1.25 && spent > 0;

  // Estimated day of exhaustion if current pace continues
  let estimatedExhaustionDay: number | null = null;
  if (!isOverLimit && dailyBurnRate > 0 && remaining > 0) {
    const daysToExhaust = remaining / dailyBurnRate;
    const projectedDay = Math.round(currentDay + daysToExhaust);
    if (projectedDay <= daysInMonth) {
      estimatedExhaustionDay = projectedDay;
    }
  }

  // Determine headlines & badges
  let statusHeadline = '';
  let statusBadge = '';
  let statusTone: 'pos' | 'warn' | 'neg' | 'ink' = 'ink';

  if (isOverLimit) {
    statusTone = 'neg';
    statusBadge = isFrozen ? 'Frozen at Cap' : 'Exceeded Limit';
    statusHeadline = `Exceeded by ${Math.abs(remaining).toLocaleString()}`;
  } else if (isNearLimit) {
    statusTone = 'warn';
    statusBadge = '80% Threshold Alert';
    statusHeadline = `Critical limit · Safe to spend ${dailySafeAllowance.toFixed(1)} / day`;
  } else if (isBurningFast) {
    statusTone = 'warn';
    const pctAhead = Math.round((velocityRatio - 1) * 100);
    statusBadge = `Pacing Hot (+${pctAhead}%)`;
    statusHeadline = estimatedExhaustionDay
      ? `High velocity · Runs out by Day ${estimatedExhaustionDay}`
      : `Pacing faster than calendar (${percentage}% used)`;
  } else {
    statusTone = 'pos';
    statusBadge = 'Healthy Pace';
    statusHeadline = `On track · Safe to spend ${dailySafeAllowance.toFixed(1)} / day`;
  }

  return {
    budgetId: budget.id,
    category: budget.category,
    currency: budget.currency,
    spent,
    limit,
    remaining,
    percentage,
    currentDay,
    daysInMonth,
    daysRemaining,
    monthProgressPct,
    dailyBurnRate,
    dailySafeAllowance,
    projectedMonthEndSpend,
    velocityRatio,
    isOverLimit,
    isNearLimit,
    isBurningFast,
    isFrozen,
    estimatedExhaustionDay,
    statusHeadline,
    statusBadge,
    statusTone,
  };
}

export function calculateOverallVelocity(budgets: Budget[], refDate: Date = new Date()): OverallVelocitySummary {
  const now = refDate;
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = Math.min(daysInMonth, Math.max(1, now.getDate()));
  const daysRemaining = Math.max(1, daysInMonth - currentDay);
  const monthProgressPct = Math.round((currentDay / daysInMonth) * 100);

  const totalLimit = budgets.reduce((sum, b) => sum + (b.limit || 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const totalRemaining = Math.max(0, totalLimit - totalSpent);
  const overallPercentage = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
  const dailySafeTotal = Math.max(0, totalRemaining / daysRemaining);

  const metrics = budgets.map((b) => calculateBudgetVelocity(b, refDate));
  const overLimitCount = metrics.filter((m) => m.isOverLimit).length;
  const nearLimitCount = metrics.filter((m) => m.isNearLimit).length;
  const hotCategoriesCount = metrics.filter((m) => m.isBurningFast).length;
  const healthyCount = metrics.filter((m) => !m.isOverLimit && !m.isNearLimit && !m.isBurningFast).length;

  let overallTone: 'pos' | 'warn' | 'neg' | 'ink' = 'ink';
  let overallStatusHeadline = '';

  if (overLimitCount > 0) {
    overallTone = 'neg';
    overallStatusHeadline = `${overLimitCount} budget ${overLimitCount === 1 ? 'category' : 'categories'} exceeded this month`;
  } else if (nearLimitCount > 0) {
    overallTone = 'warn';
    overallStatusHeadline = `${nearLimitCount} ${nearLimitCount === 1 ? 'category' : 'categories'} at 80% threshold`;
  } else if (hotCategoriesCount > 0) {
    overallTone = 'warn';
    overallStatusHeadline = `${hotCategoriesCount} ${hotCategoriesCount === 1 ? 'category is' : 'categories are'} pacing ahead of schedule`;
  } else if (budgets.length > 0) {
    overallTone = 'pos';
    overallStatusHeadline = 'All category budgets pacing safely within targets';
  } else {
    overallTone = 'ink';
    overallStatusHeadline = 'No category limits set for this period';
  }

  return {
    totalLimit,
    totalSpent,
    totalRemaining,
    overallPercentage,
    dailySafeTotal,
    monthProgressPct,
    daysRemaining,
    hotCategoriesCount,
    nearLimitCount,
    overLimitCount,
    healthyCount,
    overallStatusHeadline,
    overallTone,
  };
}

