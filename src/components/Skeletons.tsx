import React from 'react';

export const CardSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="bg-surface border border-line rounded-xl p-5 animate-pulse space-y-4 shadow-sm transition-colors duration-200">
      <div className="flex justify-between items-center">
        <div className="h-4 bg-sunken rounded w-1/3" />
        <div className="h-4 bg-sunken rounded w-1/6" />
      </div>
      <div className="space-y-3 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-line/60 last:border-0">
            <div className="flex items-center space-x-3 w-1/2">
              <div className="w-7 h-7 bg-sunken rounded-md shrink-0 border border-line" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 bg-sunken rounded w-3/4" />
                <div className="h-2.5 bg-sunken/60 rounded w-1/2" />
              </div>
            </div>
            <div className="h-4 bg-sunken rounded w-1/5" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const TicketStubSkeleton: React.FC = () => {
  return (
    <div className="ticket-stub rounded-xl p-6 shadow-sm animate-pulse space-y-4 bg-surface border border-line transition-colors duration-200">
      <div className="h-3 bg-sunken rounded w-48" />
      <div className="h-10 bg-sunken rounded w-64" />
      <div className="grid grid-cols-3 gap-3 pt-3">
        <div className="h-16 bg-sunken rounded-lg border border-line" />
        <div className="h-16 bg-sunken rounded-lg border border-line" />
        <div className="h-16 bg-sunken rounded-lg border border-line" />
      </div>
    </div>
  );
};

