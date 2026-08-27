import React from 'react';

export const CardSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="bg-white border border-[#E8E5DF] rounded-xl p-5 animate-pulse space-y-4 shadow-sm">
      <div className="flex justify-between items-center">
        <div className="h-4 bg-[#E8E5DF] rounded w-1/3" />
        <div className="h-4 bg-[#E8E5DF] rounded w-1/6" />
      </div>
      <div className="space-y-3 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-[#E8E5DF]/60 last:border-0">
            <div className="flex items-center space-x-3 w-1/2">
              <div className="w-7 h-7 bg-[#F7F5F2] rounded-md shrink-0 border border-[#E8E5DF]" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 bg-[#E8E5DF] rounded w-3/4" />
                <div className="h-2.5 bg-[#F7F5F2] rounded w-1/2" />
              </div>
            </div>
            <div className="h-4 bg-[#E8E5DF] rounded w-1/5" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const TicketStubSkeleton: React.FC = () => {
  return (
    <div className="ticket-stub rounded-xl p-6 shadow-sm animate-pulse space-y-4 bg-white border border-[#E8E5DF]">
      <div className="h-3 bg-[#E8E5DF] rounded w-48" />
      <div className="h-10 bg-[#E8E5DF] rounded w-64" />
      <div className="grid grid-cols-3 gap-3 pt-3">
        <div className="h-16 bg-[#F7F5F2] rounded-lg border border-[#E8E5DF]" />
        <div className="h-16 bg-[#F7F5F2] rounded-lg border border-[#E8E5DF]" />
        <div className="h-16 bg-[#F7F5F2] rounded-lg border border-[#E8E5DF]" />
      </div>
    </div>
  );
};
