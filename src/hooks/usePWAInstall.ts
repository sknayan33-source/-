import { useEffect, useState } from 'react';
import { recordAppInstallation, isRunningAsInstalledApp } from '../services/firebase';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

// Module-level global reference synchronized with window.__deferredPwaPrompt captured in index.html
let globalDeferredPrompt: BeforeInstallPromptEvent | null =
  typeof window !== 'undefined' && window.__deferredPwaPrompt
    ? window.__deferredPwaPrompt
    : null;

const listeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

function notifyListeners(prompt: BeforeInstallPromptEvent | null) {
  globalDeferredPrompt = prompt;
  if (typeof window !== 'undefined') {
    window.__deferredPwaPrompt = prompt;
  }
  listeners.forEach((fn) => fn(prompt));
}

if (typeof window !== 'undefined') {
  if (window.__deferredPwaPrompt) {
    globalDeferredPrompt = window.__deferredPwaPrompt;
  }

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    notifyListeners(e as BeforeInstallPromptEvent);
  });

  window.addEventListener('pwa-prompt-ready', () => {
    if (window.__deferredPwaPrompt) {
      notifyListeners(window.__deferredPwaPrompt);
    }
  });

  window.addEventListener('appinstalled', () => {
    notifyListeners(null);
    recordAppInstallation('appinstalled_event');
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () =>
      (typeof window !== 'undefined' && window.__deferredPwaPrompt) ||
      globalDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone = isRunningAsInstalledApp();
    setIsInstalled(isStandalone);

    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !('MSStream' in window);
      setIsIOS(isIOSDevice);
    }

    const currentPrompt =
      (typeof window !== 'undefined' && window.__deferredPwaPrompt) ||
      globalDeferredPrompt;
    if (currentPrompt) {
      setDeferredPrompt(currentPrompt);
    }

    const listener = (p: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(p);
      if (!p) {
        if (isRunningAsInstalledApp()) setIsInstalled(true);
      }
    };
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    let promptEvent =
      deferredPrompt ||
      globalDeferredPrompt ||
      (typeof window !== 'undefined' ? window.__deferredPwaPrompt : null);

    // If user clicked rapidly right after opening page while Chrome is still firing beforeinstallprompt, wait up to 900ms
    if (!promptEvent && typeof window !== 'undefined') {
      promptEvent = await new Promise<BeforeInstallPromptEvent | null>((resolve) => {
        const timer = setTimeout(() => {
          resolve(window.__deferredPwaPrompt || globalDeferredPrompt || null);
        }, 900);
        const onReady = () => {
          clearTimeout(timer);
          resolve(window.__deferredPwaPrompt || globalDeferredPrompt || null);
        };
        window.addEventListener('pwa-prompt-ready', onReady, { once: true });
      });
    }

    if (!promptEvent) return false;

    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        notifyListeners(null);
        recordAppInstallation('install_prompt_accepted');
        return true;
      }
      // Even if user dismissed the native dialog, return true so the fallback instruction modal doesn't pop up on top
      return true;
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
    return false;
  };

  const hasPrompt = !!(
    deferredPrompt ||
    globalDeferredPrompt ||
    (typeof window !== 'undefined' && window.__deferredPwaPrompt)
  );

  return {
    isInstallable: hasPrompt,
    isInstalled,
    isIOS,
    install,
  };
}
