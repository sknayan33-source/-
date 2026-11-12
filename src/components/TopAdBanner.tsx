import React, { useEffect, useState, useRef } from 'react';
import { Star, Settings, ExternalLink } from 'lucide-react';
import { subscribeToAdMobSettings, AdMobSettings, trackAnalyticsEvent } from '../services/firebase';
import { useAdmin } from '../context/AdminContext';
import { bengaliAudio } from '../utils/audioPlayer';
import sonamonirLogo from '../assets/images/sonamonir_logo_1791965713467.jpg';
import playStoreIconImg from '../assets/images/play_store_icon_1791338201142.jpg';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    AndroidAdMob?: {
      showTopBanner?: (adUnitId: string, appId?: string) => void;
      hideTopBanner?: () => void;
    };
  }
}

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.hashikhushitv.app';

interface SafeBannerAdItem {
  id: string;
  title: string;
  subtitle: string;
  rating: string;
  ctaText: string;
  icon: string;
  badgeColor: string;
}

const FAMILY_SAFE_BANNER_ADS: SafeBannerAdItem[] = [
  {
    id: 'ad-1',
    title: 'সোনামণির পাঠশালা — গুগল প্লে স্টোর অ্যাপ',
    subtitle: 'Family Safe • অ থেকে ঁ, ছড়া, কবিতা ও বর্ণমালা',
    rating: '৪.৯ ★',
    ctaText: 'ইনস্টল / ওপেন',
    icon: playStoreIconImg,
    badgeColor: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'ad-2',
    title: 'ছোটদের হাতেখড়ি ও বর্ণমালা কুইজ গেম',
    subtitle: 'Family Safe • প্লে স্টোর থেকে ফ্রিতে নামিয়ে নিন',
    rating: 'প্লে স্টোর',
    ctaText: 'ইনস্টল',
    icon: sonamonirLogo,
    badgeColor: 'from-blue-600 to-indigo-600',
  },
  {
    id: 'ad-3',
    title: 'ছোটদের ছড়া, মিষ্টি দিদির কণ্ঠ ও ড্রয়িং',
    subtitle: 'Family Safe • গুগল প্লে স্টোরে রেটিং ও আপডেট দেখুন',
    rating: 'ফ্রি অ্যাপ',
    ctaText: 'খুলুন',
    icon: playStoreIconImg,
    badgeColor: 'from-amber-500 to-orange-600',
  },
];

