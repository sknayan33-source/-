import React, { useState, useEffect } from 'react';
import { Download, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';
import { bengaliAudio } from '../utils/audioPlayer';
import { trackAnalyticsEvent } from '../services/firebase';

interface PWAInstallButtonProps {
  variant?: 'header' | 'floating' | 'card' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Automatically open the App Install prompt when someone visits via a shared ?install=1 link
  useEffect(() => {
    if ((variant !== 'floating' && variant !== 'banner') || isInstalled) return;
    if (typeof window !== 'undefined' && window.location.search.includes('install=1')) {
      setIsModalOpen(true);
    }
  }, [variant, isInstalled]);

  // If already installed and running standalone, do not display
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    bengaliAudio.playClickSound();

    const triggeredNative = await install();
    if (!triggeredNative) {
      setIsModalOpen(true);
    }
  };

  const handleNativeInstall = async (): Promise<boolean> => {
    const triggered = await install();
    if (triggered) {
      setIsModalOpen(false);
      return true;
    }
    return false;
  };

  return (
    <>
      {variant === 'banner' && (
        <div className={`bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white px-3 py-2 text-xs sm:text-sm font-bold flex flex-wrap items-center justify-between gap-2 shadow-sm border-b border-orange-400 ${className}`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-4 h-4 text-yellow-200 shrink-0 animate-bounce" />
            <span className="truncate">
              নতুন নাম <strong>‘সোনামণির পাঠশালা’</strong> আপডেট হয়েছে! হোম স্ক্রিনে পেতে:
            </span>
          </div>
          <button
            type="button"
            onClick={handleClick}
            className="bg-white text-orange-700 hover:bg-yellow-100 px-3 py-1 rounded-xl font-black text-xs shadow-xs cursor-pointer active:scale-95 transition-all shrink-0"
          >
            📲 ফোনে ইনস্টল / আপডেট করুন
          </button>
        </div>
      )}

      {variant === 'header' && (
        <button
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm hover:from-emerald-600 hover:to-teal-700 transition-all border border-emerald-400/30 active:scale-95 cursor-pointer ${className}`}
          title="সোনামণির পাঠশালা অ্যাপটি ফোনে ইনস্টল করুন"
        >
          <Download className="w-3.5 h-3.5 animate-pulse" />
          <span className="hidden sm:inline font-child">অ্যাপ ইনস্টল</span>
          <span className="sm:hidden font-child">ইনস্টল</span>
        </button>
      )}

      {variant === 'floating' && (
        <button
          onClick={handleClick}
          className={`fixed bottom-18 md:bottom-6 left-4 z-40 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-bold px-3.5 py-2.5 rounded-full shadow-2xl border-2 border-white flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-emerald-500/40 cursor-pointer ${className}`}
          title="সোনামণির পাঠশালা অ্যাপটি ফোনে ইনস্টল করুন"
        >
          <Download className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] animate-bounce" />
          <span className="text-xs sm:text-sm font-child font-bold">অ্যাপ ইনস্টল করুন</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-200" />
        </button>
      )}

      {/* Guide Modal if not natively triggered or on iOS */}
      <PWAInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onNativeInstall={handleNativeInstall}
        isNativeInstallable={isInstallable}
        isIOS={isIOS}
      />
    </>
  );
};
