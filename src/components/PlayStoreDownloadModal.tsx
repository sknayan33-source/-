import React, { useState } from 'react';
import { X, Download, Check, Sparkles, ShieldCheck, Image as ImageIcon, Copy, Smartphone } from 'lucide-react';
import { bengaliAudio } from '../utils/audioPlayer';
import sonamonirLogo from '../assets/images/sonamonir_logo_1791965713467.jpg';

interface PlayStoreDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayStoreDownloadModal: React.FC<PlayStoreDownloadModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [activeDownloading, setActiveDownloading] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBlobDownload = async (urlPath: string, fileName: string) => {
    try {
      bengaliAudio.playClickSound();
      setActiveDownloading(fileName);
      setDownloadStatus(`⏳ "${fileName}" ফাইলটি তৈরি ও ডাউনলোড হচ্ছে...`);

      const res = await fetch(`${urlPath}?t=${Date.now()}`);
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

      setDownloadStatus(`✅ "${fileName}" সফলভাবে আপনার ফোনের Download ফোল্ডারে সেভ হয়েছে!`);
      setTimeout(() => {
        setDownloadStatus(null);
        setActiveDownloading(null);
      }, 5000);
    } catch {
      window.location.href = urlPath;
      setDownloadStatus(`✅ ফাইলটি ডাউনলোড হচ্ছে...`);
      setTimeout(() => {
        setDownloadStatus(null);
        setActiveDownloading(null);
      }, 4000);
    }
  };

  const handleCopyText = (text: string, key: string) => {
    bengaliAudio.playClickSound();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-slate-900 border-2 border-emerald-500/70 rounded-3xl shadow-2xl p-4 sm:p-6 text-slate-100 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            bengaliAudio.playClickSound();
            onClose();
          }}
          className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors z-10"
          aria-label="বন্ধ করুন"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pr-10">
          <div className="w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-tr from-amber-400 via-emerald-400 to-teal-500 shrink-0 shadow-md">
            <img
              src={sonamonirLogo}
              alt="Logo"
              className="w-full h-full rounded-[14px] object-cover bg-white"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base sm:text-lg font-black text-emerald-300">
                গুগল প্লে কনসোল আপলোড কিট
              </h3>
              <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            <p className="text-xs text-slate-400">
              ফোনে ১-ক্লিকে আসল AAB ফাইল, লোগো ও ব্যানার ডাউনলোড করুন
            </p>
          </div>
        </div>

        {/* Download Status Toast */}
        {downloadStatus && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border-2 border-emerald-400/50 text-emerald-200 text-xs sm:text-sm font-bold flex items-center gap-2 animate-bounce-short">
            <Check className="w-5 h-5 text-emerald-400 shrink-0 stroke-[3]" />
            <span>{downloadStatus}</span>
          </div>
        )}

        {/* Notice on why this in-app download is best */}
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3 text-xs text-emerald-200 leading-relaxed">
          <p className="font-bold text-emerald-300 flex items-center gap-1 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>সরাসরি অ্যাপের ভেতর থেকে সেভ (১০০% কাজ করবে):</span>
          </p>
          <p className="text-slate-300 text-[11px]">
            বাইরে কোনো লিংকে চেপে ধরতে হবে না। নিচের বাটনে ট্যাপ করলেই ফাইলটি সরাসরি আপনার ফোনের{' '}
            <strong className="text-amber-300">Download</strong> ফোল্ডারে সেভ হয়ে যাবে।
          </p>
        </div>

        {/* Section 1: Play Store .AAB & Fresh .APK Files */}
        <div className="space-y-2.5">
          <h4 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
            <Download className="w-4 h-4 text-amber-400" />
            <span>১. আজকের লেটেস্ট ফ্রেশ APK ও রিলিজ AAB ফাইল (৬টি ক্যাটাগরি ফিক্সড)</span>
          </h4>

          {/* Fresh Duo: Fixed APK & Release AAB */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-emerald-950/60 border-2 border-emerald-400/80 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Sonamonir-Pathshala-Latest-Fixed.apk</span>
                </span>
                <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-1.5 py-0.5 rounded">
                  5.51 MB
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                ফোনে সরাসরি ইনস্টলের জন্য • ৬টি ক্যাটাগরি ও ফিক্সড প্লে স্টোর লিংক সহ
              </p>
              <button
                type="button"
                onClick={() =>
                  handleBlobDownload(
                    '/download-fresh-apk',
                    'Sonamonir-Pathshala-Latest-Fixed.apk'
                  )
                }
                disabled={activeDownloading === 'Sonamonir-Pathshala-Latest-Fixed.apk'}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-transform disabled:opacity-50"
              >
                <Smartphone className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>
                  {activeDownloading === 'Sonamonir-Pathshala-Latest-Fixed.apk'
                    ? 'ডাউনলোড হচ্ছে...'
                    : '📲 ফ্রেশ APK ডাউনলোড করুন'}
                </span>
              </button>
            </div>

            <div className="bg-amber-950/60 border-2 border-amber-400/80 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Sonamonir-Pathshala-Latest-Release.aab</span>
                </span>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded">
                  5.32 MB
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                গুগল প্লে কনসোলে প্রোডাকশন রিলিজ আপলোডের জন্য অফিসিয়াল AAB
              </p>
              <button
                type="button"
                onClick={() =>
                  handleBlobDownload(
                    '/download-fresh-aab',
                    'Sonamonir-Pathshala-Latest-Release.aab'
                  )
                }
                disabled={activeDownloading === 'Sonamonir-Pathshala-Latest-Release.aab'}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-transform disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>
                  {activeDownloading === 'Sonamonir-Pathshala-Latest-Release.aab'
                    ? 'ডাউনলোড হচ্ছে...'
                    : '📦 রিলিজ AAB ডাউনলোড করুন'}
                </span>
              </button>
            </div>
          </div>

          {/* Option A: Primary Signed AAB Version 1 */}
          <div className="bg-slate-800/90 border-2 border-emerald-500/60 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>release.aab (ভার্সন ১ - মূল ফাইল)</span>
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  প্যাকেজ: <code className="text-sky-300 font-mono">com.hashikhushitv.app</code> • minSdkVersion 24 ফিক্সড
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleBlobDownload(
                    '/download-release-aab',
                    'release.aab'
                  )
                }
                disabled={activeDownloading === 'release.aab'}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-transform shrink-0 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 stroke-[3]" />
                <span>
                  {activeDownloading === 'release.aab'
                    ? 'ডাউনলোড হচ্ছে...'
                    : '⬇️ release.aab ডাউনলোড'}
                </span>
              </button>
            </div>
            <p className="text-[10px] text-emerald-300/90 bg-emerald-950/60 px-2.5 py-1 rounded-lg">
              👉 এটি একদম ফ্রেশ <strong>Google Bundletool দ্বারা ভেরিফাইড</strong> ফাইল। প্লে কনসোলে এটি আপলোড করুন।
            </p>
          </div>

          {/* Option B: Version 2 AAB (If Console ever asks for higher version code) */}
          <div className="bg-slate-800/90 border border-sky-500/50 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="text-xs font-black text-white">
                  release-v2.aab (ভার্সন ২ - বিকল্প ফাইল)
                </span>
                <p className="text-[11px] text-slate-400">
                  Version Code 2 • যদি কনসোলে Version 1 অলরেডি ড্রাফটে থাকে
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleBlobDownload(
                    '/download-release-v2-aab',
                    'release-v2.aab'
                  )
                }
                disabled={activeDownloading === 'release-v2.aab'}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-transform shrink-0 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 stroke-[3]" />
                <span>
                  {activeDownloading === 'release-v2.aab'
                    ? 'ডাউনলোড হচ্ছে...'
                    : 'ভার্সন ২ ডাউনলোড'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Play Store Graphics (Logo, Banner, Screenshots) */}
        <div className="space-y-2.5 pt-1">
          <h4 className="text-xs sm:text-sm font-black text-sky-300 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-sky-400" />
            <span>২. প্লে স্টোর ছবি ও স্ক্রিনশট (Play Console Ready Size)</span>
          </h4>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() =>
                handleBlobDownload(
                  '/play-store-assets/sonamonir-pathshala-icon-512x512.png',
                  'sonamonir-pathshala-icon-512x512.png'
                )
              }
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex flex-col items-center text-center gap-1 cursor-pointer"
            >
              <span className="font-bold text-slate-200">🖼️ লোগো (৫১২x৫১২)</span>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <Download className="w-3 h-3" /> ডাউনলোড
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleBlobDownload(
                  '/play-store-assets/sonamonir-pathshala-feature-1024x500.png',
                  'sonamonir-pathshala-feature-1024x500.png'
                )
              }
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex flex-col items-center text-center gap-1 cursor-pointer"
            >
              <span className="font-bold text-slate-200">🎨 ফিচার ব্যানার (১০২৪x৫০০)</span>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <Download className="w-3 h-3" /> ডাউনলোড
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              handleBlobDownload(
                '/download-graphics',
                'Sonamonir-Pathshala-Graphics-Kit.zip'
              )
            }
            className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-400/40 text-amber-300 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>📦 সব ছবি ও ৪টি স্ক্রিনশট একসাথে জিপ (.ZIP) ডাউনলোড</span>
          </button>
        </div>

        {/* Section 3: Play Console Required Information Table */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-2 text-xs">
          <h5 className="font-black text-slate-200 flex items-center gap-1.5">
            <span>📋 গুগল প্লে কনসোলে যা যা লাগবে (সরাসরি কপি করুন):</span>
          </h5>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">অ্যাপের নাম (App Name):</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white">সোনামণির পাঠশালা</span>
                <button
                  type="button"
                  onClick={() => handleCopyText('সোনামণির পাঠশালা', 'app_name')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] flex items-center gap-1"
                >
                  {copiedKey === 'app_name' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'app_name' ? 'কপি হয়েছে' : 'কপি'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">প্যাকেজ নাম (Package Name):</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-amber-300">com.hashikhushitv.app</span>
                <button
                  type="button"
                  onClick={() => handleCopyText('com.hashikhushitv.app', 'pkg_name')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] flex items-center gap-1"
                >
                  {copiedKey === 'pkg_name' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'pkg_name' ? 'কপি হয়েছে' : 'কপি'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">প্রাইভেসি পলিসি (Privacy Policy):</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-300 truncate max-w-[150px]">
                  https://.../privacy-policy.html
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(
                      'https://ais-pre-yvmuw5tiqosykxup7pcy33-499412979403.asia-southeast1.run.app/privacy-policy.html',
                      'policy_url'
                    )
                  }
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] flex items-center gap-1"
                >
                  {copiedKey === 'policy_url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'policy_url' ? 'কপি হয়েছে' : 'কপি'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">প্লে স্টোর লিংক (Play Store URL):</span>
              <div className="flex items-center gap-1.5">
                <a
                  href="https://play.google.com/store/apps/details?id=com.hashikhushitv.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 underline text-[10px]"
                >
                  ওপেন করুন
                </a>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(
                      'https://play.google.com/store/apps/details?id=com.hashikhushitv.app',
                      'play_url'
                    )
                  }
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] flex items-center gap-1"
                >
                  {copiedKey === 'play_url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'play_url' ? 'কপি হয়েছে' : 'কপি'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Done Button */}
        <button
          type="button"
          onClick={() => {
            bengaliAudio.playClickSound();
            onClose();
          }}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
        >
          ঠিক আছে, বন্ধ করুন
        </button>
      </div>
    </div>
  );
};
