import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Unlock,
  KeyRound,
  Check,
  AlertCircle,
  ShieldCheck,
  Users,
  Volume2,
  Trophy,
  Share2,
  RefreshCw,
  Activity,
  Download,
  Smartphone,
  Globe,
  Radio,
  PenTool,
  EyeOff,
  Sparkles,
  Camera,
  Film,
  Plus,
  Trash2,
  ClipboardPaste,
  Mic,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { bengaliAudio } from '../utils/audioPlayer';
import { CustomVoiceStudio, VoiceSection } from './CustomVoiceStudio';
import {
  fetchAppStats,
  subscribeToControlRoom,
  saveBannerWatermark,
  ShortVideoItem,
  autoFetchVideoDetails,
  saveShortVideosList,
  subscribeToShortVideosList,
  saveLongVideosList,
  subscribeToLongVideosList,
  saveVideoButtonsVisibility,
  subscribeToVideoButtonsVisibility,
  saveAdMobSettings,
  subscribeToAdMobSettings,
  AdMobSettings,
  resetControlRoomStats,
  AppStatsData,
  getSessionId,
} from '../services/firebase';
import { BANNER_WATERMARK_KEY, compressWatermarkImage } from './Banner';
import defaultWatermarkImg from '../assets/images/banner_watermark_girl_1791167915079.jpg';
import sonamonirLogo from '../assets/images/sonamonir_logo_1791965713467.jpg';
import playFeatureGraphicImg from '../assets/images/sonamonir_feature_graphic_1791966724903.jpg';
import playScreenBoardImg from '../assets/images/sonamonir_screen_board_1791966726692.jpg';
import playScreenTracingImg from '../assets/images/sonamonir_screen_tracing_1791966726792.jpg';
import playScreenQuizImg from '../assets/images/sonamonir_screen_quiz_1791966728047.jpg';

