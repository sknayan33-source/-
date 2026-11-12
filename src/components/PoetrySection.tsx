import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Play, Square, BookOpen, Mic, Music, ArrowLeft, Sparkles } from 'lucide-react';
import { POETRY_ITEMS, PoetryCategory, PoetryItem } from '../data/poetryData';
import { bengaliAudio } from '../utils/audioPlayer';
import { trackAnalyticsEvent, updatePlayerPresence } from '../services/firebase';
import { useAdmin } from '../context/AdminContext';

interface PoetrySectionProps {
  activeCategory: PoetryCategory | null;
  onSelectCategory: (cat: PoetryCategory | null) => void;
  soundEnabled: boolean;
}

export const PoetrySection: React.FC<PoetrySectionProps> = ({
  activeCategory,
  onSelectCategory,
  soundEnabled,
}) => {
  const { setIsModalOpen } = useAdmin();
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);
  const [playingLineIdx, setPlayingLineIdx] = useState<number | null>(null);
  const [isAutoPlayingAll, setIsAutoPlayingAll] = useState(false);
  const stopFlagRef = useRef(false);

  // Stop any ongoing recitation when switching categories or unmounting
  useEffect(() => {
    stopFlagRef.current = true;
    setPlayingItemId(null);
    setPlayingLineIdx(null);
    setIsAutoPlayingAll(false);
    return () => {
      stopFlagRef.current = true;
    };
  }, [activeCategory]);

  const stopPlayback = () => {
    stopFlagRef.current = true;
    bengaliAudio.stop();
    setPlayingItemId(null);
    setPlayingLineIdx(null);
    setIsAutoPlayingAll(false);
  };

  // Speak from a tapped line or full poem continuously in one smooth natural woman voice with zero delay
  const playFullItemSequentially = (
    item: PoetryItem,
    onFinished?: () => void,
    startLineIdx: number = -1
  ) => {
    if (!soundEnabled) return;

    stopFlagRef.current = false;
    setPlayingItemId(item.id);
    setPlayingLineIdx(startLineIdx);

    const catLabel =
      item.category === 'kobita'
        ? 'কবিতা'
        : item.category === 'abriti'
        ? 'আবৃত্তি'
        : 'ছড়া';

    trackAnalyticsEvent('rhyme_play', `${catLabel}: ${item.title}`);
    updatePlayerPresence(item.category, `${catLabel}: ${item.title} শুনছে`);

    const introText = `${item.title}। লিখেছেন ${item.author}।`;
    const fullFallbackText = `${introText} ${item.lines.join(' ')}`;

    // Calculate cumulative character ratios so line highlighting moves smoothly with the continuous voice
    const segments = [introText, ...item.lines];
    const segmentWeights = segments.map((s) => Math.max(s.length, 8));
    const totalWeight = segmentWeights.reduce((a, b) => a + b, 0);
    const thresholds: number[] = [];
    let acc = 0;
    for (const w of segmentWeights) {
      acc += w;
      thresholds.push(acc / totalWeight);
    }

    // If user tapped a specific line (startLineIdx >= 0), start right at the beginning of that line's segment
    const startRatio = startLineIdx >= 0 ? thresholds[startLineIdx] || 0 : 0;

    bengaliAudio.playPoemAudio(
      item.id,
      fullFallbackText,
      (ratio) => {
        if (stopFlagRef.current) return;
        let segIdx = thresholds.findIndex((t) => ratio <= t);
        if (segIdx === -1) segIdx = segments.length - 1;
        setPlayingLineIdx(segIdx - 1);
      },
      () => {
        if (stopFlagRef.current) return;
        setPlayingItemId(null);
        setPlayingLineIdx(null);
        if (onFinished) onFinished();
      },
      startRatio
    );
  };

  // Speak immediately when a line is tapped (starts from that line in the pre-generated MP3 with 0ms delay)
  const handleSpeakLine = (item: PoetryItem, _line: string, idx: number) => {
    if (!soundEnabled) return;
    setIsAutoPlayingAll(false);
    playFullItemSequentially(item, undefined, idx);
  };

  const handleTogglePlayItem = (item: PoetryItem) => {
    if (playingItemId === item.id) {
      stopPlayback();
    } else {
      setIsAutoPlayingAll(false);
      playFullItemSequentially(item);
    }
  };

  const filteredItems = activeCategory
    ? POETRY_ITEMS.filter((it) => it.category === activeCategory)
    : [];

  const handleToggleAutoPlayCategory = () => {
    if (isAutoPlayingAll) {
      stopPlayback();
      return;
    }

    if (!soundEnabled || filteredItems.length === 0) return;
    setIsAutoPlayingAll(true);
    stopFlagRef.current = false;

    const playItemIndex = (idx: number) => {
      if (stopFlagRef.current || idx >= filteredItems.length) {
        setIsAutoPlayingAll(false);
        setPlayingItemId(null);
        setPlayingLineIdx(null);
        return;
      }
      playFullItemSequentially(filteredItems[idx], () => {
        if (!stopFlagRef.current) {
          setTimeout(() => playItemIndex(idx + 1), 350);
        }
      });
    };

    playItemIndex(0);
  };

  const handleCategoryButtonClick = (cat: PoetryCategory) => {
    stopPlayback();
    if (activeCategory === cat) {
      onSelectCategory(null);
    } else {
      onSelectCategory(cat);
      // Preload all pre-generated poem MP3s for this category immediately
      const catItems = POETRY_ITEMS.filter((it) => it.category === cat);
      catItems.forEach((it) => {
        bengaliAudio.preloadPoemAudio(it.id);
      });
    }
  };

  return (
    <div className="mb-5">
      {/* Top 3 Prominent Buttons: কবিতা, আবৃত্তি, ছড়া */}
      <div className="bg-white/90 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border-2 border-amber-300/80 shadow-sm">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* ১. কবিতা বাটন */}
          <button
            type="button"
            onClick={() => handleCategoryButtonClick('kobita')}
            className={`py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl font-bold text-xs sm:text-base flex items-center justify-center gap-1.5 sm:gap-2 transition-all shadow-sm active:scale-95 cursor-pointer border ${
              activeCategory === 'kobita'
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white border-rose-400 ring-2 ring-rose-300 scale-[1.02]'
                : 'bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 text-rose-900 border-rose-200'
            }`}
          >
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="font-child font-black">কবিতা</span>
            <span
              className={`hidden sm:inline text-[11px] px-1.5 py-0.5 rounded-md font-bold ${
                activeCategory === 'kobita'
                  ? 'bg-white/25 text-white'
                  : 'bg-rose-200/70 text-rose-900'
              }`}
            >
              ৮টি
            </span>
          </button>

          {/* ২. আবৃত্তি বাটন */}
          <button
            type="button"
            onClick={() => handleCategoryButtonClick('abriti')}
            className={`py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl font-bold text-xs sm:text-base flex items-center justify-center gap-1.5 sm:gap-2 transition-all shadow-sm active:scale-95 cursor-pointer border ${
              activeCategory === 'abriti'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-400 ring-2 ring-indigo-300 scale-[1.02]'
                : 'bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-900 border-indigo-200'
            }`}
          >
            <Mic className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="font-child font-black">আবৃত্তি</span>
            <span
              className={`hidden sm:inline text-[11px] px-1.5 py-0.5 rounded-md font-bold ${
                activeCategory === 'abriti'
                  ? 'bg-white/25 text-white'
                  : 'bg-indigo-200/70 text-indigo-900'
              }`}
            >
              ৮টি
            </span>
          </button>

          {/* ৩. ছড়া বাটন */}
          <button
            type="button"
            onClick={() => handleCategoryButtonClick('chora')}
            className={`py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl font-bold text-xs sm:text-base flex items-center justify-center gap-1.5 sm:gap-2 transition-all shadow-sm active:scale-95 cursor-pointer border ${
              activeCategory === 'chora'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400 ring-2 ring-emerald-300 scale-[1.02]'
                : 'bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-900 border-emerald-200'
            }`}
          >
            <Music className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="font-child font-black">ছড়া</span>
            <span
              className={`hidden sm:inline text-[11px] px-1.5 py-0.5 rounded-md font-bold ${
                activeCategory === 'chora'
                  ? 'bg-white/25 text-white'
                  : 'bg-emerald-200/70 text-emerald-900'
              }`}
            >
              ৮টি
            </span>
          </button>
        </div>
      </div>

      {/* Expanded Content Panel when কবিতা, আবৃত্তি, or ছড়া is active */}
      {activeCategory && (
        <div className="mt-4 bg-white/95 rounded-3xl p-4 sm:p-6 border-2 border-amber-300 shadow-lg animate-in fade-in duration-200">
          {/* Section Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-amber-200/80">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {activeCategory === 'kobita'
                    ? '📖'
                    : activeCategory === 'abriti'
                    ? '🎙️'
                    : '🎵'}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-child">
                  {activeCategory === 'kobita' && 'সোনামণিদের প্রিয় বাংলা কবিতা'}
                  {activeCategory === 'abriti' && 'ছন্দ ও ভাবপূর্ণ শিশুতোষ আবৃত্তি'}
                  {activeCategory === 'chora' && 'ঐতিহ্যবাহী মজার বাংলা ছড়া'}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                যেকোনো লাইনের উপর ট্যাপ করলে সেই লাইনটি পড়ে শোনাবে, অথবা ‘সম্পূর্ণ শুনুন’ বাটনে চাপ দিন।
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Auto-Play All in Category */}
              <button
                type="button"
                onClick={handleToggleAutoPlayCategory}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                  isAutoPlayingAll
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isAutoPlayingAll ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>অটো পাঠ থামান</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>সবগুলো অটো শুনুন</span>
                  </>
                )}
              </button>

              {/* Record Custom Voice Button */}
              <button
                type="button"
                onClick={() => {
                  bengaliAudio.playClickSound();
                  setIsModalOpen(true);
                }}
                className="px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm active:scale-95"
                title="নিজের আসল কণ্ঠ রেকর্ড বা অডিও আপলোড করুন"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>নিজের কণ্ঠ দিন</span>
              </button>

              {/* Back to Alphabet Board */}
              <button
                type="button"
                onClick={() => {
                  bengaliAudio.playClickSound();
                  stopPlayback();
                  onSelectCategory(null);
                }}
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>বর্ণমালায় ফিরুন</span>
              </button>
            </div>
          </div>

          {/* Grid of Poems / Recitations / Rhymes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => {
              const isItemPlaying = playingItemId === item.id;
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl p-4 sm:p-5 bg-gradient-to-br ${item.bgGradient} border-2 ${
                    isItemPlaying
                      ? 'border-amber-500 ring-4 ring-amber-300/50 shadow-lg'
                      : item.borderColor
                  } transition-all flex flex-col justify-between`}
                >
                  <div>
                    {/* Card Top Title & Author */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl sm:text-4xl select-none bg-white/80 w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xs border border-white">
                          {item.emoji}
                        </span>
                        <div>
                          <h3
                            className={`text-lg sm:text-xl font-black font-child ${item.accentColor}`}
                          >
                            {item.title}
                          </h3>
                          <p className="text-xs font-semibold text-slate-600">
                            ✍️ {item.author}
                          </p>
                        </div>
                      </div>

                      {/* Play / Stop Full Button */}
                      <button
                        type="button"
                        onClick={() => handleTogglePlayItem(item)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0 ${
                          isItemPlaying
                            ? 'bg-rose-600 text-white animate-pulse'
                            : 'bg-amber-500 hover:bg-amber-600 text-white'
                        }`}
                      >
                        {isItemPlaying ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-white" />
                            <span>থামান</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4" />
                            <span>সম্পূর্ণ শুনুন</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Tone Guide for Recitations (আবৃত্তি) */}
                    {item.toneGuide && (
                      <div className="mb-3 px-3 py-1.5 rounded-xl bg-white/75 border border-indigo-200/70 text-indigo-900 text-xs font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>{item.toneGuide}</span>
                      </div>
                    )}

                    {/* Poem / Recitation / Rhyme Lines */}
                    <div className="space-y-1.5 bg-white/85 rounded-2xl p-3.5 border border-white shadow-2xs">
                      {item.lines.map((line, lIdx) => {
                        const isLineActive = isItemPlaying && playingLineIdx === lIdx;
                        return (
                          <button
                            key={lIdx}
                            type="button"
                            onClick={() => handleSpeakLine(item, line, lIdx)}
                            className={`w-full text-left px-3 py-2 rounded-xl font-child text-sm sm:text-base font-bold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                              isLineActive
                                ? 'bg-amber-400/90 text-slate-950 shadow-xs scale-[1.01]'
                                : 'hover:bg-amber-100/70 text-slate-800'
                            }`}
                          >
                            <span className="leading-relaxed">{line}</span>
                            <Volume2
                              className={`w-4 h-4 shrink-0 ${
                                isLineActive ? 'text-slate-950 animate-bounce' : 'text-slate-400'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
