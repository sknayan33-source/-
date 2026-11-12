import React, { useState, useEffect } from 'react';
import { Volume2, Sparkles, Eye, X, Camera, RotateCcw, ShieldCheck, Lock } from 'lucide-react';
import { AlphabetItem } from '../types/alphabet';
import { IllustrationIcon } from './IllustrationIcon';
import { useAdmin } from '../context/AdminContext';

interface BoardViewProps {
  items: AlphabetItem[];
  activeSpeakingId: string | null;
  onSelectItem?: (item: AlphabetItem) => void;
  onSelectLetter?: (item: AlphabetItem) => void;
  onTraceItem?: (item: AlphabetItem) => void;
  onSpeakItem: (item: AlphabetItem, part: 'letter' | 'word' | 'rhyme' | 'full') => void;
}

export const BoardView: React.FC<BoardViewProps> = ({
  items,
  activeSpeakingId,
  onSelectItem,
  onSelectLetter,
  onTraceItem,
  onSpeakItem,
}) => {
  const { isAdmin, adminPin, setIsModalOpen } = useAdmin();
  const [playingItemPart, setPlayingItemPart] = useState<{ id: string; part: string } | null>(null);
  const [zoomedItem, setZoomedItem] = useState<AlphabetItem | null>(null);
  const [customOverrides, setCustomOverrides] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('bangla_custom_images');
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      // Clean up any stale or broken overrides for c-10 so default official image loads
      if (parsed && typeof parsed === 'object') {
        if (parsed['c-10']) {
          delete parsed['c-10'];
          localStorage.setItem('bangla_custom_images', JSON.stringify(parsed));
        }
        return parsed;
      }
      return {};
    } catch {
      return {};
    }
  });

  // Fetch shared server custom images on mount so ANY visitor gets the uploaded picture
  useEffect(() => {
    fetch('/api/custom-images')
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          setCustomOverrides((prev) => ({ ...data, ...prev }));
        }
      })
      .catch(() => {});
  }, []);

  const handleCustomUpload = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      setIsModalOpen(true);
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        // Immediate local preview
        setCustomOverrides((prev) => {
          const updated = { ...prev, [itemId]: base64 };
          localStorage.setItem('bangla_custom_images', JSON.stringify(updated));
          return updated;
        });

        // Sync permanently to server with admin pin
        try {
          const res = await fetch('/api/custom-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-pin': adminPin || '',
            },
            body: JSON.stringify({ id: itemId, imageBase64: base64, adminPin }),
          });
          const result = await res.json();
          if (result.url) {
            setCustomOverrides((prev) => {
              const updated = { ...prev, [itemId]: result.url };
              localStorage.setItem('bangla_custom_images', JSON.stringify(updated));
              return updated;
            });
          }
        } catch (err) {
          console.error('Failed to sync custom image to server:', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetImage = async (itemId: string) => {
    if (!isAdmin) {
      setIsModalOpen(true);
      return;
    }

    setCustomOverrides((prev) => {
      const updated = { ...prev };
      delete updated[itemId];
      localStorage.setItem('bangla_custom_images', JSON.stringify(updated));
      return updated;
    });

    try {
      await fetch('/api/admin/reset-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin || '',
        },
        body: JSON.stringify({ id: itemId, adminPin }),
      });
    } catch {}
  };

  const handleSpeak = (item: AlphabetItem, part: 'letter' | 'word' | 'rhyme' | 'full') => {
    setPlayingItemPart({ id: item.id, part });
    onSpeakItem(item, part);
    setTimeout(() => {
      setPlayingItemPart((prev) => (prev?.id === item.id ? null : prev));
    }, 1800);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-16 bg-white/70 rounded-3xl border border-dashed border-amber-300 p-8">
        <p className="text-lg font-bold text-slate-700 font-child">কোনো বর্ণ খুঁজে পাওয়া যায়নি</p>
        <p className="text-xs text-slate-500 mt-1">অনুসন্ধান বা ফিল্টার পরিবর্তন করে দেখুন।</p>
      </div>
    );
  }

  const zoomedDisplayImage = zoomedItem
    ? zoomedItem.id === 'c-10'
      ? zoomedItem.customImage
      : customOverrides[zoomedItem.id] || zoomedItem.customImage
    : undefined;

  return (
    <>
      {/* Zoomed Image Modal for Kids to see huge pictures */}
      {zoomedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-lg w-full bg-slate-900 border-4 border-amber-400 rounded-3xl p-6 text-white text-center shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setZoomedItem(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <span className="text-7xl font-black font-child text-amber-300 mb-2">
              {zoomedItem.letter}
            </span>

            <div className="w-64 h-64 sm:w-80 sm:h-80 my-3 rounded-2xl overflow-hidden bg-black/40 border-2 border-white/20 flex items-center justify-center p-2 shadow-inner">
              <IllustrationIcon
                type={zoomedItem.sampleSvg}
                customImage={zoomedDisplayImage}
                altText={zoomedItem.word}
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </div>

            {/* Custom Photo Upload for this specific letter (Admin Only) */}
            {isAdmin && (
              <div className="flex items-center gap-2 mb-3">
                <label className="cursor-pointer text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all">
                  <Camera className="w-3.5 h-3.5" />
                  <span>নিজের আসল ছবি দিন</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleCustomUpload(zoomedItem.id, e)}
                  />
                </label>

                {customOverrides[zoomedItem.id] && (
                  <button
                    onClick={() => handleResetImage(zoomedItem.id)}
                    className="text-xs font-bold text-rose-300 hover:text-rose-200 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-400/30 transition-all"
                    title="পূর্বাবস্থায় ফেরান"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>রিসেট</span>
                  </button>
                )}
              </div>
            )}

            <div className="text-3xl font-black font-child text-yellow-300 mb-1">
              {zoomedItem.word}
            </div>
            <div className="text-lg font-bold font-child text-white/90 mb-4">
              {zoomedItem.rhyme}
            </div>

            <button
              onClick={() => handleSpeak(zoomedItem, 'full')}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 font-black text-base flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-transform"
            >
              <Volume2 className="w-5 h-5" />
              <span>উচ্চারণ ও ছড়া শুনুন</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Alphabet Grid with Huge Letters and Large Pictures */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-7 pb-20">
        {items.map((item) => {
          const isSpeaking = activeSpeakingId === item.id;
          const isLetterActive = playingItemPart?.id === item.id && playingItemPart.part === 'letter';
          const isWordActive = playingItemPart?.id === item.id && playingItemPart.part === 'word';
          const isRhymeActive = playingItemPart?.id === item.id && playingItemPart.part === 'rhyme';
          const currentImage = item.id === 'c-10' ? item.customImage : (customOverrides[item.id] || item.customImage);

          return (
            <div
              key={item.id}
              className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${item.colorScheme.bgGradient} text-white p-5 sm:p-6 shadow-xl border-3 ${
                isSpeaking
                  ? 'border-amber-300 ring-4 ring-amber-300/50 scale-[1.01]'
                  : 'border-white/20 hover:border-white/40'
              } transition-all duration-200 flex flex-col justify-between`}
            >
              {/* Top Section: EXACT 50/50 SPLIT - GIGANTIC Letter (50%) & BIG Picture (50%) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 items-stretch">
                {/* 50% Half: GIGANTIC Clickable Letter */}
                <button
                  onPointerDown={() => handleSpeak(item, 'letter')}
                  className={`relative flex flex-col items-center justify-center p-3 sm:p-5 rounded-3xl transition-transform active:scale-95 text-center focus:outline-hidden bg-black/20 hover:bg-black/30 border-2 border-white/25 shadow-inner min-h-[170px] sm:min-h-[200px] md:min-h-[220px] ${
                    isLetterActive ? 'bg-white/25 ring-4 ring-amber-300' : ''
                  }`}
                  title="বর্ণটির উচ্চারণ শুনতে ট্যাপ করুন"
                >
                  <span
                    className={`text-8xl sm:text-9xl md:text-[8.5rem] lg:text-[9.5rem] font-black font-child tracking-normal drop-shadow-2xl select-none leading-none ${
                      item.colorScheme.textLetter
                    } ${isLetterActive ? 'animate-bounce' : ''}`}
                  >
                    {item.letter}
                  </span>

                  <span className="text-xs sm:text-sm font-bold text-white/95 mt-2 flex items-center gap-1 bg-black/35 px-2.5 py-0.5 rounded-full border border-white/15 shadow-xs">
                    <Volume2 className="w-3.5 h-3.5 text-amber-300" />
                    <span>{item.name || item.letter}</span>
                  </span>

                  {item.category !== 'english' && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 shadow-md border border-white/40">
                      অ-ঁ
                    </span>
                  )}

                  {item.category === 'english' && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500 text-white shadow-md border border-white/40">
                      A-Z
                    </span>
                  )}
                </button>

                {/* 50% Half: BIG Picture - Equal Space */}
                <div className="relative flex flex-col items-center justify-center">
                  <div
                    role="button"
                    tabIndex={0}
                    onPointerDown={() => handleSpeak(item, 'word')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSpeak(item, 'word');
                      }
                    }}
                    className="relative w-full h-full min-h-[170px] sm:min-h-[200px] md:min-h-[220px] group-hover:scale-[1.02] transition-all duration-300 focus:outline-hidden p-2 rounded-3xl bg-black/25 hover:bg-black/35 border-2 border-white/30 shadow-2xl flex items-center justify-center overflow-hidden cursor-pointer"
                    title={`${item.word} শুনুন`}
                  >
                    <IllustrationIcon
                      type={item.sampleSvg}
                      customImage={currentImage}
                      altText={item.word}
                      className="w-full h-full max-h-[200px] md:max-h-[220px] object-cover drop-shadow-2xl rounded-2xl"
                    />

                    {/* Zoom button on corner */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomedItem(item);
                      }}
                      className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-amber-300 border border-white/30 shadow-md backdrop-blur-xs transition-transform active:scale-90"
                      title="ছবি বড় করে দেখুন"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Direct Camera Upload button on corner - ADMIN ONLY */}
                    {isAdmin && (
                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-2 left-2 p-1.5 rounded-full bg-emerald-600/90 hover:bg-emerald-700 text-white border border-white/40 shadow-md backdrop-blur-xs transition-transform active:scale-90 cursor-pointer flex items-center justify-center"
                        title="এডমিন: ছবি পরিবর্তন করুন"
                      >
                        <Camera className="w-4 h-4" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleCustomUpload(item.id, e)}
                        />
                      </label>
                    )}
                  </div>

                  {/* Special prompt for c-10 / Mian - ADMIN ONLY */}
                  {isAdmin && item.id === 'c-10' && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer bg-white/15 hover:bg-white/25 px-2.5 py-0.5 rounded-full border border-amber-300/40 shadow-xs active:scale-95 transition-all"
                      >
                        <Camera className="w-3 h-3 text-amber-300" />
                        <span>{customOverrides[item.id] ? 'ছবি পরিবর্তন' : 'আপনার অরজিনাল ছবি দিন'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleCustomUpload(item.id, e)}
                        />
                      </label>
                      {customOverrides[item.id] && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResetImage(item.id);
                          }}
                          className="text-[10px] text-rose-300 hover:text-rose-100 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-500/20"
                          title="রিসেট"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>রিসেট</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Middle Section: Word & Rhyme */}
              <div className="mt-4 space-y-2">
                {/* Clickable Word */}
                <div className="flex items-center justify-between">
                  <button
                    onPointerDown={() => handleSpeak(item, 'word')}
                    className={`text-2xl sm:text-3xl font-black font-child tracking-wide text-white/95 flex items-center gap-2 px-3 py-1 rounded-xl transition-colors hover:bg-white/15 text-left ${
                      isWordActive ? 'bg-amber-400/30 text-amber-200 ring-2 ring-amber-300' : ''
                    }`}
                  >
                    <span>{item.word}</span>
                    <Volume2 className="w-5 h-5 text-amber-300 opacity-90" />
                  </button>

                  <span className="text-white/60 text-xs sm:text-sm font-semibold">
                    {item.phoneticEn}
                  </span>
                </div>

                {/* Clickable Rhyme Sentence */}
                <button
                  onPointerDown={() => handleSpeak(item, 'rhyme')}
                  className={`w-full text-left p-3 rounded-2xl text-base sm:text-lg md:text-xl font-bold leading-relaxed transition-all flex items-center justify-between gap-3 ${
                    isRhymeActive
                      ? 'bg-amber-400 text-amber-950 font-black shadow-lg ring-2 ring-white'
                      : 'bg-black/30 hover:bg-black/45 text-white/95 border border-white/15'
                  }`}
                  title="ছড়াটি শুনতে ট্যাপ করুন"
                >
                  <span className="font-child">{item.rhyme}</span>
                  <Volume2 className={`w-5 h-5 shrink-0 ${isRhymeActive ? 'text-amber-950' : 'text-amber-300'}`} />
                </button>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs sm:text-sm">
                <button
                  onPointerDown={() => handleSpeak(item, 'full')}
                  className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold flex items-center gap-2 transition-colors active:scale-95 shadow-xs"
                  title="বর্ণ ও ছড়া একসাথে শুনুন"
                >
                  <Volume2 className="w-4 h-4 text-amber-300" />
                  <span>সম্পূর্ণ শোনো</span>
                </button>

                <button
                  onClick={() => (onSelectItem || onSelectLetter)?.(item)}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 text-amber-950 font-bold hover:bg-amber-300 transition-colors flex items-center gap-1.5 shadow-xs active:scale-95"
                  title="বড় কার্ড ও হাতের লেখা ট্রেসিং"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>কার্ড ও ট্রেসিং</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
