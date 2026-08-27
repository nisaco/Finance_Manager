import React, { useState, useEffect } from 'react';
import { X, History, Shield, RefreshCw } from 'lucide-react';
import { AuditLog } from '../../types';
import { api } from '../../api/client';
import { formatDate } from '../../design/tokens';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-xs">
      <div className="bg-white border border-[#E8E5DF] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E5DF] shrink-0">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-[#1A1A1A]" />
            <div>
              <h2 className="font-display text-lg font-bold text-[#1A1A1A]">
                System & Financial Audit Trail
              </h2>
              <span className="text-[11px] text-[#6B7280] font-mono-num">
                Append-only log of all money movements, fund transfers, and ledger mutations
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadLogs}
              title="Refresh logs"
              className="p-1 text-[#6B7280] hover:text-[#1A1A1A] rounded"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F7F5F2] rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-2.5 flex-1">
          {logs.length === 0 ? (
            <p className="text-xs text-[#6B7280] text-center py-8">
              No audit records registered yet.
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-[#FDFCFB] rounded-lg border border-[#E8E5DF] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]" />
                    <span className="font-bold text-[#1A1A1A] font-mono-num truncate">
                      {log.action}
                    </span>
                    {log.entity && (
                      <span className="px-1.5 py-0.5 rounded bg-[#F7F5F2] text-[10px] text-[#6B7280] font-mono-num border border-[#E8E5DF]">
                        {log.entity}
                      </span>
                    )}
                  </div>
                  {log.meta && (
                    <p className="text-[11px] text-[#6B7280] font-mono-num truncate pl-3.5">
                      {JSON.stringify(log.meta)}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-[10px] font-mono-num text-[#6B7280]">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-[#FDFCFB] border-t border-[#E8E5DF] text-right shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-white text-xs font-bold rounded shadow-sm"
          >
            Close Audit Viewer
          </button>
        </div>

      </div>
    </div>
  );
};
