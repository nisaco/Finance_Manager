import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, Smartphone, Monitor, CheckCircle2, X } from 'lucide-react';

const PWA_INSTALLED_KEY = 'ledger_pwa_installed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        if (localStorage.getItem(PWA_INSTALLED_KEY) === 'true') return true;
        const isStandalone =
          window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true;
        return isStandalone;
      }
    } catch {}
    return false;
  });
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      try {
        localStorage.setItem(PWA_INSTALLED_KEY, 'true');
      } catch {}
    }

    // Check for iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      try {
        localStorage.setItem(PWA_INSTALLED_KEY, 'true');
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const markAsInstalled = () => {
    setIsInstalled(true);
    try {
      localStorage.setItem(PWA_INSTALLED_KEY, 'true');
    } catch {}
  };

  const triggerInstall = async () => {
    if (!deferredPrompt) {
      markAsInstalled();
      return true;
    }
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        markAsInstalled();
        setDeferredPrompt(null);
        return true;
      } else {
        // Even if dismissed or cancelled, mark user intent so it stops nagging
        markAsInstalled();
        return true;
      }
    } catch (err) {
      console.error('PWA install prompt error:', err);
      markAsInstalled();
    }
    return false;
  };

  return {
    canInstall: !isInstalled && (!!deferredPrompt || isIOS),
    isInstalled,
    isIOS,
    hasNativePrompt: !!deferredPrompt,
    triggerInstall,
    markAsInstalled,
  };
}

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({ isOpen, onClose }) => {
  const { hasNativePrompt, isIOS, isInstalled, triggerInstall, markAsInstalled } = usePwaInstall();
  const [isInstalling, setIsInstalling] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (hasNativePrompt) {
      setIsInstalling(true);
      await triggerInstall();
      setIsInstalling(false);
      onClose();
    } else {
      markAsInstalled();
      onClose();
    }
  };

  const handleIosDone = () => {
    markAsInstalled();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-[#12151B] border border-stone-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 text-ink dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <img src="/ledger-icon.svg" alt="Ledger" className="w-8 h-8 rounded-lg" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-sans tracking-tight">
              Install Ledger App
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Fast, offline-ready & standalone experience
            </p>
          </div>
        </div>

        {/* Status or Instructions */}
        {isInstalled ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-3 my-4">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <p className="text-sm font-medium">
              Ledger is installed on this device! You can launch it directly from your Home Screen or Applications.
            </p>
          </div>
        ) : isIOS && !hasNativePrompt ? (
          <div className="space-y-3.5 my-4 text-xs sm:text-sm text-stone-600 dark:text-stone-300">
            <p className="font-medium text-stone-900 dark:text-stone-100">
              To install on iPhone or iPad Safari:
            </p>
            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5">
              <div className="w-7 h-7 rounded-md bg-stone-200 dark:bg-white/10 flex items-center justify-center shrink-0 text-stone-800 dark:text-white font-bold text-xs">
                1
              </div>
              <div className="flex-1">
                Tap the <strong className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">Share <Share className="w-3.5 h-3.5 inline" /></strong> button in Safari's bottom toolbar.
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5">
              <div className="w-7 h-7 rounded-md bg-stone-200 dark:bg-white/10 flex items-center justify-center shrink-0 text-stone-800 dark:text-white font-bold text-xs">
                2
              </div>
              <div className="flex-1">
                Scroll down and select <strong className="text-stone-900 dark:text-white inline-flex items-center gap-1">Add to Home Screen <PlusSquare className="w-3.5 h-3.5 inline" /></strong>.
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5">
              <div className="w-7 h-7 rounded-md bg-stone-200 dark:bg-white/10 flex items-center justify-center shrink-0 text-stone-800 dark:text-white font-bold text-xs">
                3
              </div>
              <div className="flex-1">
                Tap <strong className="text-stone-900 dark:text-white">Add</strong> in the top-right corner.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 my-4">
            <p className="text-sm text-stone-600 dark:text-stone-300">
              Install Ledger directly to your home screen or desktop. Enjoy instant loading, dedicated app window, and full offline caching.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Mobile & Tablet</span>
              </div>
              <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Desktop App</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors"
          >
            {isInstalled ? 'Close' : 'Not Now'}
          </button>

          {!isInstalled && isIOS && !hasNativePrompt && (
            <button
              onClick={handleIosDone}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              I've Added It
            </button>
          )}

          {!isInstalled && hasNativePrompt && (
            <button
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isInstalling ? 'Installing...' : 'Install Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

