import React, { useState } from 'react';
import { X, Copy, Check, Share2, QrCode, AlertTriangle } from 'lucide-react';
import { bengaliAudio } from '../utils/audioPlayer';
import sonamonirLogo from '../assets/images/sonamonir_logo_1791965713467.jpg';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Official Google Play Store download URL for Sonamonir Pathshala (com.hashikhushitv.app)
export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.hashikhushitv.app';

const PUBLIC_SHARE_URL = PLAY_STORE_URL;

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
function toBengaliNumber(n: number): string {
  return String(n)
    .split('')
    .map((ch) => (ch >= '0' && ch <= '9' ? BENGALI_DIGITS[Number(ch)] : ch))
    .join('');
}

function generateParentalQuestion() {
  const a = Math.floor(Math.random() * 4) + 2; // 2..5
  const b = Math.floor(Math.random() * 4) + 2; // 2..5
  const answer = a + b;
  const options = [answer, answer - 1, answer + 2].sort(() => Math.random() - 0.5);
  return { a, b, answer, options };
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [pendingAction, setPendingAction] = useState<'whatsapp' | 'native' | null>(null);
  const [mathQuestion, setMathQuestion] = useState(generateParentalQuestion);
  const [parentalError, setParentalError] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);

  if (!isOpen) return null;

  const currentUrl = PUBLIC_SHARE_URL;

  const handleCopy = async () => {
    bengaliAudio.playClickSound();
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const openParentalGate = (action: 'whatsapp' | 'native') => {
    bengaliAudio.playClickSound();
    setParentalError(false);
    setMathQuestion(generateParentalQuestion());
    setPendingAction(action);
  };

  const confirmParentalGate = async (selectedAns: number) => {
    bengaliAudio.playClickSound();
    if (selectedAns === mathQuestion.answer) {
      const actionToRun = pendingAction;
      setPendingAction(null);
      setParentalError(false);

      if (actionToRun === 'whatsapp') {
        const text = encodeURIComponent(
          `📚 সোনামণির পাঠশালা (Sonamonir Pathshala) — ছোটদের বাংলা ও ইংরেজি বর্ণমালা, ছড়া, কবিতা, হাতেখড়ি ও কুইজ শেখার অ্যাপ গুগল প্লে স্টোর থেকে ডাউনলোড করুন:\n${currentUrl}`
        );
        window.location.href = `https://api.whatsapp.com/send?text=${text}`;
      } else if (actionToRun === 'native') {
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'সোনামণির পাঠশালা (Sonamonir Pathshala) - গুগল প্লে স্টোর ডাউনলোড',
              text: 'সোনামণির পাঠশালা — ছোটদের জন্য বাংলা ও ইংরেজি বর্ণমালা, ছড়া ও হাতেখড়ি শেখার অ্যাপ! গুগল প্লে স্টোর থেকে ডাউনলোড করুন:',
              url: currentUrl,
            });
          } catch {}
        } else {
          handleCopy();
        }
      }
    } else {
      setParentalError(true);
      setMathQuestion(generateParentalQuestion());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border-4 border-amber-400 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          aria-label="বন্ধ করুন"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center mb-4">
          <div className="w-16 h-16 rounded-2xl p-1 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 mx-auto mb-2 shadow-md">
            <img
              src={sonamonirLogo}
              alt="সোনামণির পাঠশালা"
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-xl object-cover bg-white"
            />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-child">
            সোনামণির পাঠশালা শেয়ার করুন
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            গুগল প্লে স্টোর (Google Play Store) থেকে ডাউনলোড করার লিংক শেয়ার করুন।
          </p>
        </div>

        {/* Google Play Store Direct Open Button */}
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 mb-3"
        >
          <span>📲 গুগল প্লে স্টোরে অ্যাপটি দেখুন (Open in Play Store)</span>
        </a>

        {/* Family Safe Notice Box */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 mb-4 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-bold">অভিভাবকদের জন্য নির্দেশনা (For Parents):</p>
            <p>
              নিচের গুগল প্লে স্টোরের অফিসিয়াল লিংক বা কিউআর কোডটি বন্ধুদের পাঠিয়ে দিলে তারা সরাসরি প্লে স্টোর থেকে অ্যাপটি ইনস্টল করতে পারবে।
            </p>
          </div>
        </div>

        {/* Share Link Box with Copy Button */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            গুগল প্লে স্টোর ডাউনলোড লিংক:
          </label>
          <div className="flex items-center gap-1.5 bg-slate-100 p-2 rounded-xl border border-slate-300">
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="bg-transparent text-xs text-slate-800 font-mono flex-1 outline-hidden select-all overflow-ellipsis"
            />
            <button
              onClick={handleCopy}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>কপি হয়েছে!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>লিংক কপি</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Share Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => openParentalGate('whatsapp')}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <span>💬 হোয়াটসঅ্যাপে পাঠান</span>
          </button>
          <button
            onClick={() => openParentalGate('native')}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>অন্যান্য মাধ্যমে পাঠান</span>
          </button>
        </div>

        {/* Google Play Families Policy Randomized Parental Gate for External Share */}
        {pendingAction && (
          <div className="mb-4 p-3.5 rounded-2xl bg-indigo-50 border-2 border-indigo-300 text-center animate-in fade-in duration-150">
            <p className="text-xs font-extrabold text-indigo-950 mb-1">
              🛡️ অভিভাবক যাচাইকরণ (Parental Gate)
            </p>
            <p className="text-[11px] text-indigo-800 mb-2.5">
              বাইরের অ্যাপে শেয়ার করার আগে সঠিক উত্তর দিন:{' '}
              <strong>
                {toBengaliNumber(mathQuestion.a)} + {toBengaliNumber(mathQuestion.b)} = কত?
              </strong>
            </p>
            <div className="flex items-center justify-center gap-2.5">
              {mathQuestion.options.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => confirmParentalGate(num)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-indigo-600 hover:text-white text-indigo-950 font-black text-sm border-2 border-indigo-300 shadow-xs transition-all cursor-pointer"
                >
                  {toBengaliNumber(num)}
                </button>
              ))}
            </div>
            {parentalError && (
              <p className="text-[11px] font-bold text-rose-600 mt-2">
                উত্তর সঠিক নয়, নতুন প্রশ্নটির উত্তর দিন!
              </p>
            )}
          </div>
        )}

        {/* QR Code Section */}
        {!qrFailed && (
          <div className="text-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
              <QrCode className="w-4 h-4 text-amber-600" />
              <span>অথবা বন্ধুর ফোন দিয়ে কিউআর কোড স্ক্যান করুন:</span>
            </div>
            <div className="inline-block p-2 bg-white rounded-xl shadow-sm border border-slate-200">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  currentUrl
                )}`}
                alt="QR Code"
                onError={() => setQrFailed(true)}
                className="w-36 h-36 mx-auto rounded-lg"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              বন্ধুর ফোনের ক্যামেরা এই কিউআর কোডের দিকে ধরলেই সরাসরি গুগল প্লে স্টোরের পেজ খুলে যাবে!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