export const AdminModal: React.FC = () => {
  const { isAdmin, adminPin, isCustomPinSet, isModalOpen, setIsModalOpen, login, logout, changePin } = useAdmin();
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [pinSavedBanner, setPinSavedBanner] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // AdMob ID & Play Store Settings inside Control Room
  const [adMobConfig, setAdMobConfig] = useState<AdMobSettings>({
    appId: 'ca-app-pub-4591170818423623~7017300992',
    bannerAdUnitId: 'ca-app-pub-4591170818423623/5258241626',
    interstitialAdUnitId: '',
    publisherId: 'pub-4591170818423623',
    adsEnabled: true,
  });
  const [adMobSavedMsg, setAdMobSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAdMobSettings((cfg) => {
      setAdMobConfig(cfg);
    });
    fetch('/api/admob-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && (data.appId || data.bannerAdUnitId)) {
          setAdMobConfig((prev) => ({
            ...prev,
            ...data,
          }));
        }
      })
      .catch(() => {});
    return () => unsub();
  }, []);

  const handleSaveAdMob = async (e: React.FormEvent) => {
    e.preventDefault();
    bengaliAudio.playClickSound();
    const cleanAppId = adMobConfig.appId.trim();
    const cleanBannerId = adMobConfig.bannerAdUnitId.trim();
    const cleanInterstitialId = adMobConfig.interstitialAdUnitId.trim();
    const pubMatch = (cleanAppId || cleanBannerId || cleanInterstitialId).match(/pub-\d{10,20}/i);
    const publisherId = pubMatch ? pubMatch[0].toLowerCase() : '';

    const updated: AdMobSettings = {
      appId: cleanAppId,
      bannerAdUnitId: cleanBannerId,
      interstitialAdUnitId: cleanInterstitialId,
      publisherId,
      adsEnabled: adMobConfig.adsEnabled,
    };

    setAdMobConfig(updated);
    await saveAdMobSettings(updated);
    try {
      await fetch('/api/admin/admob-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: adminPin || '1234',
          ...updated,
        }),
      });
    } catch {}
    setAdMobSavedMsg('✅ আপনার AdMob ID এবং app-ads.txt সফলভাবে সেভ হয়েছে!');
    setTimeout(() => setAdMobSavedMsg(null), 3500);
  };

  // Active section inside Control Room
  const [activeTab, setActiveTab] = useState<'dashboard' | 'voices' | 'players' | 'security'>('dashboard');
  const [selectedVoiceSection, setSelectedVoiceSection] = useState<VoiceSection>('bangla');

  const handleOpenVoiceStudio = (section?: VoiceSection) => {
    bengaliAudio.playClickSound();
    if (section) {
      setSelectedVoiceSection(section);
    }
    setActiveTab('voices');
  };

  // Pin change fields
  const [newPinInput, setNewPinInput] = useState('');

  // Real-time Control Room data
  const [stats, setStats] = useState<AppStatsData>({
    totalVisits: 0,
    totalInstalls: 0,
    totalPlays: 0,
    totalQuizzes: 0,
    totalTracing: 0,
    totalShares: 0,
    activePlayers: [],
    recentEvents: [],
  });
  const [loadingStats, setLoadingStats] = useState(false);
  const [watermarkPreview, setWatermarkPreview] = useState<string>(() => {
    try {
      return localStorage.getItem(BANNER_WATERMARK_KEY) || defaultWatermarkImg;
    } catch {
      return defaultWatermarkImg;
    }
  });
  const [watermarkSavedMsg, setWatermarkSavedMsg] = useState(false);

  // Short Videos Admin management inside Control Room
  const [shortVideos, setShortVideos] = useState<ShortVideoItem[]>([]);
  const [shortLinkInput, setShortLinkInput] = useState('');
  const [shortTitleInput, setShortTitleInput] = useState('');
  const [shortSavedMsg, setShortSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToShortVideosList((list) => {
      setShortVideos(list);
    });
    return () => unsub();
  }, []);

  const handleControlRoomAddShortVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    const urls = shortLinkInput
      .split(/[\n,\s]+/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//i.test(s));

    if (urls.length === 0) {
      setShortSavedMsg('সঠিক ভিডিও লিংক (https://...) পেস্ট করুন!');
      setTimeout(() => setShortSavedMsg(null), 3000);
      return;
    }

    setShortSavedMsg('⚡ লিংক থেকে ভিডিও ও শিরোনাম অটো-ফেচ করা হচ্ছে...');
    const now = new Date().toISOString();
    const added: ShortVideoItem[] = [];

    for (let idx = 0; idx < urls.length; idx++) {
      const url = urls[idx];
      const meta = await autoFetchVideoDetails(url);
      added.push({
        id: `short_${Date.now()}_${idx}`,
        url,
        resolvedUrl: meta.resolvedUrl || url,
        canonicalEmbedUrl: meta.canonicalEmbedUrl || '',
        directMp4Url: meta.directMp4Url || '',
        thumbnail: meta.thumbnail || '',
        platform: meta.platform || 'external',
        title:
          shortTitleInput.trim() ||
          meta.title ||
          `শিক্ষামূলক শর্ট ভিডিও #${shortVideos.length + idx + 1}`,
        addedAt: now,
      });
    }

    await saveShortVideosList([...added, ...shortVideos]);
    setShortLinkInput('');
    setShortTitleInput('');
    setShortSavedMsg('✅ ভিডিও অটো-ফেচ হয়ে সেভ হয়েছে! সবাই এখন দেখতে পাবে।');
    setTimeout(() => setShortSavedMsg(null), 3500);
  };

  const handleControlRoomDeleteShortVideo = async (id: string) => {
    await saveShortVideosList(shortVideos.filter((v) => v.id !== id));
    setShortSavedMsg('🗑️ ভিডিওটি মুছে ফেলা হয়েছে।');
    setTimeout(() => setShortSavedMsg(null), 2500);
  };

  // Long Videos Admin management inside Control Room
  const [longVideos, setLongVideos] = useState<ShortVideoItem[]>([]);
  const [longLinkInput, setLongLinkInput] = useState('');
  const [longTitleInput, setLongTitleInput] = useState('');
  const [longSavedMsg, setLongSavedMsg] = useState<string | null>(null);
  const [videosVisible, setVideosVisible] = useState(true);
  const [zipDownloadStatus, setZipDownloadStatus] = useState<string | null>(null);

  const handleDirectBlobDownload = async (urlPath: string, fileName: string) => {
    try {
      setZipDownloadStatus(`⏳ ${fileName} ডাউনলোড তৈরি হচ্ছে...`);
      const res = await fetch(urlPath, { credentials: 'include' });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      setZipDownloadStatus(`✅ ${fileName} ডাউনলোড শুরু হয়েছে!`);
      setTimeout(() => setZipDownloadStatus(null), 4000);
    } catch {
      window.location.assign(urlPath);
      setZipDownloadStatus(null);
    }
  };

  useEffect(() => {
    const unsub = subscribeToLongVideosList((list) => {
      setLongVideos(list);
    });
    const unsubVis = subscribeToVideoButtonsVisibility((vis) => {
      setVideosVisible(vis);
    });
    return () => {
      unsub();
      unsubVis();
    };
  }, []);

  const handleToggleVideosVisibility = async () => {
    bengaliAudio.playClickSound();
    const next = !videosVisible;
    setVideosVisible(next);
    await saveVideoButtonsVisibility(next);
  };

  const handleControlRoomAddLongVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    const urls = longLinkInput
      .split(/[\n,\s]+/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//i.test(s));

    if (urls.length === 0) {
      setLongSavedMsg('সঠিক ভিডিও লিংক (https://...) পেস্ট করুন!');
      setTimeout(() => setLongSavedMsg(null), 3000);
      return;
    }

    setLongSavedMsg('⚡ লিংক থেকে লং ভিডিও ও শিরোনাম অটো-ফেচ করা হচ্ছে...');
    const now = new Date().toISOString();
    const added: ShortVideoItem[] = [];

    for (let idx = 0; idx < urls.length; idx++) {
      const url = urls[idx];
      const meta = await autoFetchVideoDetails(url);
      added.push({
        id: `long_${Date.now()}_${idx}`,
        url,
        resolvedUrl: meta.resolvedUrl || url,
        canonicalEmbedUrl: meta.canonicalEmbedUrl || '',
        directMp4Url: meta.directMp4Url || '',
        thumbnail: meta.thumbnail || '',
        platform: meta.platform || 'external',
        title:
          longTitleInput.trim() ||
          meta.title ||
          `শিক্ষামূলক লং ভিডিও #${longVideos.length + idx + 1}`,
        addedAt: now,
      });
    }

    await saveLongVideosList([...added, ...longVideos]);
    setLongLinkInput('');
    setLongTitleInput('');
    setLongSavedMsg('✅ লং ভিডিও অটো-ফেচ হয়ে সেভ হয়েছে! সবাই এখন দেখতে পাবে।');
    setTimeout(() => setLongSavedMsg(null), 3500);
  };

  const handleControlRoomDeleteLongVideo = async (id: string) => {
    await saveLongVideosList(longVideos.filter((v) => v.id !== id));
    setLongSavedMsg('🗑️ লং ভিডিওটি মুছে ফেলা হয়েছে।');
    setTimeout(() => setLongSavedMsg(null), 2500);
  };

  const handleControlRoomWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressWatermarkImage(file);
      setWatermarkPreview(compressed);
      try {
        localStorage.setItem(BANNER_WATERMARK_KEY, compressed);
      } catch {}
      window.dispatchEvent(
        new CustomEvent('banner-watermark-updated', { detail: compressed })
      );
      await saveBannerWatermark(compressed);
      setWatermarkSavedMsg(true);
      setTimeout(() => setWatermarkSavedMsg(false), 3000);
    } catch (err) {
      console.error('Failed to upload watermark from Control Room:', err);
    }
  };

  // Subscribe to real-time Firestore updates whenever Control Room is open and Admin is authenticated
  useEffect(() => {
    if (!isAdmin || !isModalOpen) return;

    setLoadingStats(true);
    fetchAppStats()
      .then((initial) => {
        setStats(initial);
        setLoadingStats(false);
      })
      .catch(() => setLoadingStats(false));

    const unsubscribe = subscribeToControlRoom((partial) => {
      setStats((prev) => ({
        ...prev,
        ...partial,
      }));
      setLoadingStats(false);
    });

    // Prune any player whose heartbeat expired (> 45s) every 5 seconds in real time
    const pruneInterval = setInterval(() => {
      const nowMs = Date.now();
      setStats((prev) => ({
        ...prev,
        activePlayers: prev.activePlayers.filter(
          (p) => p.lastSeenMs > 0 && nowMs - p.lastSeenMs <= 45000
        ),
      }));
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(pruneInterval);
    };
  }, [isAdmin, isModalOpen]);

  if (!isModalOpen) return null;

  const handleClose = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setPinInput('');
    setNewPinInput('');
    setIsModalOpen(false);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    bengaliAudio.playClickSound();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    const result = await login(pinInput);
    setIsLoading(false);

    if (result.success) {
      setSuccessMsg('কন্ট্রোল রুম আনলক হয়েছে!');
      setPinInput('');
      setActiveTab('dashboard');
      setTimeout(() => {
        setSuccessMsg('');
      }, 1500);
    } else {
      setErrorMsg(result.error || 'ভুল এডমিন পিন কোড!');
    }
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    bengaliAudio.playClickSound();
    setErrorMsg('');
    setSuccessMsg('');
    setPinSavedBanner(null);
    setIsLoading(true);

    const result = await changePin(newPinInput);
    setIsLoading(false);

    if (result.success) {
      const msg = `✅ নতুন এডমিন পিন কোড স্থায়ীভাবে সংরক্ষিত হয়েছে!`;
      setSuccessMsg(msg);
      setPinSavedBanner(msg);
      setNewPinInput('');
      setTimeout(() => {
        setSuccessMsg('');
        setPinSavedBanner(null);
      }, 4500);
    } else {
      setErrorMsg(result.error || 'পিন পরিবর্তন ব্যর্থ হয়েছে!');
    }
  };

  const handleLogout = () => {
    bengaliAudio.playClickSound();
    logout();
    setSuccessMsg('কন্ট্রোল রুম লক ও লুকানো হয়েছে।');
    setTimeout(() => {
      setSuccessMsg('');
      setIsModalOpen(false);
    }, 900);
  };

  const handleManualRefresh = async () => {
    bengaliAudio.playClickSound();
    setLoadingStats(true);
    const data = await fetchAppStats();
    setStats(data);
    setLoadingStats(false);
  };

  const handleResetStatsCounters = async () => {
    bengaliAudio.playClickSound();
    setLoadingStats(true);
    await resetControlRoomStats(Math.max(1, installedPlayersCount));
    const data = await fetchAppStats();
    setStats(data);
    setLoadingStats(false);
    setSuccessMsg('পরিসংখ্যান কাউন্টার সফলভাবে রিসেট করা হয়েছে!');
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  const mySessionId = getSessionId();
  const otherPlayersCount = stats.activePlayers.filter((p) => p.sessionId !== mySessionId).length;
  const installedPlayersCount = stats.activePlayers.filter((p) => p.isInstalledApp).length;
  const browserPlayersCount = stats.activePlayers.length - installedPlayersCount;

  const formatTimeAgo = (ms: number) => {
    const diffSec = Math.max(1, Math.floor((Date.now() - ms) / 1000));
    if (diffSec < 60) return `${diffSec} সেকেন্ড আগে`;
    const diffMin = Math.floor(diffSec / 60);
    return `${diffMin} মিনিট আগে`;
  };

  const getTabBadgeName = (tab: string) => {
    if (tab === 'board') return 'বোর্ড বই';
    if (tab === 'flashcard') return 'ফ্ল্যাশকার্ড';
    if (tab === 'tracing') return 'হাতেখড়ি';
    if (tab === 'quiz') return 'কুইজ খেলা';
    if (tab === 'shorts') return 'শর্ট ভিডিও';
    if (tab === 'long_videos') return 'লং ভিডিও';
    if (tab === 'kobita') return 'কবিতা';
    if (tab === 'abriti') return 'আবৃত্তি';
    if (tab === 'chora') return 'ছড়া';
    return tab;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full ${
          isAdmin ? 'max-w-2xl' : 'max-w-sm'
        } bg-slate-900 text-white rounded-3xl p-4 sm:p-6 shadow-2xl border-2 border-amber-500/60 max-h-[92vh] flex flex-col overflow-hidden`}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors z-10 cursor-pointer"
          aria-label="বন্ধ করুন"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Status Messages */}
        {errorMsg && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {!isAdmin ? (
          /* Secret PIN Login Screen for Admin Only */
          <div className="py-2">
            <div className="text-center mb-5">
              <div className="inline-flex p-3.5 rounded-2xl mb-3 bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white font-child">
                গোপন এডমিন কন্ট্রোল রুম
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                শুধুমাত্র অ্যাপ এডমিন পিন কোড দিয়ে কন্ট্রোল রুমে প্রবেশ করতে পারবেন। সাধারণ ব্যবহারকারীরা এটি দেখতে পায় না।
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {isCustomPinSet
                    ? 'আপনার সেট করা গোপন এডমিন পিন কোড দিন'
                    : 'এডমিন পিন কোড (ডিফল্ট: 1234)'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="••••"
                  className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-black rounded-2xl border-2 border-slate-700 bg-slate-800/90 text-amber-400 focus:border-amber-500 focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !pinInput.trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>{isLoading ? 'যাচাই হচ্ছে...' : 'কন্ট্রোল রুম খুলুন'}</span>
              </button>
            </form>

            {/* Quick Direct Download on Login Screen without PIN */}
            <div className="mt-5 p-3 rounded-2xl bg-slate-850 border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300">📦 ফ্রেশ ফাইল সরাসরি ডাউনলোড:</span>
                <span className="text-[10px] text-emerald-400 font-semibold">আজকের রিলিজ</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleDirectBlobDownload(
                      '/download-fresh-apk',
                      'Sonamonir-Pathshala-Latest-Fixed.apk'
                    )
                  }
                  className="py-2 px-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-[11px] flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>📲 APK (5.51 MB)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleDirectBlobDownload(
                      '/download-fresh-aab',
                      'Sonamonir-Pathshala-Latest-Release.aab'
                    )
                  }
                  className="py-2 px-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-[11px] flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>📦 AAB (5.32 MB)</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Authenticated Full Control Room */
          <div className="flex flex-col flex-1 min-h-0">
            {/* Control Room Header */}
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800 pr-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-black text-white font-child">
                      এডমিন কন্ট্রোল রুম
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      LIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    শুধুমাত্র আপনার জন্য দৃশ্যমান • রিয়েল-টাইম মনিটরিং
                  </p>
                </div>
              </div>

              <button
                onClick={handleManualRefresh}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="তথ্য রিফ্রেশ করুন"
              >
                <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            </div>

            {/* Control Room Navigation Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-800/90 p-1 rounded-2xl mb-4 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>ড্যাশবোর্ড</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  bengaliAudio.playClickSound();
                  setActiveTab('voices');
                }}
                className={`py-2 px-2 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'voices'
                    ? 'bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 text-white shadow-sm ring-1 ring-amber-300'
                    : 'text-amber-300 hover:text-white bg-amber-500/10'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>🎙️ ভয়েস স্টুডিও (সকল অডিও)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('players')}
                className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'players'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>লাইভ খেলছে ({stats.activePlayers.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>নিরাপত্তা ও লক</span>
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {activeTab === 'voices' && (
                <CustomVoiceStudio
                  adminPin={adminPin || '1234'}
                  initialSection={selectedVoiceSection}
                />
              )}

              {activeTab === 'dashboard' && (
                <>
                  {/* Top Download Zone for Fresh APK & AAB Files on Preview Screen */}
                  <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-amber-950/80 border-2 border-emerald-400/80 rounded-2xl p-3.5 space-y-2.5 shadow-xl">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-emerald-500/30 pb-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-emerald-400 animate-pulse shrink-0" />
                        <div>
                          <h4 className="text-sm font-black text-white">
                            📲 প্রিভিউ স্কিন ডাউনলোড সেন্টার: ফ্রেশ APK ও প্লে স্টোর AAB
                          </h4>
                          <p className="text-[10px] text-emerald-200">
                            নিচের ৬টি ভয়েস ক্যাটাগরি ও ফিক্সড প্লে স্টোর অ্যাড সহ আজকের ফ্রেশ ফাইল
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/50">
                        আজকের লেটেস্ট বিল্ড
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleDirectBlobDownload(
                            '/download-fresh-apk',
                            'Sonamonir-Pathshala-Latest-Fixed.apk'
                          )
                        }
                        className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
                      >
                        <Smartphone className="w-4 h-4 stroke-[2.5] shrink-0" />
                        <div className="text-left">
                          <div className="font-black leading-tight">📲 ফ্রেশ APK ডাউনলোড (5.51 MB)</div>
                          <div className="text-[9px] font-normal opacity-90">ফোনে সরাসরি ইনস্টল • ৬টি ক্যাটাগরি সহ</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDirectBlobDownload(
                            '/download-fresh-aab',
                            'Sonamonir-Pathshala-Latest-Release.aab'
                          )
                        }
                        className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 active:scale-95 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
                      >
                        <Download className="w-4 h-4 stroke-[2.5] shrink-0" />
                        <div className="text-left">
                          <div className="font-black leading-tight">📦 প্লে স্টোর AAB ডাউনলোড (5.32 MB)</div>
                          <div className="text-[9px] font-normal opacity-90">গুগল প্লে কনসোলে রিলিজ ফাইল</div>
                        </div>
                      </button>
                    </div>

                    <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-700/60 text-[11px] text-slate-300 space-y-1">
                      <div className="text-amber-300 font-bold flex items-center gap-1.5">
                        <span>💡 ইনস্টল করা অ্যাপে ৬টি অপশন দেখতে না পাওয়ার আসল কারণ ও সমাধান:</span>
                      </div>
                      <p className="text-[10px] text-slate-300 leading-relaxed">
                        আপনার ফোনে আগের যে ফাইলটি ইনস্টল করা ছিল (<code>Sonamonir-Pathshala-v10</code>), সেটি ৬টি ক্যাটাগরি তৈরির আগের পুরনো ভার্সন। আগের অ্যাপটি ফোন থেকে <strong>আনইনস্টল (Uninstall)</strong> করে এই <strong>Sonamonir-Pathshala-Latest-Fixed.apk (5.51 MB)</strong> ইনস্টল করলেই প্রিভিউ স্কিনের হুবহু ৬টি ক্যাটাগরি দেখতে পাবেন!
                      </p>
                    </div>
                  </div>

                  {/* Comprehensive Voice Management Hub with 6 Direct Categories */}
                  <div className="bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 border-2 border-amber-400/80 rounded-2xl p-4 space-y-3.5 shadow-xl">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                          <Mic className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-white">
                              🎙️ আসল কণ্ঠ ও অডিও পরিবর্তন স্টুডিও
                            </h4>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black">
                              ৬টি ক্যাটাগরি
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-200 mt-0.5">
                            অ্যাপের যেকোনো অংশের ডিফল্ট অডিও পরিবর্তন করে আপনার নিজের আসল কণ্ঠ দিন
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenVoiceStudio('bangla')}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-transform active:scale-95 shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>সম্পূর্ণ স্টুডিও খুলুন →</span>
                      </button>
                    </div>

                    {/* 6 Direct Voice Action Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {/* 1. A-Z English */}
                      <button
                        type="button"
                        onClick={() => handleOpenVoiceStudio('english')}
                        className="p-3 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 hover:border-purple-400 text-left transition-all group cursor-pointer shadow-sm flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-7 h-7 rounded-lg bg-purple-500 text-white font-black text-xs flex items-center justify-center">
                            A-Z
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 font-bold">
                            ২৬টি বর্ণ
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="text-xs font-black text-purple-200 group-hover:text-white flex items-center justify-between">
                            <span>A-Z ইংরেজি A to Z</span>
                            <span className="text-[10px] text-purple-300 group-hover:translate-x-0.5 transition-transform">ভয়েস দিন →</span>
                          </div>
                          <p className="text-[10px] text-slate-300 mt-0.5">
                            A for Apple... প্রতিটি ইংরেজি বর্ণের উচ্চারণ ও ছড়া
                          </p>
                        </div>
                      </button>

                      {/* 2. Shono Swor */}
                      <button
                        type="button"
                        onClick={() => handleOpenVoiceStudio('intro')}
                        className="p-3 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 hover:border-amber-400 text-left transition-all group cursor-pointer shadow-sm flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                            🔊
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 font-bold">
                            ব্যানার অডিও
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="text-xs font-black text-amber-200 group-hover:text-white flex items-center justify-between">
                            <span>🔊 শোনো স্বর (পরিচিতি)</span>
                            <span className="text-[10px] text-amber-300 group-hover:translate-x-0.5 transition-transform">ভয়েস দিন →</span>
                          </div>
                          <p className="text-[10px] text-slate-300 mt-0.5">
                            হোম পেজের স্বাগতম বার্তা ও অ্যাপ পরিচিতি অডিও
                          </p>
                        </div>
                      </button>

                      {/* 3. Kobita */}
                      <button
                        type="button"
                        onClick={() => handleOpenVoiceStudio('kobita')}
                        className="p-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 hover:border-rose-400 text-left transition-all group cursor-pointer shadow-sm flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-7 h-7 rounded-lg bg-rose-500 text-white font-black text-xs flex items-center justify-center">
                            📖
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 font-bold">
                            ৮টি কবিতা
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="text-xs font-black text-rose-200 group-hover:text-white flex items-center justify-between">
                            <span>📖 কবিতা (৮টি)</span>
                            <span className="text-[10px] text-rose-300 group-hover:translate-x-0.5 transition-transform">ভয়েস দিন →</span>
                          </div>
                          <p className="text-[10px] text-slate-300 mt-0.5">
                            ভোর হলো, আমাদের ছোট নদী, মামার বাড়ি, ইত্যাদি
                          </p>
                        </div>
                      </button>

                      {/* 4. Abritti */}
                      <button
                        type="button"
                        onClick={() => handleOpenVoiceStudio('abriti')}
                        className="p-3 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/40 hover:border-blue-400 text-left transition-all group cursor-pointer shadow-sm flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-7 h-7 rounded-lg bg-blue-500 text-white font-black text-xs flex items-center justify-center">
                            🎤
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 font-bold">
                            ৮টি আবৃত্তি
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="text-xs font-black text-blue-200 group-hover:text-white flex items-center justify-between">
                            <span>🎤 আবৃত্তি (৮টি)</span>
                            <span className="text-[10px] text-blue-300 group-hover:translate-x-0.5 transition-transform">ভয়েস দিন →</span>
                          </div>
                          <p className="text-[10px] text-slate-300 mt-0.5">
                            সংকল্প, খাঁচার পাখি, খোকা যাবে শশুর বাড়ি, ইত্যাদি
                          </p>
                        </div>
                      </button>

                      {/* 5. Chora */}
                      <button
                        type="button"
                        onClick={() => handleOpenVoiceStudio('chora')}
                        className="p-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 hover:border-emerald-400 text-left transition-all group cursor-pointer shadow-sm flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white font-black text-xs flex items-center justify-center">
                            🎵
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                            ৮টি ছড়া
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="text-xs font-black text-emerald-200 group-hover:text-white flex items-center justify-between">
                            <span>🎵 ছড়া (৮টি)</span>
                            <span className="text-[10px] text-emerald-300 group-hover:translate-x-0.5 transition-transform">ভয়েস দিন →</span>
                          </div>
                          <p className="text-[10px] text-slate-300 mt-0.5">
                            হাট্টিমা টিম টিম, আতা গাছে তোতা পাখি, ইত্যাদি
                          </p>
                        </div>
                      </button>

                      {/* 6. Bangla Alphabet */}
                      <button
                        type="button"
                        onClick={() => handleOpenVoiceStudio('bangla')}
                        className="p-3 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 hover:border-amber-400 text-left transition-all group cursor-pointer shadow-sm flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                            অ-ঁ
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 font-bold">
                            ৫০টি বর্ণ
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="text-xs font-black text-amber-200 group-hover:text-white flex items-center justify-between">
                            <span>অ-ঁ বাংলা বর্ণমালা</span>
                            <span className="text-[10px] text-amber-300 group-hover:translate-x-0.5 transition-transform">ভয়েস দিন →</span>
                          </div>
                          <p className="text-[10px] text-slate-300 mt-0.5">
                            অ থেকে চন্দ্রবিন্দু চাঁদ পর্যন্ত ৫০টি বর্ণ ও ছড়া
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                  {/* Top Hero Cards: Live Playing Now & Total Installs */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Card 1: Live Players Right Now */}
                    <div
                      onClick={() => setActiveTab('players')}
                      className="bg-gradient-to-br from-emerald-600/30 via-emerald-900/40 to-slate-900 border-2 border-emerald-500/50 rounded-2xl p-3.5 cursor-pointer hover:border-emerald-400 transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          এখন লাইভ খেলছে
                        </span>
                        <Radio className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-3xl sm:text-4xl font-black text-white tracking-tight my-1 flex items-baseline gap-1.5">
                        <span>{stats.activePlayers.length}</span>
                        <span className="text-xs font-bold text-emerald-300">
                          জন {otherPlayersCount === 0 && stats.activePlayers.length === 1 ? '(আপনি)' : `(অন্যান্য: ${otherPlayersCount})`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-emerald-200/90 mt-1">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20">
                          অ্যাপে: {installedPlayersCount}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800">
                          ব্রাউজারে: {browserPlayersCount}
                        </span>
                      </div>
                    </div>

                    {/* Card 2: Total App Installs */}
                    <div className="bg-gradient-to-br from-amber-500/30 via-orange-900/40 to-slate-900 border-2 border-amber-500/50 rounded-2xl p-3.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                          মোট অ্যাপ ইনস্টল
                        </span>
                        <Download className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="text-3xl sm:text-4xl font-black text-white tracking-tight my-1">
                        {stats.totalInstalls}{' '}
                        <span className="text-xs font-bold text-amber-300">টি</span>
                      </div>
                      <p className="text-[10px] text-amber-200/80 mt-1">
                        ফোনে ইনস্টল হওয়া মোট সংখ্যা
                      </p>
                    </div>
                  </div>

                  {/* Quick Admin PIN Change Card right inside Dashboard */}
                  <form
                    onSubmit={handleChangePinSubmit}
                    className="bg-slate-800/95 border-2 border-purple-400/50 rounded-2xl p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-purple-400" />
                        <h4 className="text-xs sm:text-sm font-black text-purple-300">
                          🔐 কন্ট্রোল রুমের পিন কোড পরিবর্তন
                        </h4>
                      </div>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-amber-300 font-black">
                        বর্তমান সক্রিয় পিন: {adminPin || '1234'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value)}
                        placeholder="নতুন পিন লিখুন (যেমন: 5678)"
                        className="flex-1 px-3.5 py-2 text-xs sm:text-sm font-black rounded-xl border border-slate-600 bg-slate-950 text-amber-300 placeholder-slate-500 focus:border-purple-400 focus:outline-none tracking-wider"
                      />
                      <button
                        type="submit"
                        disabled={isLoading || newPinInput.trim().length < 4}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-black text-xs transition-all disabled:opacity-50 cursor-pointer shrink-0 shadow-md flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>পিন সেভ করুন</span>
                      </button>
                    </div>
                    {pinSavedBanner && (
                      <p className="text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-400/40 px-3 py-1.5 rounded-xl">
                        {pinSavedBanner} (বর্তমান পিন: {adminPin})
                      </p>
                    )}
                  </form>

                  {/* Banner Watermark Control Card inside Control Room */}
                  <div className="bg-slate-800/90 border-2 border-amber-400/50 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={watermarkPreview}
                        alt="Watermark Preview"
                        className="w-14 h-14 rounded-xl object-cover object-top border-2 border-amber-400 shrink-0"
                      />
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-amber-300">
                          উপরের ব্যানার ওয়াটারমার্ক ছবি
                        </h4>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          শুধুমাত্র আপনি (এডমিন) এই ছবি পরিবর্তন করতে পারবেন।
                        </p>
                      </div>
                    </div>

                    <label className="cursor-pointer px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shrink-0 shadow-md active:scale-95 transition-all">
                      <Camera className="w-4 h-4" />
                      <span>{watermarkSavedMsg ? 'সেভ হয়েছে!' : 'ছবি সেট করুন'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleControlRoomWatermarkUpload}
                      />
                    </label>
                  </div>

                  {/* Play Store Review Safe Mode Toggle (Hide/Show Short & Long Video Buttons globally) */}
                  <div className="bg-slate-800/95 border-2 border-emerald-400/50 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          videosVisible
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                        }`}
                      >
                        {videosVisible ? (
                          <Film className="w-5 h-5" />
                        ) : (
                          <EyeOff className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-emerald-300 flex items-center gap-1.5">
                          <span>🛡️ প্লে স্টোর রিভিউ সেফ মোড (ভিডিও বাটন অন/অফ)</span>
                        </h4>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          {videosVisible
                            ? 'বর্তমানে অ্যাপে শর্ট ভিডিও ও লং ভিডিও বাটন সবার জন্য চালু আছে।'
                            : 'প্লে স্টোর রিভিউয়ের জন্য শর্ট ও লং ভিডিও বাটন দুটি এখন সবার ফোন থেকে লুকানো আছে!'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleVideosVisibility}
                      className={`px-3.5 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-md active:scale-95 transition-all ${
                        videosVisible
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      }`}
                    >
                      {videosVisible ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          <span>ভিডিও বাটন লুকান</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>ভিডিও বাটন চালু করুন</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Google AdMob ID & Monetization Control Card inside Control Room */}
                  <div className="bg-slate-800/95 border-2 border-amber-400/60 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                          <span>💰 Google AdMob ID ও বিজ্ঞাপন সেটিংস</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              adMobConfig.appId || adMobConfig.bannerAdUnitId
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                            }`}
                          >
                            {adMobConfig.appId || adMobConfig.bannerAdUnitId
                              ? 'ID যুক্ত আছে'
                              : 'ID এখনো দেওয়া হয়নি'}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          আপনার AdMob App ID ও Banner Ad Unit ID এখানে বসিয়ে সেভ করলেই `/app-ads.txt` সহ যুক্ত হয়ে যাবে।
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleSaveAdMob} className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          AdMob App ID (যেমন: ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy)
                        </label>
                        <input
                          type="text"
                          value={adMobConfig.appId}
                          onChange={(e) =>
                            setAdMobConfig((prev) => ({ ...prev, appId: e.target.value }))
                          }
                          placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Banner Ad Unit ID
                          </label>
                          <input
                            type="text"
                            value={adMobConfig.bannerAdUnitId}
                            onChange={(e) =>
                              setAdMobConfig((prev) => ({
                                ...prev,
                                bannerAdUnitId: e.target.value,
                              }))
                            }
                            placeholder="ca-app-pub-XXXX/YYYY"
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Interstitial Ad Unit ID (ঐচ্ছিক)
                          </label>
                          <input
                            type="text"
                            value={adMobConfig.interstitialAdUnitId}
                            onChange={(e) =>
                              setAdMobConfig((prev) => ({
                                ...prev,
                                interstitialAdUnitId: e.target.value,
                              }))
                            }
                            placeholder="ca-app-pub-XXXX/ZZZZ"
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={adMobConfig.adsEnabled}
                            onChange={(e) =>
                              setAdMobConfig((prev) => ({
                                ...prev,
                                adsEnabled: e.target.checked,
                              }))
                            }
                            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                          />
                          <span>অ্যাপে বিজ্ঞাপন (Ad Slot) চালু রাখুন</span>
                        </label>

                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>AdMob ID সেভ করুন</span>
                        </button>
                      </div>
                    </form>

                    {adMobSavedMsg && (
                      <p className="text-xs font-bold text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-400/30">
                        {adMobSavedMsg}
                      </p>
                    )}
                  </div>

                  {/* Google Play Store Ready Logo, Feature Banner & Phone Screenshots Download Kit */}
                  <div className="bg-slate-800/95 border-2 border-sky-400/60 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-sky-300 flex items-center gap-1.5">
                          <Download className="w-4 h-4 text-sky-400" />
                          <span>📥 গুগল প্লে স্টোর লোগো ও স্ক্রিনশট কিট (রেডি সাইজ)</span>
                        </h4>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          প্লে স্টোরে আপলোড করার জন্য নিচের যেকোনো ছবির “ডাউনলোড” বাটনে ট্যাপ করে ফোনে সেভ করে নিন।
                        </p>
                      </div>
                    </div>

                    {/* App Icon (512x512) & Feature Graphic (1024x500) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-2.5 flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={sonamonirLogo}
                            alt="Play Store Icon 512x512"
                            className="w-14 h-14 rounded-xl object-cover border border-amber-400 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-black text-white truncate">
                              অ্যাপ লোগো (App Icon)
                            </p>
                            <p className="text-[10px] text-amber-300 font-bold">
                              সাইজ: 512 × 512 px (PNG)
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleDirectBlobDownload(
                              '/play-store-assets/sonamonir-pathshala-icon-512x512.png',
                              'sonamonir-pathshala-icon-512x512.png'
                            )
                          }
                          className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1 shrink-0 shadow-md cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>ডাউনলোড</span>
                        </button>
                      </div>

                      <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-2.5 flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={playFeatureGraphicImg}
                            alt="Feature Graphic 1024x500"
                            className="w-20 h-14 rounded-xl object-cover border border-amber-400 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-black text-white truncate">
                              ফিচার ব্যানার (Banner)
                            </p>
                            <p className="text-[10px] text-amber-300 font-bold">
                              সাইজ: 1024 × 500 px (PNG)
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleDirectBlobDownload(
                              '/play-store-assets/sonamonir-pathshala-feature-1024x500.png',
                              'sonamonir-pathshala-feature-1024x500.png'
                            )
                          }
                          className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1 shrink-0 shadow-md cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>ডাউনলোড</span>
                        </button>
                      </div>
                    </div>

                    {/* 3 Phone Screenshots (1080x1920) */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-2 flex flex-col items-center text-center gap-1.5">
                        <img
                          src={playScreenBoardImg}
                          alt="Screenshot 1"
                          className="w-full aspect-[9/16] rounded-lg object-cover border border-slate-700"
                        />
                        <span className="text-[10px] font-bold text-slate-200">
                          স্ক্রিনশট ১ (বর্ণমালা)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleDirectBlobDownload(
                              '/play-store-assets/screenshot-1-bornomala-board.png',
                              'screenshot-1-bornomala-board.png'
                            )
                          }
                          className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>ডাউনলোড</span>
                        </button>
                      </div>

                      <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-2 flex flex-col items-center text-center gap-1.5">
                        <img
                          src={playScreenTracingImg}
                          alt="Screenshot 2"
                          className="w-full aspect-[9/16] rounded-lg object-cover border border-slate-700"
                        />
                        <span className="text-[10px] font-bold text-slate-200">
                          স্ক্রিনশট ২ (হাতেখড়ি)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleDirectBlobDownload(
                              '/play-store-assets/screenshot-2-hatakhori-flashcard.png',
                              'screenshot-2-hatakhori-flashcard.png'
                            )
                          }
                          className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>ডাউনলোড</span>
                        </button>
                      </div>

                      <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-2 flex flex-col items-center text-center gap-1.5">
                        <img
                          src={playScreenQuizImg}
                          alt="Screenshot 3"
                          className="w-full aspect-[9/16] rounded-lg object-cover border border-slate-700"
                        />
                        <span className="text-[10px] font-bold text-slate-200">
                          স্ক্রিনশট ৩ (কুইজ)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleDirectBlobDownload(
                              '/play-store-assets/screenshot-3-quiz-rhymes.png',
                              'screenshot-3-quiz-rhymes.png'
                            )
                          }
                          className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>ডাউনলোড</span>
                        </button>
                      </div>
                    </div>

                    {/* Official Pre-Compiled Google Play Signed AAB, APK & Complete ZIP Download */}
                    <div className="bg-slate-950/90 border-2 border-emerald-500/60 rounded-xl p-3 space-y-2.5 mt-2 shadow-lg">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-xs font-black text-emerald-300">
                          🚀 রেডি ফুলস্ক্রিন Google Play (.AAB), Android (.APK) ও জিপ (.ZIP):
                        </p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-bold">
                          ✅ উপরের লিংক বার ছাড়া (Fullscreen)
                        </span>
                      </div>

                      <p className="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-400/30 rounded-lg px-2.5 py-1.5 leading-relaxed">
                        💡 <strong>গুরুত্বপূর্ণ:</strong> আপনার ফোনে আগের পুরনো APK ইনস্টল করা থাকলে সেটি আগে <strong>আনইনস্টল (Uninstall)</strong> করে নিচের নতুন <strong>📱 Android (.APK) ডাউনলোড</strong> বাটন থেকে ইনস্টল করুন—তাহলে উপরে কোনো লিংক (<code>asia-southeast1.run.app</code>) আর কখনোই দেখাবে না!
                      </p>

                      {/* Primary Row: Direct Signed .AAB & .APK */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleDirectBlobDownload(
                              '/download-aab-hashikhushi',
                              'Hashikhushi-TV-PlayStore.aab'
                            )
                          }
                          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all text-center"
                        >
                          <Download className="w-4 h-4 stroke-[2.5]" />
                          <span>📲 Google Play (.AAB) [com.hashikhushitv.app - SDK 24]</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDirectBlobDownload(
                              '/download-sonamonir-aab',
                              'Sonamonir-Pathshala-PlayStore.aab'
                            )
                          }
                          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all text-center"
                        >
                          <Download className="w-4 h-4 stroke-[2.5]" />
                          <span>📲 Google Play (.AAB) [com.sonamonirpathshala.app]</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleDirectBlobDownload(
                            '/download-apk',
                            'Sonamonir-Pathshala-Android.apk'
                          )
                        }
                        className="w-full py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all text-center"
                      >
                        <Download className="w-4 h-4 stroke-[2.5]" />
                        <span>📱 Android (.APK) ডাউনলোড (ফোনে সরাসরি ইনস্টল করার জন্য)</span>
                      </button>

                      {/* Full Official Play Store Package ZIP (AAB + APK + Keystore + AssetLinks) */}
                      <a
                        href="/download-zip"
                        download="Sonamonir-Pathshala-PlayStore-Package.zip"
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all text-center"
                      >
                        <Download className="w-4 h-4 stroke-[2.5]" />
                        <span>📦 অফিসিয়াল Play Store Package (.ZIP) ডাউনলোড (AAB+APK+Key)</span>
                      </a>

                      {/* Web App Bundle ZIP & Play Store Graphics Kit ZIP */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleDirectBlobDownload(
                              '/api/download/hashikhushi-web-bundle.zip',
                              'Sonamonir-Pathshala-Web-App-Bundle.zip'
                            )
                          }
                          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-emerald-400/50 text-emerald-300 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>📦 ওয়েব অ্যাপ জিপ (.ZIP)</span>
                        </button>

                        <a
                          href="/download-graphics"
                          download="Sonamonir-Pathshala-Graphics-Kit.zip"
                          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-400/50 text-amber-300 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all text-center"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>📦 লোগো ও স্ক্রিনশট জিপ (.ZIP)</span>
                        </a>
                      </div>

                      {zipDownloadStatus && (
                        <p className="text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-400/40 rounded-lg px-2.5 py-1.5 text-center">
                          {zipDownloadStatus}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleDirectBlobDownload(
                              '/play-store-assets/android-build/signing.keystore',
                              'signing.keystore'
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-rose-500/40 text-rose-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>🔑 signing.keystore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDirectBlobDownload(
                              '/play-store-assets/android-build/signing-key-info.txt',
                              'signing-key-info.txt'
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-sky-500/40 text-sky-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>📄 Key Password (txt)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDirectBlobDownload(
                              '/play-store-assets/AndroidManifest-safe.xml',
                              'AndroidManifest.xml'
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Safe AndroidManifest.xml</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDirectBlobDownload('/twa-manifest.json', 'twa-manifest.json')
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>twa-manifest.json</span>
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-1 leading-relaxed border-t border-slate-800 pt-2">
                        <p>
                          • <strong>Package ID:</strong> <code className="text-amber-300">com.sonamonirpathshala.app</code> | <strong>Permissions:</strong> Location, Camera, Contacts সব <strong>OFF</strong>।
                        </p>
                        <p>
                          • <strong>প্লে স্টোরে আপলোড:</strong> সরাসরি উপরের <strong>“📲 Google Play (.AAB) ডাউনলোড”</strong> বাটনে ট্যাপ করে ফাইলটি নামিয়ে Google Play Console-এর Production/Testing-এ আপলোড করে দিন।
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Short Videos Link Copy-Paste Control Card inside Control Room */}
                  <div className="bg-slate-800/90 border-2 border-rose-500/50 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Film className="w-5 h-5 text-rose-400" />
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-rose-300">
                            🎬 শর্ট ভিডিও লিংক কপি-পেস্ট (মোট {shortVideos.length}টি)
                          </h4>
                          <p className="text-[11px] text-slate-300">
                            YouTube Shorts, Facebook Reel বা ভিডিও লিংক পেস্ট করলেই সবাই দেখতে পাবে।
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const txt = await navigator.clipboard.readText();
                            if (txt) setShortLinkInput(txt.trim());
                          } catch {}
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                        <span>পেস্ট</span>
                      </button>
                    </div>

                    <form onSubmit={handleControlRoomAddShortVideo} className="space-y-2">
                      <input
                        type="text"
                        value={shortLinkInput}
                        onChange={(e) => setShortLinkInput(e.target.value)}
                        placeholder="এখানে ভিডিও লিংক (https://...) পেস্ট করুন..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-rose-400"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={shortTitleInput}
                          onChange={(e) => setShortTitleInput(e.target.value)}
                          placeholder="ভিডিওর শিরোনাম (ঐচ্ছিক)"
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-rose-400"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-black text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span>যুক্ত করুন</span>
                        </button>
                      </div>
                    </form>

                    {shortSavedMsg && (
                      <p className="text-xs font-bold text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-400/30">
                        {shortSavedMsg}
                      </p>
                    )}

                    {shortVideos.length > 0 && (
                      <div className="max-h-32 overflow-y-auto space-y-1.5 pt-1">
                        {shortVideos.map((v, idx) => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700 text-xs"
                          >
                            <span className="text-slate-200 font-semibold truncate">
                              {idx + 1}. {v.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleControlRoomDeleteShortVideo(v.id)}
                              className="p-1 rounded-lg bg-red-900/50 hover:bg-red-700 text-red-200 shrink-0 cursor-pointer"
                              title="ডিলিট করুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Long Videos Link Copy-Paste Control Card inside Control Room */}
                  <div className="bg-slate-800/90 border-2 border-indigo-500/50 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Film className="w-5 h-5 text-indigo-400" />
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-indigo-300">
                            📺 লং ভিডিও লিংক কপি-পেস্ট (মোট {longVideos.length}টি)
                          </h4>
                          <p className="text-[11px] text-slate-300">
                            YouTube বা Facebook লং ভিডিও লিংক পেস্ট করলেই সবাই দেখতে পাবে।
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const txt = await navigator.clipboard.readText();
                            if (txt) setLongLinkInput(txt.trim());
                          } catch {}
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                        <span>পেস্ট</span>
                      </button>
                    </div>

                    <form onSubmit={handleControlRoomAddLongVideo} className="space-y-2">
                      <input
                        type="text"
                        value={longLinkInput}
                        onChange={(e) => setLongLinkInput(e.target.value)}
                        placeholder="এখানে লং ভিডিও লিংক (https://...) পেস্ট করুন..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-400"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={longTitleInput}
                          onChange={(e) => setLongTitleInput(e.target.value)}
                          placeholder="ভিডিওর শিরোনাম (ঐচ্ছিক)"
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-400"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-indigo-600 hover:to-teal-600 text-white font-black text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span>যুক্ত করুন</span>
                        </button>
                      </div>
                    </form>

                    {longSavedMsg && (
                      <p className="text-xs font-bold text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-400/30">
                        {longSavedMsg}
                      </p>
                    )}

                    {longVideos.length > 0 && (
                      <div className="max-h-32 overflow-y-auto space-y-1.5 pt-1">
                        {longVideos.map((v, idx) => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700 text-xs"
                          >
                            <span className="text-slate-200 font-semibold truncate">
                              {idx + 1}. {v.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleControlRoomDeleteLongVideo(v.id)}
                              className="p-1 rounded-lg bg-red-900/50 hover:bg-red-700 text-red-200 shrink-0 cursor-pointer"
                              title="ডিলিট করুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Secondary Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3">
                      <div className="flex items-center gap-1.5 text-sky-400 text-xs font-bold mb-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>মোট অ্যাপ খোলা হয়েছে</span>
                      </div>
                      <p className="text-2xl font-black text-white">{stats.totalVisits}</p>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3">
                      <div className="flex items-center gap-1.5 text-pink-400 text-xs font-bold mb-1">
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>মোট বর্ণ ও ছড়া শোনা</span>
                      </div>
                      <p className="text-2xl font-black text-white">{stats.totalPlays}</p>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3">
                      <div className="flex items-center gap-1.5 text-purple-400 text-xs font-bold mb-1">
                        <Trophy className="w-3.5 h-3.5" />
                        <span>কুইজ খেলা সম্পন্ন</span>
                      </div>
                      <p className="text-2xl font-black text-white">{stats.totalQuizzes}</p>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3">
                      <div className="flex items-center gap-1.5 text-teal-400 text-xs font-bold mb-1">
                        <PenTool className="w-3.5 h-3.5" />
                        <span>হাতেখড়ি অনুশীলন</span>
                      </div>
                      <p className="text-2xl font-black text-white">{stats.totalTracing}</p>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 col-span-2 sm:col-span-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-1">
                            <Share2 className="w-3.5 h-3.5" />
                            <span>বন্ধুদের শেয়ার ক্লিক</span>
                          </div>
                          <p className="text-2xl font-black text-white">{stats.totalShares}</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleResetStatsCounters}
                          className="text-[11px] font-bold text-amber-300 hover:text-white bg-slate-900 hover:bg-amber-600/30 px-3 py-1.5 rounded-xl border border-amber-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="টেস্ট কাউন্টার রিসেট করুন"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>কাউন্টার রিসেট</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Live Activity Feed */}
                  <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-3.5">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-amber-400" />
                        লাইভ অ্যাক্টিভিটি লগ (সর্বশেষ ২৫টি কাজ)
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        অটো-আপডেট চালু
                      </span>
                    </div>

                    {stats.recentEvents.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">
                        এখনো কোনো অ্যাক্টিভিটি রেকর্ড হয়নি
                      </p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {stats.recentEvents.map((ev) => (
                          <div
                            key={ev.id}
                            className="text-xs bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-800 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  ev.eventType === 'app_install'
                                    ? 'bg-amber-400'
                                    : ev.eventType === 'quiz_complete'
                                    ? 'bg-purple-400'
                                    : ev.eventType === 'tracing_complete'
                                    ? 'bg-teal-400'
                                    : ev.eventType === 'page_view'
                                    ? 'bg-sky-400'
                                    : 'bg-emerald-400'
                                }`}
                              />
                              <span className="font-semibold text-slate-200 truncate">
                                {ev.eventType === 'app_install' && '📲 নতুন অ্যাপ ইনস্টল হয়েছে!'}
                                {ev.eventType === 'page_view' &&
                                  (ev.details ? `🎬 ${ev.details}` : '👀 অ্যাপ ওপেন করেছে')}
                                {ev.eventType === 'letter_play' && `🔊 বর্ণ শুনেছে: ${ev.details || ''}`}
                                {ev.eventType === 'word_play' && `📖 শব্দ শুনেছে: ${ev.details || ''}`}
                                {ev.eventType === 'rhyme_play' && `🎵 ছড়া/ভিডিও: ${ev.details || ''}`}
                                {ev.eventType === 'quiz_complete' && `🏆 কুইজ সম্পন্ন: ${ev.details || ''}`}
                                {ev.eventType === 'tracing_complete' && `✏️ হাতেখড়ি: ${ev.details || ''}`}
                                {ev.eventType === 'share_click' && '🔗 শেয়ার বাটনে ক্লিক'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(ev.createdAt).toLocaleTimeString('bn-BD', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'players' && (
                <div className="space-y-3">
                  <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3.5 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                        এখন সক্রিয় খেলোয়াড়: {stats.activePlayers.length} জন (অন্যান্য: {otherPlayersCount} জন)
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        যারা এই মুহূর্তে অ্যাপটি খুলে পড়ছে বা খেলছে তাদের লাইভ তালিকা
                      </p>
                    </div>
                  </div>

                  {stats.activePlayers.length === 0 ? (
                    <div className="text-center py-8 bg-slate-800/50 rounded-2xl border border-slate-800">
                      <p className="text-sm text-slate-300 font-bold">এই মুহূর্তে কেউ অনলাইনে নেই</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {stats.activePlayers.map((player, idx) => {
                        const isMe = player.sessionId === mySessionId;
                        return (
                          <div
                            key={player.sessionId}
                            className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                                  player.isInstalledApp
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                }`}
                              >
                                #{idx + 1}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-white">
                                    {player.deviceType}
                                  </span>
                                  {isMe && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                                      আপনি (এডমিন)
                                    </span>
                                  )}
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                                      player.isInstalledApp
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'bg-slate-700 text-slate-300'
                                    }`}
                                  >
                                    {player.isInstalledApp ? (
                                      <>
                                        <Smartphone className="w-2.5 h-2.5" /> ইনস্টল করা অ্যাপ
                                      </>
                                    ) : (
                                      <>
                                        <Globe className="w-2.5 h-2.5" /> ব্রাউজার
                                      </>
                                    )}
                                  </span>
                                </div>
                                <p className="text-xs text-amber-300 font-semibold mt-1 truncate">
                                  বিভাগ: {getTabBadgeName(player.currentTab)} • {player.currentActivity}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                সক্রিয়
                              </span>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {formatTimeAgo(player.lastSeenMs)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-4">
                  {/* Secret Access Reminder */}
                  <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <EyeOff className="w-4 h-4" />
                      <span>গোপন কন্ট্রোল রুম খোলার নিয়ম (শুধুমাত্র আপনার জন্য):</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      সাধারণ ব্যবহারকারীরা অ্যাপের কোথাও কন্ট্রোল রুম বা এডমিন বাটন দেখতে পাবে না। আপনি যখন কন্ট্রোল রুম লক করে রাখবেন, তখন পুনরায় ঢুকতে চাইলে অ্যাপের একদম উপরে বাম কোণায় <strong>‘সোনামণির পাঠশালা’ লোগোতে পরপর ৫ বার ট্যাপ</strong> করবেন—তাহলেই গোপন পিন বক্স খুলে যাবে!
                    </p>
                  </div>

                  {/* Custom Image Upload Permission Info */}
                  <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white">কাস্টম ছবি আপলোড মোড চালু আছে</p>
                        <p className="text-[11px] text-slate-400">
                          বোর্ড বই ও ফ্ল্যাশকার্ডে ক্যামেরা বাটন দিয়ে যেকোনো বর্ণের ছবি বদলাতে পারবেন।
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Change Admin PIN Form */}
                  <form
                    onSubmit={handleChangePinSubmit}
                    className="bg-slate-800/80 border-2 border-purple-500/50 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="block text-xs font-bold text-slate-200">
                        এডমিন পিন কোড পরিবর্তন করুন
                      </label>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-amber-300 font-black">
                        বর্তমান সক্রিয় পিন: {adminPin || '1234'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value)}
                        placeholder="নতুন পিন লিখুন (কমপক্ষে ৪ সংখ্যা)"
                        className="flex-1 px-3.5 py-2.5 text-sm font-black rounded-xl border border-slate-600 bg-slate-900 text-amber-300 placeholder-slate-500 focus:border-amber-500 focus:outline-none tracking-wider"
                        required
                      />
                      <button
                        type="submit"
                        disabled={isLoading || newPinInput.trim().length < 4}
                        className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-colors disabled:opacity-50 cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>পিন সেভ করুন</span>
                      </button>
                    </div>
                    {pinSavedBanner && (
                      <p className="text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-400/40 px-3 py-1.5 rounded-xl">
                        {pinSavedBanner} (বর্তমান পিন: {adminPin})
                      </p>
                    )}
                  </form>

                  {/* Lock Control Room & Hide Button */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-rose-600/20 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>কন্ট্রোল রুম লক করুন ও বাটন লুকিয়ে ফেলুন</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
