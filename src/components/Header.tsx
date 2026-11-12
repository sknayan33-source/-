import React, { useState } from 'react';
import { Sparkles, ShieldCheck, Download, Smartphone } from 'lucide-react';
import { bengaliAudio, VoiceTone } from '../utils/audioPlayer';
import { ShareModal } from './ShareModal';
import { useAdmin } from '../context/AdminContext';
import { trackAnalyticsEvent } from '../services/firebase';
import { PlayStoreDownloadModal } from './PlayStoreDownloadModal';
import sonamonirLogo from '../assets/images/sonamonir_logo_1791965713467.jpg';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: any) => void;
  speed: 'slow' | 'normal';
  onSpeedToggle: () => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  voiceTone: VoiceTone;
  onVoiceToneToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  speed,
  onSpeedToggle,
  soundEnabled,
  onSoundToggle,
  voiceTone,
  onVoiceToneToggle,
}) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAabModalOpen, setIsAabModalOpen] = useState(false);
  const [isAabDownloading, setIsAabDownloading] = useState(false);
  const [aabDownloaded, setAabDownloaded] = useState(false);
  const [isApkDownloading, setIsApkDownloading] = useState(false);
  const [apkDownloaded, setApkDownloaded] = useState(false);
  const { isAdmin, setIsModalOpen } = useAdmin();
  const tapCountRef = React.useRef(0);
  const tapTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Direct APK Downloader
  const handleDownloadAPK = async () => {
    try {
      setIsApkDownloading(true);
      bengaliAudio.playClickSound();
      const res = await fetch('/download-fresh-apk');
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Sonamonir-Pathshala-Latest-Fixed.apk';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setApkDownloaded(true);
      setTimeout(() => setApkDownloaded(false), 6000);
    } catch {
      window.location.href = '/download-fresh-apk';
    } finally {
      setIsApkDownloading(false);
    }
  };

  // Direct Google Play Store .AAB file Downloader
  const handleDownloadAAB = async () => {
    try {
      setIsAabDownloading(true);
      bengaliAudio.playClickSound();
      const res = await fetch('/download-fresh-aab');
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Sonamonir-Pathshala-Latest-Release.aab';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setAabDownloaded(true);
      setTimeout(() => setAabDownloaded(false), 6000);
    } catch {
      window.location.href = '/download-fresh-aab';
    } finally {
      setIsAabDownloading(false);
    }
  };

  // Secret 5-tap trigger on the 'অ' logo to open Admin Control Room login
  const handleSecretLogoTap = () => {
    if (isAdmin) {
      bengaliAudio.playClickSound();
      setIsModalOpen(true);
      return;
    }
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      bengaliAudio.playClickSound();
      setIsModalOpen(true);
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 2500);
    }
  };

  const handleShare = () => {
    bengaliAudio.playClickSound();
    trackAnalyticsEvent('share_click');
    setIsShareModalOpen(true);
  };
  return (
    <header className="sticky top-0 z-30 w-full max-w-full overflow-x-hidden bg-white/95 backdrop-blur-md border-b border-amber-200/60 shadow-xs">
      {/* 1-Tap Google Play Console .AAB File Download Bar — Strictly for Admin */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white px-2.5 sm:px-3 py-1.5 text-xs font-bold flex items-center justify-between gap-2 shadow-xs border-b border-emerald-500/30">
          <div
            onClick={() => {
              bengaliAudio.playClickSound();
              setIsAabModalOpen(true);
            }}
            className="flex items-center gap-1.5 min-w-0 truncate cursor-pointer hover:opacity-90"
            title="গুগল প্লে স্টোর ফাইল ও কিট বিস্তারিত দেখুন"
          >
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase shrink-0">
              Play Console
            </span>
            <span className="truncate text-[11px] sm:text-xs">
              গুগল প্লে স্টোর ফাইল (.AAB - SDK 24 ফিক্সড)
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleDownloadAPK}
              disabled={isApkDownloading}
              className="bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-slate-950 font-black text-xs px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-60 transition-transform"
              title="Sonamonir-Pathshala-Latest-Fixed.apk (5.51 MB) ফোনে সরাসরি ডাউনলোড করুন"
            >
              <Smartphone className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>
                {isApkDownloading
                  ? 'নামছে...'
                  : apkDownloaded
                  ? '✅ সেভ!'
                  : '📲 APK (5.51 MB)'}
              </span>
            </button>
            <button
              type="button"
              onClick={handleDownloadAAB}
              disabled={isAabDownloading}
              className="bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-60 transition-transform"
              title="Sonamonir-Pathshala-Latest-Release.aab ফাইল সরাসরি ডাউনলোড করুন"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>
                {isAabDownloading
                  ? 'নামছে...'
                  : aabDownloaded
                  ? '✅ সেভ!'
                  : '📦 AAB (5.32 MB)'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                bengaliAudio.playClickSound();
                setIsAabModalOpen(true);
              }}
              className="bg-slate-900/90 hover:bg-slate-950 text-amber-300 border border-amber-400/50 font-bold text-[11px] sm:text-xs px-2 py-1 rounded-lg shrink-0 flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-transform"
              title="লোগো, ব্যানার, স্ক্রিনশট ও অন্যান্য ভার্সন দেখুন"
            >
              <span>লোগো ও কিট</span>
            </button>
          </div>
        </div>
      )}
      <div className="max-w-6xl w-full mx-auto px-2.5 sm:px-4 py-2 flex items-center justify-between gap-2">
        {/* Zone 1: Hashikhushi TV Brand Logo & Wordmark (with secret 5-tap trigger for Admin Control Room) */}
        <div
          onClick={handleSecretLogoTap}
          className="flex items-center gap-2 sm:gap-2.5 min-w-0 max-w-[75%] sm:max-w-none select-none cursor-pointer group"
        >
          <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-2xl p-0.5 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-md group-hover:scale-105 active:scale-95 transition-transform shrink-0">
            <img
              src={sonamonirLogo}
              alt="সোনামণির পাঠশালা লোগো"
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-[14px] object-cover bg-white"
            />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white shadow-xs" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-base sm:text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-orange-600 via-rose-600 to-purple-700 bg-clip-text text-transparent font-child truncate drop-shadow-[0_1px_1px_rgba(0,0,0,0.06)]">
                সোনামণির পাঠশালা
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0 hidden xs:inline" />
            </div>
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-500 tracking-wide truncate">
              Sonamonir Pathshala • শিশু শিক্ষা ও বিনোদন
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Desktop only) */}
        <nav className="hidden md:flex items-center gap-2 bg-amber-100/50 p-1 rounded-xl">
          <button
            onClick={() => {
              bengaliAudio.playClickSound();
              onTabChange('board');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'board'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-amber-200/50'
            }`}
          >
            বোর্ড বই (বই পড়া)
          </button>
          <button
            onClick={() => {
              bengaliAudio.playClickSound();
              onTabChange('flashcard');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'flashcard'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-amber-200/50'
            }`}
          >
            একক কার্ড (ফ্ল্যাশকার্ড)
          </button>
          <button
            onClick={() => {
              bengaliAudio.playClickSound();
              onTabChange('tracing');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'tracing'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-amber-200/50'
            }`}
          >
            হাতেখড়ি (আঁকাআঁকি)
          </button>
          <button
            onClick={() => {
              bengaliAudio.playClickSound();
              onTabChange('quiz');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'quiz'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-amber-200/50'
            }`}
          >
            কুইজ ও খেলা
          </button>
        </nav>

        {/* Zone 3: Clean Header Right Controls (Voice Tone & Admin if logged in) — Strict Mobile Fit */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Female Voice Tone Indicator / Toggle */}
          <button
            onClick={onVoiceToneToggle}
            className="h-7 px-2 rounded-xl border border-pink-200 bg-pink-50 text-pink-900 text-[11px] font-bold flex items-center gap-1 hover:bg-pink-100 transition-colors shadow-2xs whitespace-nowrap active:scale-95 cursor-pointer shrink-0"
            title="মহিলা কণ্ঠ পরিবর্তন করুন"
          >
            <span className="text-pink-500 text-xs">🌸</span>
            <span>{voiceTone === 'sweet' ? 'মিষ্টি দিদি' : 'শিক্ষক'}</span>
          </button>

          {/* Admin Control Room Badge — ONLY visible if authenticated admin */}
          {isAdmin && (
            <button
              onClick={() => {
                bengaliAudio.playClickSound();
                setIsModalOpen(true);
              }}
              className="h-7 px-2 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all shadow-md active:scale-95 cursor-pointer bg-slate-900 text-amber-400 border border-amber-500/60 hover:bg-slate-800 shrink-0"
              title="এডমিন কন্ট্রোল রুম ও নিজের কণ্ঠ স্টুডিও খুলুন"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-child">কন্ট্রোল রুম</span>
            </button>
          )}
        </div>
      </div>

      {/* Share Modal Dialog */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Play Store AAB & Graphics Kit Download Modal */}
      <PlayStoreDownloadModal
        isOpen={isAabModalOpen}
        onClose={() => setIsAabModalOpen(false)}
      />
    </header>
  );
};