export const TopAdBanner: React.FC = () => {
  const { isAdmin, setIsModalOpen } = useAdmin();
  const [adConfig, setAdConfig] = useState<AdMobSettings>({
    appId: 'ca-app-pub-4591170818423623~7017300992',
    bannerAdUnitId: 'ca-app-pub-4591170818423623/5258241626',
    interstitialAdUnitId: '',
    publisherId: 'pub-4591170818423623',
    adsEnabled: true,
  });

  const [adIndex, setAdIndex] = useState(0);
  const [adLoadState, setAdLoadState] = useState<'idle' | 'loading' | 'filled' | 'unfilled' | 'error'>('idle');
  const [adLoadMessage, setAdLoadMessage] = useState<string>('AdMob প্রস্তুত হচ্ছে...');
  const adSlotRef = useRef<HTMLModElement | null>(null);

  const [showRedirectToast, setShowRedirectToast] = useState(false);

  const handleOpenPlayStore = (e?: React.MouseEvent) => {
    try {
      bengaliAudio.playClickSound();
      trackAnalyticsEvent('ad_banner_click', FAMILY_SAFE_BANNER_ADS[adIndex]?.id || 'ad-1');
    } catch {}

    setShowRedirectToast(true);
    setTimeout(() => setShowRedirectToast(false), 3000);

    const webPlayStoreUrl = PLAY_STORE_URL;
    const marketUrl = 'market://details?id=com.hashikhushitv.app';

    // 1. If running inside Android app with native Java interface
    if (typeof window !== 'undefined' && (window as any).AndroidApp?.openPlayStore) {
      if (e) e.preventDefault();
      try {
        (window as any).AndroidApp.openPlayStore();
        return;
      } catch {}
    }

    // 2. On Android device WebViews / browsers: try window.location with market://
    const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
    if (isAndroid) {
      try {
        window.location.href = marketUrl;
        return;
      } catch {}
    }

    // 3. Fallback: window.open and natural anchor tag navigation
    try {
      window.open(webPlayStoreUrl, '_blank');
    } catch {}
  };

  // Parse slot ID from unit ID like ca-app-pub-4591170818423623/5258241626 -> 5258241626
  const slotMatch = (adConfig.bannerAdUnitId || '').match(/\/(\d{8,25})$/);
  const slotId = slotMatch ? slotMatch[1] : '5258241626';

  // Parse publisher client like ca-pub-4591170818423623
  const pubMatch = (adConfig.publisherId || adConfig.appId || adConfig.bannerAdUnitId || '').match(/pub-\d{10,20}/i);
  const clientPublisher = pubMatch ? `ca-${pubMatch[0].toLowerCase()}` : 'ca-pub-4591170818423623';

  // Fetch and sync configuration
  useEffect(() => {
    const unsub = subscribeToAdMobSettings((cfg) => {
      setAdConfig(cfg);
    });

    fetch('/api/admob-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.adsEnabled === 'boolean') {
          setAdConfig((prev) => ({
            ...prev,
            ...data,
            appId: data.appId || prev.appId,
            bannerAdUnitId: data.bannerAdUnitId || prev.bannerAdUnitId,
            interstitialAdUnitId: data.interstitialAdUnitId || prev.interstitialAdUnitId,
            publisherId: data.publisherId || prev.publisherId,
          }));
        }
      })
      .catch(() => {});

    return () => unsub();
  }, []);

  // Native Android AdMob Bridge execution
  useEffect(() => {
    if (!adConfig.adsEnabled) {
      if (typeof window !== 'undefined' && window.AndroidAdMob?.hideTopBanner) {
        window.AndroidAdMob.hideTopBanner();
      }
      return;
    }

    const activeBannerId = adConfig.bannerAdUnitId?.trim() || 'ca-app-pub-4591170818423623/5258241626';
    const activeAppId = adConfig.appId?.trim() || 'ca-app-pub-4591170818423623~7017300992';

    console.log('[AdMob Banner] Active Configuration:', {
      appId: activeAppId,
      bannerAdUnitId: activeBannerId,
      publisherClient: clientPublisher,
      slotId: slotId,
      status: 'Ready'
    });

    if (typeof window !== 'undefined' && window.AndroidAdMob?.showTopBanner) {
      try {
        window.AndroidAdMob.showTopBanner(activeBannerId, activeAppId);
        console.log('[AdMob Banner] Invoked Native AndroidAdMob.showTopBanner');
      } catch (err) {
        console.warn('[AdMob Banner] Native bridge error:', err);
      }
    }
  }, [adConfig.adsEnabled, adConfig.bannerAdUnitId, adConfig.appId, clientPublisher, slotId]);

  // Google AdMob / AdSense Web ad injection & fill status observer
  useEffect(() => {
    if (!adConfig.adsEnabled) return;

    setAdLoadState('loading');
    setAdLoadMessage('Google AdMob সার্ভারের সাথে সংযোগ করা হচ্ছে...');

    const timer = setTimeout(() => {
      try {
        if (typeof window !== 'undefined') {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          console.log('[AdMob Banner] adsbygoogle.push() dispatched for slot:', slotId);
        }
      } catch (err: unknown) {
        console.warn('[AdMob Banner] Push exception (handled):', err);
        setAdLoadState('unfilled');
        setAdLoadMessage('Error Code 3 (No Fill): বিজ্ঞাপন ইনভেন্টরি লোড হচ্ছে');
      }
    }, 400);

    // Monitor for actual ad fill inside <ins> tag
    const checkFillInterval = setInterval(() => {
      if (!adSlotRef.current) return;
      const adStatus = adSlotRef.current.getAttribute('data-ad-status');
      const hasIframe = adSlotRef.current.querySelector('iframe');

      if (adStatus === 'filled' || (hasIframe && hasIframe.offsetHeight > 20)) {
        setAdLoadState('filled');
        setAdLoadMessage('Google AdMob বিজ্ঞাপন সফলভাবে লোড হয়েছে');
        clearInterval(checkFillInterval);
      } else if (adStatus === 'unfilled') {
        setAdLoadState('unfilled');
        setAdLoadMessage('Error Code 3 (No-Fill): AdMob ইনভেন্টরি প্রস্তুত হচ্ছে');
        clearInterval(checkFillInterval);
      }
    }, 1500);

    // Timeout after 6 seconds to avoid perpetual waiting
    const timeout = setTimeout(() => {
      clearInterval(checkFillInterval);
      if (adLoadState === 'loading') {
        setAdLoadState('unfilled');
        setAdLoadMessage('AdMob রেডি: ইনভেন্টরি বরাদ্দ হলে লাইভ বিজ্ঞাপন প্রদর্শিত হবে');
      }
    }, 6000);

    return () => {
      clearTimeout(timer);
      clearTimeout(timeout);
      clearInterval(checkFillInterval);
    };
  }, [adConfig.adsEnabled, slotId]);

  // Rotate fallback ads every 12s if real ad is unfilled
  useEffect(() => {
    if (!adConfig.adsEnabled || adLoadState === 'filled') return;
    const timer = setInterval(() => {
      setAdIndex((prev) => (prev + 1) % FAMILY_SAFE_BANNER_ADS.length);
    }, 12000);
    return () => clearInterval(timer);
  }, [adConfig.adsEnabled, adLoadState]);

  if (!adConfig.adsEnabled) {
    return null;
  }

  const currentAd = FAMILY_SAFE_BANNER_ADS[adIndex] || FAMILY_SAFE_BANNER_ADS[0];

  return (
    <div
      className="w-full max-w-full overflow-hidden bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 border-b-2 border-amber-500/50 px-2 sm:px-4 py-1 sm:py-1.5 z-40 select-none shadow-md"
      style={{
        paddingTop: 'var(--app-safe-top, max(env(safe-area-inset-top, 0px), 6px))',
      }}
      role="region"
      aria-label="Google AdMob Top Banner"
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
        {/* Google AdMob Container */}
        <div className="relative flex-1 bg-white text-slate-900 rounded-xl border border-slate-300 px-2 sm:px-2.5 py-1 sm:py-1.5 shadow-xs flex items-center justify-between gap-1.5 sm:gap-2.5 min-h-[50px] sm:min-h-[54px] overflow-hidden">
          
          {/* Live AdMob Web/PWA Slot (Hidden until filled) */}
          <div
            className={`w-full flex justify-center items-center ${
              adLoadState === 'filled' ? 'block' : 'hidden'
            }`}
          >
            <ins
              ref={adSlotRef}
              className="adsbygoogle"
              style={{ display: 'inline-block', width: '320px', height: '50px' }}
              data-ad-client={clientPublisher}
              data-ad-slot={slotId}
              data-ad-format="horizontal"
              data-full-width-responsive="false"
            />
          </div>

          {/* Fallback Family-Safe Banner (Shown while loading or if AdMob returns No-Fill) */}
          {adLoadState !== 'filled' && (
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOpenPlayStore}
              className="flex items-center justify-between w-full gap-2 min-w-0 no-underline cursor-pointer select-none group"
              title="গুগল প্লে স্টোরে অ্যাপটি ইনস্টল বা ওপেন করুন"
            >
              <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
                <div className="relative shrink-0">
                  <img
                    src={currentAd.icon}
                    alt={currentAd.title}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl object-cover border border-amber-300 shadow-2xs bg-amber-50 shrink-0 group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute -top-1 -left-1 px-1 py-[0.5px] rounded bg-amber-400 text-slate-950 font-black text-[8px] sm:text-[9px] leading-tight border border-white shadow-2xs">
                    Ad
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <span className="px-1 sm:px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700 font-extrabold text-[8px] sm:text-[9px] uppercase tracking-wider shrink-0">
                      বিজ্ঞাপন
                    </span>
                    <p className="font-child font-black text-[11px] sm:text-xs md:text-sm text-slate-900 truncate group-hover:text-amber-800 transition-colors">
                      {currentAd.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 mt-0.5 text-[9px] sm:text-[11px] text-slate-600 truncate">
                    <span className="inline-flex items-center gap-0.5 font-extrabold text-amber-600 shrink-0">
                      <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400 text-amber-500" />
                      {currentAd.rating}
                    </span>
                    <span>•</span>
                    <span className="truncate">{currentAd.subtitle}</span>
                  </div>
                </div>
              </div>

              {/* Action CTA badge */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <span
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gradient-to-r ${currentAd.badgeColor} text-white font-black text-[11px] sm:text-xs tracking-tight shadow-xs flex items-center gap-1 group-hover:opacity-95 group-active:scale-95 transition-all shrink-0 whitespace-nowrap`}
                >
                  <span>{currentAd.ctaText}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </span>
              </div>
            </a>
          )}
        </div>

        {/* Admin Ad Control Quick Button */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-2.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
            title="কন্ট্রোল রুম থেকে AdMob ID ও সেটিংস পরিচালনা করুন"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ad সেটিংস</span>
          </button>
        )}
      </div>

      {/* Visual redirect feedback toast */}
      {showRedirectToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2 rounded-full border-2 border-amber-400 text-xs font-bold shadow-2xl animate-bounce flex items-center gap-1.5 whitespace-nowrap">
          <span>📲 গুগল প্লে স্টোরে অ্যাপটি ওপেন হচ্ছে...</span>
        </div>
      )}
    </div>
  );
};
