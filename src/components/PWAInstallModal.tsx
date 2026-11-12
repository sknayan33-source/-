import React, { useState } from 'react';
import { X, Download, Share, PlusSquare, MoreVertical, Smartphone, CheckCircle, Sparkles } from 'lucide-react';
import { bengaliAudio } from '../utils/audioPlayer';
import sonamonirLogo from '../assets/images/sonamonir_logo_1791965713467.jpg';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNativeInstall?: () => Promise<boolean> | void;
  isNativeInstallable: boolean;
  isIOS: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  onNativeInstall,
  isNativeInstallable,
  isIOS,
}) => {
  const [highlightSteps, setHighlightSteps] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    bengaliAudio.playClickSound();
    if (onNativeInstall) {
      const res = await onNativeInstall();
      if (res === true) return;
    }

    // If opened inside Facebook / Messenger / WhatsApp in-app webview on Android, launch real Chrome directly
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isInAppWebView = /FBAN|FBAV|Instagram|WhatsApp|Line|wv/i.test(ua);
    const isAndroid = /Android/i.test(ua);

    if (isAndroid && isInAppWebView) {
      const cleanHostAndPath =
        'ais-pre-yvmuw5tiqosykxup7pcy33-499412979403.asia-southeast1.run.app/?__aistudio_auth_token=one_token_to_rule_them_all&install=1';
      window.location.href = `intent://${cleanHostAndPath}#Intent;scheme=https;package=com.android.chrome;end`;
      return;
    }

    // Highlight the 1-tap browser menu instruction if Chrome hasn't exposed beforeinstallprompt yet
    setHighlightSteps(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border-4 border-amber-300 relative text-slate-800">
        {/* Close Button */}
        <button
          onClick={() => {
            bengaliAudio.playClickSound();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
          aria-label="বন্ধ করুন"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center mx-auto shadow-lg mb-2.5 p-1">
            <img
              src={sonamonirLogo}
              alt="সোনামণির পাঠশালা লোগো"
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-xl object-cover shadow-xs bg-white"
            />
          </div>
          <h3 className="text-lg font-black text-slate-900 font-child flex items-center justify-center gap-1.5">
            <span>সোনামণির পাঠশালা ইনস্টল করুন</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            হোম স্ক্রিন থেকে সরাসরি সোনামণির পাঠশালা, বর্ণমালা, ছড়া ও মজার ভিডিও দেখুন!
          </p>
        </div>

        {/* Notice for updating existing icon */}
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-2.5 mb-3 text-xs text-amber-900 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-snug">
            💡 <strong>হোম স্ক্রিনে নতুন নাম আনতে:</strong> আপনার ফোনের আগের পুরনো আইকনটি ১ সেকেন্ড চেপে ধরে <strong>Uninstall / Remove</strong> করে দিন, তারপর নিচের <strong>Install App</strong> বাটনে চাপুন!
          </p>
        </div>

        {/* Primary 1-Tap Direct Install Button — Always visible at the top */}
        {!isIOS && (
          <div className="mb-3.5 space-y-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-500/35 flex items-center justify-center gap-2 transform active:scale-95 transition-all cursor-pointer border-2 border-emerald-200"
            >
              <Download className="w-5 h-5 animate-bounce" />
              <span>এখনই ফোনে ইনস্টল করুন (Install App)</span>
            </button>

            <a
              href="/download-apk"
              download="Sonamonir-Pathshala-Android.apk"
              onClick={() => bengaliAudio.playClickSound()}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transform active:scale-95 transition-all cursor-pointer border border-sky-300"
            >
              <Download className="w-4 h-4" />
              <span>📱 ফুলস্ক্রিন Android (.APK) ডাউনলোড</span>
            </a>
          </div>
        )}

        {isIOS ? (
          /* iOS Safari Guide */
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 space-y-2.5 text-xs text-slate-700">
            <p className="font-bold text-amber-900 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-amber-600" />
              <span>আইফোন / আইপ্যাডে ইনস্টল করার নিয়ম:</span>
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 bg-white p-2 rounded-xl border border-amber-100">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  1
                </span>
                <span>
                  সাফারি ব্রাউজারের নিচের{' '}
                  <strong className="text-blue-600 inline-flex items-center gap-0.5">
                    <Share className="w-3.5 h-3.5 inline" /> Share
                  </strong>{' '}
                  বাটনে ট্যাপ করুন।
                </span>
              </div>
              <div className="flex items-start gap-2 bg-white p-2 rounded-xl border border-amber-100">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  2
                </span>
                <span>
                  মেনু থেকে নিচে স্ক্রোল করে{' '}
                  <strong className="text-slate-900 inline-flex items-center gap-0.5">
                    <PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen
                  </strong>{' '}
                  চাপুন।
                </span>
              </div>
              <div className="flex items-start gap-2 bg-white p-2 rounded-xl border border-amber-100">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  3
                </span>
                <span>
                  ওপরের ডানদিকের <strong className="text-emerald-700">Add</strong> বাটনে ক্লিক করলেই অ্যাপটি হোমস্ক্রিনে চলে আসবে!
                </span>
              </div>
            </div>
          </div>
        ) : !isNativeInstallable ? (
          /* Android Chrome / Custom Tab Direct Menu Guide */
          <div
            className={`rounded-2xl p-3.5 space-y-2 text-xs transition-all ${
              highlightSteps
                ? 'bg-emerald-50 border-2 border-emerald-400 text-slate-800 ring-4 ring-emerald-200/70'
                : 'bg-slate-50 border border-slate-200 text-slate-700'
            }`}
          >
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>অথবা ওপরে ৩-ডট (⋮) থেকে ১ ক্লিকে ইনস্টল:</span>
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 bg-white p-2 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  1
                </span>
                <span>
                  ঠিক ওপরের ডানদিকের কোণায় ৩টি ডট{' '}
                  <strong className="inline-flex items-center text-slate-900 bg-amber-100 px-1.5 py-0.5 rounded">
                    <MoreVertical className="w-3.5 h-3.5 inline" /> ⋮ মেনু
                  </strong>
                  -তে ট্যাপ করুন।
                </span>
              </div>
              <div className="flex items-start gap-2 bg-white p-2 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  2
                </span>
                <span>
                  সেখান থেকে <strong className="text-emerald-700">"Install app"</strong> বা{' '}
                  <strong className="text-emerald-700">"Add to Home screen"</strong> চাপলেই ইনস্টল হয়ে যাবে!
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Benefits list */}
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>কোনো ডাউনলোড চার্জ নেই</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>অফলাইনেও চলবে</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>দ্রুত এবং হালকা</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>১০০% নিরাপদ ও বিজ্ঞাপনহীন</span>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => {
            bengaliAudio.playClickSound();
            onClose();
          }}
          className="mt-3.5 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          বন্ধ করুন
        </button>
      </div>
    </div>
  );
};
