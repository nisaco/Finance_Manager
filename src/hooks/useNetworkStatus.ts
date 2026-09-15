import { useState, useEffect, useCallback } from 'react';
import { getPendingMutations } from '../services/offlineSync';

export function useNetworkStatus(userId?: string) {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [pendingCount, setPendingCount] = useState<number>(() => {
    return userId ? getPendingMutations(userId).length : 0;
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshPendingCount = useCallback(() => {
    if (userId) {
      setPendingCount(getPendingMutations(userId).length);
    } else {
      setPendingCount(0);
    }
  }, [userId]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('fimara_offline_queue_updated', refreshPendingCount);

    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('fimara_offline_queue_updated', refreshPendingCount);
    };
  }, [refreshPendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    setIsSyncing,
    refreshPendingCount,
  };
}

