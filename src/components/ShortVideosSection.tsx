import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Film,
  ChevronUp,
  ChevronDown,
  Heart,
  Share2,
  Plus,
  Trash2,
  X,
  Check,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Zap,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  ShortVideoItem,
  autoFetchVideoDetails,
  saveShortVideosList,
  subscribeToShortVideosList,
  trackAnalyticsEvent,
  updatePlayerPresence,
} from '../services/firebase';
import { useAdmin } from '../context/AdminContext';
import { bengaliAudio } from '../utils/audioPlayer';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

const APP_INSTALL_SHARE_URL =
  'https://play.google.com/store/apps/details?id=com.hashikhushitv.app';

interface ShortVideosSectionProps {
  isOpen: boolean;
  onToggleOpen: (open: boolean) => void;
}

// Format seconds to mm:ss
function formatVideoTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Determine best playback mode for a ShortVideoItem
function getPlaybackSource(video: ShortVideoItem): {
  mode: 'mp4' | 'iframe' | 'external';
  src: string;
  iframeFallback?: string;
} {
  const targetUrl = (video.resolvedUrl || video.url || '').trim();

  // 1. YouTube Shorts / Watch / youtu.be -> Play via clean masked YouTube embed with JS API enabled for seeking
  const ytMatch = targetUrl.match(
    /(?:youtube\.com\/(?:shorts\/|watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/i
  );
  if (ytMatch && ytMatch[1]) {
    const vid = ytMatch[1];
    return {
      mode: 'iframe',
      src: `https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&loop=1&playlist=${vid}&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&fs=0&enablejsapi=1`,
    };
  }

  const fbIframe =
    video.canonicalEmbedUrl ||
    (/facebook\.com|fb\.watch/i.test(targetUrl)
      ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
          targetUrl
        )}&show_text=false&autoplay=true`
      : undefined);

  // 2. If server auto-fetched a direct MP4 stream (e.g. Facebook video), play natively via <video>
  if (video.directMp4Url && /^https?:\/\//i.test(video.directMp4Url)) {
    const isLocalOrDirect = /\.(mp4|webm|ogg)$/i.test(video.directMp4Url.split('?')[0]);
    return {
      mode: 'mp4',
      src: isLocalOrDirect
        ? video.directMp4Url
        : `/api/video-proxy?url=${encodeURIComponent(video.directMp4Url)}`,
      iframeFallback: fbIframe,
    };
  }

  // 3. Direct MP4 URL
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(targetUrl)) {
    return {
      mode: 'mp4',
      src: targetUrl,
    };
  }

  // 4. Canonical Embed URL from auto-fetch
  if (video.canonicalEmbedUrl) {
    return {
      mode: 'iframe',
      src: video.canonicalEmbedUrl.includes('youtube') && !video.canonicalEmbedUrl.includes('enablejsapi=1')
        ? `${video.canonicalEmbedUrl}&enablejsapi=1`
        : video.canonicalEmbedUrl,
    };
  }

  // 5. Facebook fallback
  if (fbIframe) {
    return {
      mode: 'iframe',
      src: fbIframe,
    };
  }

  // 6. Instagram fallback
  const igMatch = targetUrl.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/i);
  if (igMatch && igMatch[1]) {
    return {
      mode: 'iframe',
      src: `https://www.instagram.com/reel/${igMatch[1]}/embed`,
    };
  }

  return {
    mode: 'external',
    src: targetUrl,
  };
}

