import React from 'react';

// Base Shimmer Block
export const SkeletonBlock: React.FC<{
  className?: string;
  rounded?: string;
}> = ({ className = 'h-4 w-full', rounded = 'rounded-lg' }) => (
  <div
    className={`relative overflow-hidden bg-black/5 dark:bg-white/5 ${rounded} ${className}`}
    className={`relative overflow-hidden bg-sunken ${rounded} ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent dark:via-white/10 animate-shimmer" />
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent animate-shimmer" />
  </div>
);

// Overview / Dashboard Skeleton
export const OverviewSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Banner / Welcome skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8E5DF] dark:border-[#2D323F]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-line">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-48" />
          <SkeletonBlock className="h-4 w-72" />
        </div>
        <div className="flex items-center space-x-2">
          <SkeletonBlock className="h-9 w-28 rounded-xl" />
          <SkeletonBlock className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white/70 dark:bg-[#151922]/70 backdrop-blur-md border border-[#E8E5DF] dark:border-[#2D323F] space-y-3 shadow-2xs"
            className="p-5 rounded-2xl bg-surface border border-line space-y-3 shadow-2xs transition-colors duration-200"
          >
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-7 w-7 rounded-lg" />
            </div>
            <SkeletonBlock className="h-8 w-36" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Main Charts & Activity Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large Chart Placeholder */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white/70 dark:bg-[#151922]/70 backdrop-blur-md border border-[#E8E5DF] dark:border-[#2D323F] space-y-4">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-surface border border-line space-y-4 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-7 w-32 rounded-lg" />
          </div>
          <div className="h-64 flex items-end justify-between gap-3 pt-6 px-2">
            {[40, 65, 30, 85, 60, 45, 90, 75, 50, 70, 60, 80].map((h, idx) => (
              <div
                key={idx}
                className="flex-1 bg-black/5 dark:bg-white/5 rounded-t-lg relative overflow-hidden"
                className="flex-1 bg-sunken rounded-t-lg relative overflow-hidden"
                style={{ height: `${h}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent dark:via-white/10 animate-shimmer" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent animate-shimmer" />
              </div>
            ))}
          </div>
        </div>

        {/* Side Mini Widget */}
        <div className="p-6 rounded-2xl bg-white/70 dark:bg-[#151922]/70 backdrop-blur-md border border-[#E8E5DF] dark:border-[#2D323F] space-y-4">
        <div className="p-6 rounded-2xl bg-surface border border-line space-y-4 transition-colors duration-200">
          <SkeletonBlock className="h-5 w-32" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <SkeletonBlock className="h-3 w-20" />
                  <SkeletonBlock className="h-3 w-16" />
                </div>
                <SkeletonBlock className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="p-6 rounded-2xl bg-white/70 dark:bg-[#151922]/70 backdrop-blur-md border border-[#E8E5DF] dark:border-[#2D323F] space-y-4">
      <div className="p-6 rounded-2xl bg-surface border border-line space-y-4 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-5 w-36" />
          <SkeletonBlock className="h-4 w-20" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5 last:border-0">
            <div key={i} className="flex items-center justify-between py-2 border-b border-line/60 last:border-0">
              <div className="flex items-center space-x-3">
                <SkeletonBlock className="h-9 w-9 rounded-xl" />
                <div className="space-y-1.5">
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="h-3 w-20" />
                </div>
              </div>
              <div className="text-right space-y-1">
                <SkeletonBlock className="h-4 w-20 ml-auto" />
                <SkeletonBlock className="h-3 w-14 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Transactions Table Skeleton
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 7 }) => {
  return (
    <div className="space-y-4 animate-in fade-in-50 duration-300">
      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white/70 dark:bg-[#151922]/70 backdrop-blur-md border border-[#E8E5DF] dark:border-[#2D323F]">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-surface border border-line transition-colors duration-200">
        <SkeletonBlock className="h-9 w-64 rounded-xl" />
        <div className="flex items-center space-x-2">
          <SkeletonBlock className="h-9 w-24 rounded-xl" />
          <SkeletonBlock className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl bg-white/70 dark:bg-[#151922]/70 backdrop-blur-md border border-[#E8E5DF] dark:border-[#2D323F] overflow-hidden">
      <div className="rounded-2xl bg-surface border border-line overflow-hidden transition-colors duration-200">
        {/* Table Header */}
        <div className="grid grid-cols-5 p-4 border-b border-[#E8E5DF] dark:border-[#2D323F] gap-4">
        <div className="grid grid-cols-5 p-4 border-b border-line gap-4">
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-4 w-24 ml-auto" />
          <SkeletonBlock className="h-4 w-12 ml-auto" />
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-black/5 dark:divide-white/5">
        <div className="divide-y divide-line/60">
          {Array.from({ length: rows }).map((_, idx) => (
            <div key={idx} className="grid grid-cols-5 p-4 gap-4 items-center">
              <SkeletonBlock className="h-3.5 w-16" />
              <div className="flex items-center space-x-2.5">
                <SkeletonBlock className="h-7 w-7 rounded-lg shrink-0" />
                <SkeletonBlock className="h-3.5 w-36" />
              </div>
              <SkeletonBlock className="h-3.5 w-20" />
              <SkeletonBlock className="h-4 w-24 ml-auto" />
              <SkeletonBlock className="h-6 w-6 rounded-md ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Cards Grid Skeleton (Budgets, Goals, Debts)
export const CardsGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="space-y-4 animate-in fade-in-50 duration-300">
      {/* Header controls */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DF] dark:border-[#2D323F]">
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <div className="space-y-1.5">
          <SkeletonBlock className="h-6 w-36" />
          <SkeletonBlock className="h-3 w-52" />
        </div>
        <SkeletonBlock className="h-9 w-32 rounded-xl" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-white/70 dark:bg-[#151922]/70 backdrop-blur-md border border-[#E8E5DF] dark:border-[#2D323F] space-y-4"
            className="p-5 rounded-2xl bg-surface border border-line space-y-4 transition-colors duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <SkeletonBlock className="h-9 w-9 rounded-xl" />
                <div className="space-y-1">
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="h-3 w-16" />
                </div>
              </div>
              <SkeletonBlock className="h-5 w-12 rounded-full" />
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between">
                <SkeletonBlock className="h-3 w-20" />
                <SkeletonBlock className="h-3 w-24" />
              </div>
              <SkeletonBlock className="h-2.5 w-full rounded-full" />
            </div>

            <div className="pt-2 border-t border-black/5 dark:border-white/5 flex justify-between items-center">
            <div className="pt-2 border-t border-line/60 flex justify-between items-center">
              <SkeletonBlock className="h-3.5 w-20" />
              <SkeletonBlock className="h-7 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

