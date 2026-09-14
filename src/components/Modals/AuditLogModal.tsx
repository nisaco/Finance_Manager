import React, { useState, useEffect } from 'react';
import { X, Shield, RefreshCw } from 'lucide-react';
import { AuditLog } from '../../types';
import { api } from '../../api/client';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0 bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sunken border border-line flex items-center justify-center text-ink shrink-0">
              <Shield className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div>
              <h2 className="t-card">
                System & Financial Audit Trail
              </h2>
              <span className="t-meta num block">
                Append-only log of all money movements and mutations
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={loadLogs}
              title="Refresh logs"
              className="lg-iconbtn"
              aria-label="Refresh audit logs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="lg-iconbtn" aria-label="Close dialog">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1">
          {logs.length === 0 ? (
            <p className="t-meta text-center py-12">
              No audit records registered yet.
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 bg-sunken rounded-xl border border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    <span className="font-bold text-ink num truncate">
                      {log.action}
                    </span>
                    {log.entity && (
                      <span className="px-2 py-0.5 rounded-md bg-surface text-[10px] text-ink-3 num border border-line">
                        {log.entity}
                      </span>
                    )}
                  </div>
                  {log.meta && (
                    <p className="text-[11px] text-ink-3 num truncate pl-3.5">
                      {JSON.stringify(log.meta)}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <span className="t-meta num block">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-surface border-t border-line text-right shrink-0">
          <button
            onClick={onClose}
            className="lg-btn lg-btn-solid lg-btn-sm"
          >
            Close Audit Viewer
          </button>
        </div>

      </div>
    </div>
  );
};