export const ShortVideosSection: React.FC<ShortVideosSectionProps> = ({
  isOpen,
  onToggleOpen,
}) => {
  const { isAdmin } = useAdmin();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [videos, setVideos] = useState<ShortVideoItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [videoFallbackError, setVideoFallbackError] = useState(false);

  // Seek & Time state (works for both <video> and YouTube <iframe>)
  const playerFrameRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Automatically enter Full Screen when user rotates their mobile phone sideways (Landscape)
  useEffect(() => {
    if (!isOpen) {
      setIsFullscreen(false);
      return;
    }

    const checkOrientation = () => {
      const isMobileLandscape =
        window.innerWidth > window.innerHeight && window.innerHeight <= 640;
      const hasNativeFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isMobileLandscape || hasNativeFs);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    document.addEventListener('fullscreenchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      document.removeEventListener('fullscreenchange', checkOrientation);
    };
  }, [isOpen]);

  const handleToggleFullscreen = async () => {
    const next = !isFullscreen;
    setIsFullscreen(next);
    try {
      if (next && playerFrameRef.current?.requestFullscreen) {
        await playerFrameRef.current.requestFullscreen();
        const scr = window.screen as unknown as {
          orientation?: { lock?: (mode: string) => Promise<void> };
        };
        if (scr?.orientation?.lock) {
          await scr.orientation.lock('landscape').catch(() => {});
        }
      } else if (!next && document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
    } catch {}
  };

  // Admin Link Paste & Auto-Fetch state
  const [linkInput, setLinkInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [fetchedPreview, setFetchedPreview] = useState<{
    resolvedUrl: string;
    canonicalEmbedUrl: string;
    directMp4Url: string;
    thumbnail: string;
    platform: 'youtube' | 'facebook' | 'instagram' | 'direct' | 'external';
  } | null>(null);
  const [isAutoFetching, setIsAutoFetching] = useState(false);
  const [adminStatus, setAdminStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const autoFixedIdsRef = useRef<Set<string>>(new Set());

  // Subscribe to real-time Short Videos list from Firestore
  useEffect(() => {
    const unsub = subscribeToShortVideosList((liveVideos) => {
      setVideos(liveVideos);
    });
    return () => unsub();
  }, []);

  // Listen to YouTube IFrame API postMessage events for live currentTime & duration
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      try {
        const data = JSON.parse(event.data);
        if (data?.event === 'infoDelivery' && data?.info) {
          if (typeof data.info.currentTime === 'number') {
            setCurrentTime(data.info.currentTime);
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            setDuration(data.info.duration);
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen]);

  // Reset seek state & auto-fetch missing metadata when video changes
  useEffect(() => {
    if (!isOpen || videos.length === 0) return;
    const current = videos[currentIndex];
    if (!current) return;

    setVideoFallbackError(false);
    setCurrentTime(0);
    setDuration(0);

    const needsAutoFetch =
      !current.directMp4Url &&
      !current.canonicalEmbedUrl &&
      !autoFixedIdsRef.current.has(current.id);

    if (needsAutoFetch) {
      autoFixedIdsRef.current.add(current.id);
      autoFetchVideoDetails(current.url).then(async (meta) => {
        if (
          meta.success &&
          (meta.directMp4Url || meta.canonicalEmbedUrl || meta.resolvedUrl !== current.url)
        ) {
          const updated = videos.map((v) =>
            v.id === current.id
              ? {
                  ...v,
                  resolvedUrl: meta.resolvedUrl || v.url,
                  canonicalEmbedUrl: meta.canonicalEmbedUrl || v.canonicalEmbedUrl,
                  directMp4Url: meta.directMp4Url || v.directMp4Url,
                  thumbnail: meta.thumbnail || v.thumbnail,
                  platform: meta.platform || v.platform,
                  title:
                    v.title.startsWith('শিক্ষামূলক শর্ট ভিডিও') && meta.title
                      ? meta.title
                      : v.title,
                }
              : v
          );
          setVideos(updated);
          await saveShortVideosList(updated);
        }
      });
    }
  }, [isOpen, videos, currentIndex]);

  // Ensure currentIndex stays in range
  useEffect(() => {
    if (videos.length > 0 && currentIndex >= videos.length) {
      setCurrentIndex(0);
    }
  }, [videos.length, currentIndex]);

  // Seek to a specific second in either <video> or YouTube <iframe>
  const handleSeekTo = (targetSeconds: number) => {
    const maxDur = duration > 0 ? duration : 300;
    const clamped = Math.max(0, Math.min(targetSeconds, maxDur));
    setCurrentTime(clamped);

    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }

    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [clamped, true],
        }),
        '*'
      );
    }
  };

  // Skip backward or forward by delta seconds (e.g., -10s or +10s)
  const handleSkipSeconds = (delta: number) => {
    handleSeekTo(currentTime + delta);
  };

  const handleOpenToggle = () => {
    bengaliAudio.stop();
    const next = !isOpen;
    onToggleOpen(next);
    if (next) {
      trackAnalyticsEvent('rhyme_play', 'শর্ট ভিডিও দেখছে');
      updatePlayerPresence('shorts', 'শর্ট ভিডিও দেখছে');
    }
  };

  const handleNextVideo = () => {
    if (videos.length <= 1) return;
    setVideoFallbackError(false);
    setCurrentIndex((prev) => (prev + 1) % videos.length);
  };

  const handlePrevVideo = () => {
    if (videos.length <= 1) return;
    setVideoFallbackError(false);
    setCurrentIndex((prev) => (prev === 0 ? videos.length - 1 : prev - 1));
  };

  const handleToggleLike = (id: string) => {
    setLikedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleShareVideo = async (video: ShortVideoItem) => {
    bengaliAudio.playClickSound();
    trackAnalyticsEvent('share_click', 'short_video_share_app_install');

    // 1. Copy our App Install link (NEVER the raw YouTube/Facebook link)
    try {
      await navigator.clipboard.writeText(APP_INSTALL_SHARE_URL);
      setCopiedId(video.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {}

    // 2. If our app is not yet installed on this mobile phone, trigger native App Installation immediately!
    if (!isInstalled) {
      if (isInstallable) {
        const installedNow = await install();
        if (installedNow) return;
      }
      setIsInstallModalOpen(true);
      return;
    }

    // 3. If already installed, open native mobile Share sheet with our App Install Link so friends install the app too
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'সোনামণির পাঠশালা - গুগল প্লে স্টোর ডাউনলোড',
          text: 'ছোটদের বাংলা বর্ণমালা, ছড়া ও মজার ভিডিও দেখতে গুগল প্লে স্টোর থেকে সোনামণির পাঠশালা অ্যাপটি ডাউনলোড করুন:',
          url: APP_INSTALL_SHARE_URL,
        });
      } catch {}
    } else {
      setIsInstallModalOpen(true);
    }
  };

  // Trigger Auto-Fetch on a given URL string
  const triggerAutoFetch = async (rawUrl: string, autoSaveAfterFetch = false) => {
    const clean = rawUrl.trim();
    if (!/^https?:\/\//i.test(clean)) {
      setAdminStatus('⚠️ সঠিক ভিডিও লিংক (https://...) দিন!');
      setTimeout(() => setAdminStatus(null), 3000);
      return;
    }

    setIsAutoFetching(true);
    setAdminStatus('⚡ লিংক থেকে ভিডিও ও শিরোনাম অটো-ফেচ করা হচ্ছে...');

    const meta = await autoFetchVideoDetails(clean);
    setIsAutoFetching(false);

    if (meta.title && !titleInput.trim()) {
      setTitleInput(meta.title);
    }

    setFetchedPreview({
      resolvedUrl: meta.resolvedUrl || clean,
      canonicalEmbedUrl: meta.canonicalEmbedUrl || '',
      directMp4Url: meta.directMp4Url || '',
      thumbnail: meta.thumbnail || '',
      platform: meta.platform || 'external',
    });

    if (autoSaveAfterFetch && isAdmin) {
      setIsSaving(true);
      const newItem: ShortVideoItem = {
        id: `short_${Date.now()}`,
        url: clean,
        resolvedUrl: meta.resolvedUrl || clean,
        canonicalEmbedUrl: meta.canonicalEmbedUrl || '',
        directMp4Url: meta.directMp4Url || '',
        thumbnail: meta.thumbnail || '',
        platform: meta.platform || 'external',
        title:
          titleInput.trim() ||
          meta.title ||
          `শিক্ষামূলক শর্ট ভিডিও #${videos.length + 1}`,
        addedAt: new Date().toISOString(),
      };
      const updatedList = [newItem, ...videos];
      await saveShortVideosList(updatedList);
      setLinkInput('');
      setTitleInput('');
      setFetchedPreview(null);
      setCurrentIndex(0);
      setIsSaving(false);
      setAdminStatus('✅ অটো-ফেচ সম্পন্ন এবং শর্ট ভিডিও সরাসরি চালু হয়েছে!');
      setTimeout(() => setAdminStatus(null), 3500);
    } else {
      setAdminStatus(
        meta.directMp4Url
          ? '✅ অটো-ফেচ সফল! সরাসরি HD ভিডিও স্ট্রিম পাওয়া গেছে।'
          : '✅ অটো-ফেচ সম্পন্ন! এখন "যুক্ত করুন" বাটনে চাপুন।'
      );
      setTimeout(() => setAdminStatus(null), 4000);
    }
  };

  // One-tap Clipboard Paste + Auto-Fetch + Auto-Publish
  const handleOneTapClipboardAutoFetch = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && /^https?:\/\//i.test(text.trim())) {
        const clean = text.trim();
        setLinkInput(clean);
        await triggerAutoFetch(clean, true);
      } else {
        setAdminStatus('ক্লিপবোর্ডে কোনো লিংক পাওয়া যায়নি! আগে লিংক কপি করুন অথবা বক্সে পেস্ট করুন।');
        setTimeout(() => setAdminStatus(null), 3500);
      }
    } catch {
      if (linkInput.trim()) {
        await triggerAutoFetch(linkInput.trim(), true);
      } else {
        setAdminStatus('বক্সে চেপে ধরে লিংক Paste করুন, অটো-ফেচ হয়ে যাবে!');
        setTimeout(() => setAdminStatus(null), 3500);
      }
    }
  };

  const handleAdminAddLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const rawLines = linkInput
      .split(/[\n,\s]+/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//i.test(s));

    if (rawLines.length === 0) {
      setAdminStatus('অনুগ্রহ করে সঠিক ভিডিও লিংক (https://...) কপি-পেস্ট করুন!');
      setTimeout(() => setAdminStatus(null), 3000);
      return;
    }

    setIsSaving(true);
    setAdminStatus('⚡ ভিডিও অটো-ফেচ করে যুক্ত করা হচ্ছে...');
    const now = new Date().toISOString();
    const newItems: ShortVideoItem[] = [];

    for (let idx = 0; idx < rawLines.length; idx++) {
      const url = rawLines[idx];
      const meta =
        idx === 0 && fetchedPreview
          ? { ...fetchedPreview, title: titleInput.trim() || 'শিক্ষামূলক শর্ট ভিডিও' }
          : await autoFetchVideoDetails(url);

      newItems.push({
        id: `short_${Date.now()}_${idx}`,
        url,
        resolvedUrl: meta.resolvedUrl || url,
        canonicalEmbedUrl: meta.canonicalEmbedUrl || '',
        directMp4Url: meta.directMp4Url || '',
        thumbnail: meta.thumbnail || '',
        platform: meta.platform || 'external',
        title:
          titleInput.trim() ||
          meta.title ||
          `শিক্ষামূলক শর্ট ভিডিও #${videos.length + idx + 1}`,
        addedAt: now,
      });
    }

    const updatedList = [...newItems, ...videos];
    await saveShortVideosList(updatedList);
    setLinkInput('');
    setTitleInput('');
    setFetchedPreview(null);
    setCurrentIndex(0);
    setIsSaving(false);
    setAdminStatus('✅ শর্ট ভিডিও অটো-ফেচ হয়ে যুক্ত হয়েছে! সবাই এখন দেখতে পাবে।');
    setTimeout(() => setAdminStatus(null), 3500);
  };

  const handleRefetchCurrentVideo = async () => {
    const current = videos[currentIndex];
    if (!current) return;
    setIsAutoFetching(true);
    setVideoFallbackError(false);
    const meta = await autoFetchVideoDetails(current.url);
    setIsAutoFetching(false);

    const updated = videos.map((v) =>
      v.id === current.id
        ? {
            ...v,
            resolvedUrl: meta.resolvedUrl || v.url,
            canonicalEmbedUrl: meta.canonicalEmbedUrl || v.canonicalEmbedUrl,
            directMp4Url: meta.directMp4Url || v.directMp4Url,
            thumbnail: meta.thumbnail || v.thumbnail,
            platform: meta.platform || v.platform,
            title: meta.title || v.title,
          }
        : v
    );
    setVideos(updated);
    await saveShortVideosList(updated);
  };

  const handleAdminDeleteVideo = async (id: string) => {
    if (!isAdmin) return;
    const updatedList = videos.filter((v) => v.id !== id);
    await saveShortVideosList(updatedList);
    setAdminStatus('🗑️ ভিডিওটি তালিকা থেকে মুছে ফেলা হয়েছে।');
    setTimeout(() => setAdminStatus(null), 2500);
  };

  const currentVideo = videos[currentIndex] || null;
  const playback = currentVideo ? getPlaybackSource(currentVideo) : null;

  return (
    <div className="mb-4">
      {/* Large Prominent Button at the Top for Everyone */}
      <button
        type="button"
        onClick={handleOpenToggle}
        className={`w-full py-3.5 px-4 sm:px-6 rounded-2xl font-bold text-sm sm:text-lg flex items-center justify-between gap-3 transition-all shadow-md active:scale-[0.99] cursor-pointer border-2 ${
          isOpen
            ? 'bg-gradient-to-r from-rose-600 via-red-600 to-orange-600 text-white border-rose-300 ring-4 ring-rose-200/70'
            : 'bg-gradient-to-r from-rose-500 via-pink-600 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white border-white/80'
        }`}
      >
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/40 shrink-0">
            <Film className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-pulse" />
          </div>
          <div className="text-left">
            <div className="flex items-center flex-wrap gap-2">
              <span className="font-child font-black text-base sm:text-xl tracking-wide">
                🎬 শর্ট ভিডিও দেখুন (Short Videos)
              </span>
              <span className="bg-amber-300 text-slate-950 text-[11px] sm:text-xs font-extrabold px-2 py-0.5 rounded-full shadow-2xs">
                {videos.length}টি ভিডিও
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-rose-100 font-medium">
              ছোটদের মজার ও শিক্ষামূলক শর্টস রিলস আকারে একটানা দেখুন
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-white text-rose-700 font-extrabold text-xs sm:text-sm flex items-center gap-1 shadow-xs">
            {isOpen ? (
              <>
                <X className="w-4 h-4 stroke-[2.5]" />
                <span>বন্ধ করুন</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-rose-600 text-rose-600" />
                <span>প্লে করুন</span>
              </>
            )}
          </span>
        </div>
      </button>

      {/* Expandable Short Video Reels Player + Admin Auto-Fetch Panel */}
      {isOpen && (
        <div className="mt-3 bg-slate-950 text-white rounded-3xl p-3 sm:p-5 border-2 border-rose-500/40 shadow-2xl animate-in fade-in duration-200">
          {/* Top Bar inside Short Video Viewer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="font-child font-black text-base sm:text-lg text-white">
                শর্ট ভিডিও প্লেয়ার (Shorts / Reels)
              </h3>
              {videos.length > 0 && (
                <span className="text-xs bg-rose-600/30 border border-rose-500/40 text-rose-200 px-2.5 py-0.5 rounded-full font-bold">
                  {currentIndex + 1} / {videos.length}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && currentVideo && (
                <button
                  type="button"
                  onClick={handleRefetchCurrentVideo}
                  disabled={isAutoFetching}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="ভিডিওটি অটো-ফেচ রিলোড করুন"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAutoFetching ? 'animate-spin' : ''}`} />
                  <span>{isAutoFetching ? 'অটো ফেচ হচ্ছে...' : '⚡ অটো ফেচ রিলোড'}</span>
                </button>
              )}

              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-xl font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  গ্রুপ এডমিন সক্রিয়
                </span>
              )}

              <button
                type="button"
                onClick={() => onToggleOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>বন্ধ করুন</span>
              </button>
            </div>
          </div>

          {/* ADMIN-ONLY AUTO-FETCH & LINK COPY-PASTE BOX */}
          {isAdmin && (
            <form
              onSubmit={handleAdminAddLinks}
              className="mb-5 bg-gradient-to-r from-indigo-950/90 via-slate-900 to-purple-950/90 p-3.5 sm:p-4 rounded-2xl border border-indigo-400/40 shadow-lg space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-xs sm:text-sm font-extrabold text-amber-300">
                    গ্রুপ এডমিন: শর্ট ভিডিও লিংক অটো-ফেচ (Auto-Fetch) ও পেস্ট
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOneTapClipboardAutoFetch}
                    disabled={isAutoFetching || isSaving}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5 fill-slate-950" />
                    <span>⚡ ওয়ান-ট্যাপ পেস্ট ও অটো-ফেচ</span>
                  </button>

                  {linkInput.trim() && (
                    <button
                      type="button"
                      onClick={() => triggerAutoFetch(linkInput, false)}
                      disabled={isAutoFetching}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-600/50 hover:bg-indigo-600/70 border border-indigo-400/50 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isAutoFetching ? 'animate-spin' : ''}`} />
                      <span>অটো ফেচ</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <input
                  type="text"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (pasted && /^https?:\/\//i.test(pasted.trim())) {
                      setTimeout(() => triggerAutoFetch(pasted.trim(), false), 80);
                    }
                  }}
                  placeholder="এখানে লিংক পেস্ট করলেই অটো-ফেচ হবে (Facebook Reel / YouTube Shorts)..."
                  className="sm:col-span-6 px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                />
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="অটো-ফেচ হওয়া শিরোনাম (ঐচ্ছিক)"
                  className="sm:col-span-3 px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={isSaving || isAutoFetching}
                  className="sm:col-span-3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>{isSaving ? 'সেভ হচ্ছে...' : 'যুক্ত করুন'}</span>
                </button>
              </div>

              {adminStatus && (
                <p className="text-xs font-bold text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-400/30">
                  {adminStatus}
                </p>
              )}
            </form>
          )}

          {/* Vertical 9:16 Reels / Landscape Fullscreen Short Video Player Area */}
          {currentVideo && playback ? (
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-6">
              {/* Phone-Style Video Frame — Automatically expands to Full Screen when mobile is rotated sideways */}
              <div
                ref={playerFrameRef}
                className={
                  isFullscreen
                    ? 'fixed inset-0 z-[100] w-screen h-screen bg-black flex flex-col justify-between overflow-hidden'
                    : 'relative w-full max-w-[340px] sm:max-w-[360px] aspect-[9/16] bg-black rounded-3xl overflow-hidden border-2 border-slate-700 shadow-2xl flex flex-col justify-between'
                }
              >
                {playback.mode === 'mp4' && !videoFallbackError ? (
                  <video
                    ref={videoRef}
                    key={`${currentVideo.id}_mp4`}
                    src={playback.src}
                    poster={currentVideo.thumbnail || undefined}
                    controls
                    autoPlay
                    loop
                    playsInline
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                    onEnded={handleNextVideo}
                    onError={() => setVideoFallbackError(true)}
                    className="w-full h-[calc(100%-64px)] object-contain bg-black"
                  />
                ) : playback.mode === 'iframe' || playback.iframeFallback ? (
                  <div className="relative w-full h-full overflow-hidden bg-black">
                    {/* Top Solid Black Shield: hides YouTube channel logo, channel name, title & top icons */}
                    <div
                      className={`absolute top-0 inset-x-0 bg-black z-10 pointer-events-auto select-none ${
                        isFullscreen ? 'h-[58px]' : 'h-[126px]'
                      }`}
                    />

                    <iframe
                      ref={iframeRef}
                      key={`${currentVideo.id}_iframe`}
                      src={playback.iframeFallback || playback.src}
                      title={currentVideo.title}
                      onLoad={() => {
                        // Subscribe to YouTube IFrame API time updates
                        iframeRef.current?.contentWindow?.postMessage(
                          JSON.stringify({ event: 'listening', id: 1 }),
                          '*'
                        );
                      }}
                      className={
                        isFullscreen
                          ? 'w-full h-[calc(100%+110px)] -mt-[55px] border-0'
                          : 'w-full h-full border-0'
                      }
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    />

                    {/* Bottom Solid Black Shield: hides bottom YouTube logo while hosting our custom seek bar */}
                    <div className="absolute bottom-0 inset-x-0 h-[56px] bg-black z-10 pointer-events-auto select-none" />
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-900 to-slate-950">
                    {currentVideo.thumbnail ? (
                      <img
                        src={currentVideo.thumbnail}
                        alt={currentVideo.title}
                        className="w-36 h-48 object-cover rounded-2xl border-2 border-rose-500/50 mb-4 shadow-lg"
                      />
                    ) : (
                      <Film className="w-14 h-14 text-rose-500 mb-3" />
                    )}
                    <p className="font-child font-bold text-base text-white mb-3">
                      {currentVideo.title}
                    </p>
                    <button
                      type="button"
                      onClick={handleRefetchCurrentVideo}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 shadow-lg cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 ${isAutoFetching ? 'animate-spin' : ''}`} />
                      <span>ভিডিওটি পুনরায় লোড করুন</span>
                    </button>
                  </div>
                )}

                {/* Interactive Bottom Seek Bar + -10s / +10s Controls (Covers bottom YouTube logo & lets user drag video time) */}
                <div className="absolute bottom-0 inset-x-0 z-20 bg-black/95 border-t border-slate-800/80 px-3 py-2 flex flex-col gap-1.5">
                  {/* Draggable Seek Slider */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-300 w-8 text-right shrink-0">
                      {formatVideoTime(currentTime)}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={duration > 0 ? Math.ceil(duration) : 180}
                      step={1}
                      value={Math.min(currentTime, duration > 0 ? Math.ceil(duration) : 180)}
                      onChange={(e) => handleSeekTo(Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                      title="ভিডিও টেনে দেখুন"
                    />
                    <span className="text-[10px] font-mono text-slate-400 w-8 shrink-0">
                      {duration > 0 ? formatVideoTime(duration) : '--:--'}
                    </span>
                  </div>

                  {/* Quick -10s / Title / +10s Row */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleSkipSeconds(-10)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 border border-slate-700"
                      title="১০ সেকেন্ড পেছনে টানুন"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>-১০ সেঃ</span>
                    </button>

                    <p className="font-child font-bold text-xs text-white/90 truncate text-center flex-1">
                      {currentVideo.title}
                    </p>

                    <button
                      type="button"
                      onClick={() => handleSkipSeconds(10)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 border border-slate-700"
                      title="১০ সেকেন্ড সামনে টানুন"
                    >
                      <span>+১০ সেঃ</span>
                      <RotateCw className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleFullscreen}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 border border-rose-400"
                      title={isFullscreen ? 'ছোট স্ক্রিন করুন' : 'ফুল স্ক্রিন করুন'}
                    >
                      {isFullscreen ? (
                        <>
                          <Minimize2 className="w-3 h-3" />
                          <span>ছোট</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3 h-3" />
                          <span>ফুল স্ক্রিন</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right-Side Reels Controls (Prev / Next / Like / Share / Admin Delete) */}
              <div className="flex flex-wrap md:flex-col items-center justify-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={handlePrevVideo}
                  disabled={videos.length <= 1}
                  className="p-3 sm:p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white border border-slate-700 flex flex-col items-center gap-1 cursor-pointer active:scale-95 transition-all"
                  title="আগের শর্ট ভিডিও"
                >
                  <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-[10px] font-bold">আগেরটি</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextVideo}
                  disabled={videos.length <= 1}
                  className="p-3 sm:p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white border border-rose-400 flex flex-col items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-lg"
                  title="পরের শর্ট ভিডিও"
                >
                  <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-[10px] font-bold">পরেরটি</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleLike(currentVideo.id)}
                  className={`p-3 sm:p-3.5 rounded-2xl border flex flex-col items-center gap-1 cursor-pointer active:scale-95 transition-all ${
                    likedIds[currentVideo.id]
                      ? 'bg-pink-600 text-white border-pink-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  <Heart
                    className={`w-5 h-5 ${
                      likedIds[currentVideo.id] ? 'fill-white' : ''
                    }`}
                  />
                  <span className="text-[10px] font-bold">ভালোবাসা</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShareVideo(currentVideo)}
                  className="p-3 sm:p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex flex-col items-center gap-1 cursor-pointer active:scale-95 transition-all"
                >
                  {copiedId === currentVideo.id ? (
                    <Check className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Share2 className="w-5 h-5" />
                  )}
                  <span className="text-[10px] font-bold">
                    {copiedId === currentVideo.id ? 'কপি হয়েছে' : 'শেয়ার'}
                  </span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleAdminDeleteVideo(currentVideo.id)}
                    className="p-3 sm:p-3.5 rounded-2xl bg-red-950/90 hover:bg-red-800 text-red-200 border border-red-700/60 flex flex-col items-center gap-1 cursor-pointer active:scale-95 transition-all"
                    title="এই শর্ট ভিডিওটি ডিলিট করুন"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="text-[10px] font-bold">ডিলিট</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 px-4 bg-slate-900/90 rounded-2xl border border-slate-800">
              <Film className="w-12 h-12 text-rose-400 mx-auto mb-2 opacity-80" />
              <p className="font-child font-bold text-base sm:text-lg text-white">
                এখনো কোনো শর্ট ভিডিও যুক্ত করা হয়নি!
              </p>
              <p className="text-xs text-slate-400 mt-1">
                নতুন শর্ট ভিডিও যুক্ত হলেই এখানে দেখা যাবে।
              </p>
            </div>
          )}

          {/* Playlist Strip of All Short Videos */}
          {videos.length > 0 && (
            <div className="mt-5 pt-3 border-t border-slate-800">
              <p className="text-xs font-bold text-slate-400 mb-2">
                সব শর্ট ভিডিও ({videos.length}টি) — যেকোনোটিতে ট্যাপ করে দেখুন:
              </p>
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
                {videos.map((v, idx) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setVideoFallbackError(false);
                      setCurrentIndex(idx);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 border transition-all cursor-pointer ${
                      idx === currentIndex
                        ? 'bg-rose-600 text-white border-rose-400 shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 shrink-0" />
                    <span className="max-w-[160px] truncate">{v.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* App Install Modal triggered when clicking Share below the video */}
      <PWAInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onNativeInstall={async () => {
          if (isInstallable) {
            const res = await install();
            setIsInstallModalOpen(false);
            return res;
          }
          return false;
        }}
        isNativeInstallable={isInstallable}
        isIOS={isIOS}
      />
    </div>
  );
};
