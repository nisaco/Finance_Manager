import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useAuth } from '../../context/AuthContext';
import { useLedger } from '../../context/LedgerContext';

export const NetworkStatusBanner: React.FC = () => {
  const { user } = useAuth();
  const { refreshData } = useLedger();
  const { isOnline, pendingCount, isSyncing, setIsSyncing } = useNetworkStatus(user?.id);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    if (isOnline) {
      setJustReconnected(true);
      const timer = setTimeout(() => {
        setJustReconnected(false);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setJustReconnected(false);
    }
  }, [isOnline]);

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await refreshData();
    } finally {
      setIsSyncing(false);
    }
  };

  // If online, fully synced, and not recently reconnected: hide completely to keep UI clean
  if (isOnline && pendingCount === 0 && !justReconnected && !isSyncing) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-surface-2 border-b border-line px-3 sm:px-6 py-1.5 transition-all duration-300 z-30"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-medium">
          {!isOnline ? (
            <>
              <span className="flex h-2 w-2 rounded-full bg-amber-500/90 animate-pulse" aria-hidden="true" />
              <div className="flex items-center gap-1.5 text-ink-2">
                <WifiOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  <strong className="font-semibold text-ink">Offline Mode</strong> · Core ledgers active
                </span>
                {pendingCount > 0 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {pendingCount} queued for sync
                  </span>
                )}
              </div>
            </>
          ) : isSyncing || pendingCount > 0 ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-brand animate-spin shrink-0" />
              <span className="text-ink-2">
                Reconnected · Syncing <span className="num font-semibold text-ink">{pendingCount}</span> record{pendingCount === 1 ? '' : 's'} to cloud...
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-ink-2">
                Back online · All local records synchronized
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isOnline ? (
            <span className="text-[11px] text-ink-3 hidden sm:inline">
              Transactions recorded now will sync automatically upon reconnection
            </span>
          ) : (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-line text-ink-2 hover:text-ink hover:bg-surface transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

