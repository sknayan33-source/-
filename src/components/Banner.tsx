import React, { useState, useEffect } from 'react';
import { Volume2, Sparkles, Share2, Camera, Check, Download, Mic, Smartphone } from 'lucide-react';
import { bengaliAudio } from '../utils/audioPlayer';
import { useAdmin } from '../context/AdminContext';
import { saveBannerWatermark, subscribeToBannerWatermark } from '../services/firebase';
import defaultWatermarkImg from '../assets/images/banner_watermark_girl_1791167915079.jpg';
import sonamonirLogo from '../assets/images/sonamonir_logo_1791965713467.jpg';

interface BannerProps {
  onPlayIntro: () => void;
  onFilterPaToChand: () => void;
  isPaToChandActive: boolean;
  onFilterEnglish?: () => void;
  isEnglishActive?: boolean;
  onShare?: () => void;
}

export const BANNER_WATERMARK_KEY = 'bangla_banner_watermark_v1';

// Helper to resize & compress uploaded photo so it syncs fast to Firestore & server
export const compressWatermarkImage = (
  file: File,
  maxDim = 800,
  quality = 0.84
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(ev.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const Banner: React.FC<BannerProps> = ({
  onPlayIntro,
  onFilterPaToChand,
  isPaToChandActive,
  onFilterEnglish,
  isEnglishActive,
  onShare,
}) => {
  const { isAdmin, adminPin, setIsModalOpen } = useAdmin();
  const [watermarkUrl, setWatermarkUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(BANNER_WATERMARK_KEY) || defaultWatermarkImg;
    } catch {
      return defaultWatermarkImg;
    }
  });
  const [uploadSaved, setUploadSaved] = useState(false);
  const [isDownloadingAAB, setIsDownloadingAAB] = useState(false);
  const [aabDownloaded, setAabDownloaded] = useState(false);
  const [isDownloadingAPK, setIsDownloadingAPK] = useState(false);
  const [apkDownloaded, setApkDownloaded] = useState(false);

  const handleDirectAPKDownload = async () => {
    try {
      setIsDownloadingAPK(true);
      bengaliAudio.playClickSound();
      const res = await fetch('/download-fresh-apk?t=' + Date.now());
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
      setTimeout(() => setApkDownloaded(false), 8000);
    } catch {
      window.location.href = '/download-fresh-apk';
    } finally {
      setIsDownloadingAPK(false);
    }
  };

  const handleDirectAABDownload = async () => {
    try {
      setIsDownloadingAAB(true);
      bengaliAudio.playClickSound();
      const res = await fetch('/download-fresh-aab?t=' + Date.now());
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
      setTimeout(() => setAabDownloaded(false), 8000);
    } catch {
      window.location.href = '/download-fresh-aab';
    } finally {
      setIsDownloadingAAB(false);
    }
  };

  useEffect(() => {
    // 1. Subscribe to Firestore real-time watermark setting
    const unsubscribe = subscribeToBannerWatermark((cloudImg) => {
      if (cloudImg) {
        setWatermarkUrl(cloudImg);
        try {
          localStorage.setItem(BANNER_WATERMARK_KEY, cloudImg);
        } catch {}
      }
    });

    // 2. Listen for local custom event when updated from AdminModal
    const handleLocalUpdate = (e: Event) => {
      const customEv = e as CustomEvent<string>;
      if (customEv.detail) {
        setWatermarkUrl(customEv.detail);
      }
    };
    window.addEventListener('banner-watermark-updated', handleLocalUpdate);

    // 3. Also check server custom-images fallback
    fetch('/api/custom-images')
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: any) => {
        if (data && data.banner_watermark) {
          setWatermarkUrl(data.banner_watermark);
        }
      })
      .catch(() => {});

    return () => {
      unsubscribe();
      window.removeEventListener('banner-watermark-updated', handleLocalUpdate);
    };
  }, []);

  const handleWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressWatermarkImage(file);
      setWatermarkUrl(compressedDataUrl);
      try {
        localStorage.setItem(BANNER_WATERMARK_KEY, compressedDataUrl);
      } catch {}
      window.dispatchEvent(
        new CustomEvent('banner-watermark-updated', { detail: compressedDataUrl })
      );

      // Save to Firebase Firestore so all phones see the exact photo
      await saveBannerWatermark(compressedDataUrl);

      // Also save to Express server custom-image
      if (adminPin) {
        fetch('/api/custom-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': adminPin,
          },
          body: JSON.stringify({
            id: 'banner_watermark',
            imageBase64: compressedDataUrl,
            adminPin,
          }),
        }).catch(() => {});
      }

      setUploadSaved(true);
      setTimeout(() => setUploadSaved(false), 3000);
    } catch (err) {
      console.error('Watermark upload failed:', err);
    }
  };

  const activeImg = watermarkUrl || defaultWatermarkImg;

  return (
    <div className="relative w-full max-w-full overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white shadow-lg mb-4 border-2 border-emerald-300/50 min-h-[210px] sm:min-h-[230px]">
      {/* Layer 1: Full-Banner Soft Watermark Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <img
          src={activeImg}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-25 blur-[1px] scale-105"
        />
      </div>

      {/* Layer 2: Prominent Clear Watermark Portrait on the Right Side */}
      <div className="absolute right-0 top-0 bottom-0 w-[58%] sm:w-[48%] max-w-[360px] pointer-events-none overflow-hidden select-none">
        <img
          src={activeImg}
          alt="Banner Watermark"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-[center_18%] opacity-75 sm:opacity-85"
        />
        {/* Smooth gradient fade only on the left edge so the girl's portrait is super clear on the right */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-800 via-emerald-800/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/50 via-transparent to-transparent" />
      </div>

      {/* Subtle Storybook Dots */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:16px_16px]" />

      <div className="relative p-4 sm:p-6 z-10 flex flex-col justify-between gap-4">
        <div className="max-w-[68%] sm:max-w-lg">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 pl-1 pr-3 py-0.5 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 text-amber-950 shadow-sm border border-white/60">
              <img
                src={sonamonirLogo}
                alt="সোনামণির পাঠশালা"
                referrerPolicy="no-referrer"
                className="w-5 h-5 rounded-full object-cover border border-amber-700/30"
              />
              <span>সোনামণির পাঠশালা (Sonamonir Pathshala)</span>
              <Sparkles className="w-3.5 h-3.5 fill-amber-950" />
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight font-child drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            বর্ণমালা দিয়ে শব্দ গঠন ও ছড়া
          </h1>
          <p className="text-emerald-50 text-xs sm:text-sm mt-1 max-w-md font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
            প্রতিটি বর্ণের উপর ট্যাপ করে সঠিক অডিও শুনুন: বাংলা স্বরবর্ণ, ব্যঞ্জনবর্ণ ও ইংরেজি A to Z।
          </p>
        </div>

        {/* Action triggers */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-1">
          {/* Special Quick-Focus for 'অ থেকে চন্দ্রবিন্দু ঁ' requested by user */}
          <button
            onClick={() => {
              bengaliAudio.playClickSound();
              onFilterPaToChand();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-lg cursor-pointer active:scale-95 ${
              isPaToChandActive
                ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 text-white ring-2 ring-amber-300 scale-105 shadow-rose-500/40'
                : 'bg-gradient-to-r from-rose-500 via-pink-500 to-orange-500 hover:from-rose-600 hover:via-pink-600 hover:to-orange-600 text-white border border-amber-200/80 shadow-rose-900/30'
            }`}
          >
            <span className="bg-amber-300 text-rose-950 text-[10px] px-1.5 py-0.5 rounded-md font-black">
              অ-ঁ
            </span>
            <span>অ থেকে ঁ (চন্দ্রবিন্দু চাঁদ)</span>
            <span className="w-2 h-2 rounded-full bg-amber-200 animate-pulse" />
          </button>

          {/* Quick-Focus for English A to Z requested by user */}
          {onFilterEnglish && (
            <button
              onClick={() => {
                bengaliAudio.playClickSound();
                onFilterEnglish();
              }}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                isEnglishActive
                  ? 'bg-purple-600 text-white ring-2 ring-amber-300 scale-105'
                  : 'bg-purple-700/90 hover:bg-purple-600 text-white backdrop-blur-xs border border-purple-300/60'
              }`}
            >
              <span className="bg-amber-300 text-purple-950 text-[10px] px-1.5 py-0.5 rounded-md font-black">
                A-Z
              </span>
              <span>ইংরেজি A to Z</span>
            </button>
          )}

          {/* Voice introduction */}
          <div className="flex items-center gap-1">
            <button
              onClick={onPlayIntro}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-400 hover:bg-amber-300 text-amber-950 flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              title="বর্ণমালার গান ও পরিচিতি শুনুন"
            >
              <Volume2 className="w-4 h-4" />
              <span>শোনো স্বর</span>
            </button>
            <button
              type="button"
              onClick={() => {
                bengaliAudio.playClickSound();
                setIsModalOpen(true);
              }}
              className="p-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 flex items-center gap-1 transition-all shadow-md active:scale-95 cursor-pointer"
              title="শোনো স্বর সহ সব অডিওতে নিজের কণ্ঠ রেকর্ড করুন"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          {/* Share App with Friends */}
          {onShare && (
            <button
              onClick={() => {
                bengaliAudio.playClickSound();
                onShare();
              }}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white text-emerald-950 hover:bg-emerald-50 flex items-center gap-1.5 transition-all shadow-md active:scale-95 border border-white cursor-pointer"
              title="বন্ধুদের সাথে অ্যাপটি শেয়ার করুন"
            >
              <Share2 className="w-4 h-4 text-emerald-700" />
              <span>শেয়ার করুন</span>
            </button>
          )}

          {/* Fresh APK & AAB Direct 1-Tap Download Hub (Right on Preview Screen) */}
          <div className="w-full mt-3 p-3 sm:p-3.5 rounded-2xl bg-slate-950/85 backdrop-blur-md border-2 border-amber-400/90 shadow-2xl text-left space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-amber-500/30 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-xs sm:text-sm font-black text-amber-300">
                  📦 প্রিভিউ স্কিন ডাউনলোড সেন্টার — ফ্রেশ APK ও প্লে স্টোর AAB
                </span>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                ৬টি ভয়েস ক্যাটাগরি ফিক্সড
              </span>
            </div>

            <p className="text-[11px] sm:text-xs text-amber-100/90 leading-relaxed">
              প্রিভিউ স্কিনের <strong>৬টি ক্যাটাগরির ভয়েস স্টুডিও</strong> ও <strong>ফিক্সড গুগল প্লে স্টোর লিংক</strong> সহ ফ্রেশ রিলিজ ফাইল দুটি নিচের বাটনে ট্যাপ করে সরাসরি আপনার ফোনে ডাউনলোড করুন:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* APK Download Button */}
              <button
                type="button"
                onClick={handleDirectAPKDownload}
                disabled={isDownloadingAPK}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer border border-emerald-200/60 disabled:opacity-75"
              >
                <Smartphone className="w-4 h-4 stroke-[2.5] shrink-0" />
                <div className="text-left">
                  <div className="font-black leading-tight">
                    {isDownloadingAPK
                      ? '⏳ ফোনে নামছে (5.51 MB)...'
                      : apkDownloaded
                      ? '✅ APK ফোনে সেভ হয়েছে!'
                      : '📲 নতুন ফ্রেশ APK ডাউনলোড (5.51 MB)'}
                  </div>
                  <div className="text-[9px] font-medium text-slate-900 opacity-90">
                    ফোনে ইনস্টল করার ফাইল • ৬টি ক্যাটাগরি সহ
                  </div>
                </div>
              </button>

              {/* AAB Download Button */}
              <button
                type="button"
                onClick={handleDirectAABDownload}
                disabled={isDownloadingAAB}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 active:scale-95 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer border border-amber-200/60 disabled:opacity-75"
              >
                <Download className="w-4 h-4 stroke-[2.5] shrink-0" />
                <div className="text-left">
                  <div className="font-black leading-tight">
                    {isDownloadingAAB
                      ? '⏳ ফোনে নামছে (5.32 MB)...'
                      : aabDownloaded
                      ? '✅ AAB ফোনে সেভ হয়েছে!'
                      : '📦 প্লে স্টোর AAB ডাউনলোড (5.32 MB)'}
                  </div>
                  <div className="text-[9px] font-medium text-slate-900 opacity-90">
                    গুগল প্লে কনসোলে রিলিজের জন্য
                  </div>
                </div>
              </button>
            </div>

            {/* Critical Step: Click Publish in AI Studio & Uninstall old app */}
            <div className="bg-amber-950/80 border-2 border-amber-400/80 rounded-xl p-2.5 text-xs text-amber-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-black text-amber-300">
                <span className="text-sm">⚠️</span>
                <span>ফোনে নতুন ৬টি ক্যাটাগরি দেখতে হলে এই ২টি কাজ করুন:</span>
              </div>
              <div className="text-[11px] leading-relaxed text-slate-200 space-y-1 pl-0.5">
                <p>
                  👉 <strong>১. উপরে ডানপাশের &quot;Publish&quot; (পাবলিশ) বাটনে ক্লিক করুন:</strong> আপনার ব্রাউজারের একদম উপরে ডানপাশে (Top-Right) থাকা <strong>Publish</strong> বাটনে ১ বার চাপ দিন, যাতে গুগল ক্লাউড সার্ভার এই নতুন কোডটি লাইভ করে।
                </p>
                <p>
                  👉 <strong>২. ফোন থেকে পুরনো অ্যাপটি আনইনস্টল করুন:</strong> ভিডিওতে দেখা গেছে পুরনো অ্যাপের ওপর নতুন ফাইল ইনস্টল করায় ফোনের পুরনো ক্যাশ রয়ে গিয়েছিল। তাই আগে ফোন থেকে অ্যাপটি <strong>আনইনস্টল (Uninstall)</strong> করুন, তারপর এই ফ্রেশ APK ইনস্টল করলেই ৬টি ক্যাটাগরি পেয়ে যাবেন!
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between text-[10px] text-amber-200/80 pt-0.5 gap-1">
              <span>📁 ফাইল এক্সপ্লোরার ফোল্ডার: <strong className="text-white">00_NEW_FRESH_APK_AND_AAB_FILES</strong></span>
              <span className="text-emerald-300 font-bold">✓ ১০০% অরিজিনাল ও ভেরিফাইড ফাইল</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Bottom Train track and playful grass border */}
      <div className="h-2.5 bg-gradient-to-r from-amber-400 via-lime-400 to-emerald-400 border-t border-emerald-400/50" />
    </div>
  );
};
