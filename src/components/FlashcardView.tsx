import React, { useState, useEffect } from 'react';
import { Volume2, ChevronLeft, ChevronRight, Play, Edit3, Sparkles } from 'lucide-react';
import { AlphabetItem } from '../types/alphabet';
import { IllustrationIcon } from './IllustrationIcon';
import { bengaliAudio } from '../utils/audioPlayer';

interface FlashcardViewProps {
  items: AlphabetItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onTraceCurrent: () => void;
}

export const FlashcardView: React.FC<FlashcardViewProps> = ({
  items,
  currentIndex,
  onIndexChange,
  onTraceCurrent,
}) => {
  const currentItem = items[currentIndex] || items[0];
  const [playingSection, setPlayingSection] = useState<'letter' | 'word' | 'rhyme' | 'full' | null>(null);
  const [serverImages, setServerImages] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/custom-images')
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        if (data && typeof data === 'object') {
          setServerImages(data as Record<string, string>);
        }
      })
      .catch(() => {});
  }, []);

  let currentImage =
    currentItem.id === 'c-10'
      ? currentItem.customImage
      : serverImages[currentItem.id] || currentItem.customImage;
  try {
    const saved = localStorage.getItem('bangla_custom_images');
    if (saved && currentItem.id !== 'c-10') {
      const parsed = JSON.parse(saved);
      if (parsed[currentItem.id]) {
        currentImage = parsed[currentItem.id];
      }
    }
  } catch {}

  const handlePrev = () => {
    bengaliAudio.playClickSound();
    const prev = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
    onIndexChange(prev);
  };

  const handleNext = () => {
    bengaliAudio.playClickSound();
    const next = currentIndex === items.length - 1 ? 0 : currentIndex + 1;
    onIndexChange(next);
  };

  const playAudio = (type: 'letter' | 'word' | 'rhyme' | 'full') => {
    setPlayingSection(type);
    if (type === 'letter') {
      bengaliAudio.speakLetter(currentItem.letter, currentItem.name, () => setPlayingSection(null));
    } else if (type === 'word') {
      bengaliAudio.speakWord(currentItem.letter, currentItem.word, () => setPlayingSection(null));
    } else if (type === 'rhyme') {
      bengaliAudio.speakRhyme(currentItem.letter, currentItem.word, currentItem.rhyme, () => setPlayingSection(null));
    } else {
      bengaliAudio.speakFull(currentItem.letter, currentItem.word, currentItem.rhyme, () => setPlayingSection(null));
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20">
      {/* Quick Alphabet Thumb Scroller */}
      <div className="mb-4 bg-white/90 backdrop-blur-md p-2 rounded-2xl border border-amber-200 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {items.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => {
              bengaliAudio.playClickSound();
              onIndexChange(idx);
            }}
            className={`w-9 h-9 shrink-0 rounded-xl font-bold font-child text-sm transition-all ${
              idx === currentIndex
                ? 'bg-amber-500 text-white shadow-xs scale-105 ring-2 ring-amber-300'
                : 'bg-amber-50 text-slate-700 hover:bg-amber-100'
            }`}
          >
            {item.letter}
          </button>
        ))}
      </div>

      {/* Main Flashcard Card */}
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${currentItem.colorScheme.bgGradient} text-white p-6 sm:p-8 shadow-xl border-4 border-white/20`}
      >
        {/* Top Badges */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-xs">
              {currentItem.category === 'vowel'
                ? 'স্বরবর্ণ'
                : currentItem.category === 'english'
                ? 'ইংরেজি বর্ণমালা (A-Z)'
                : 'ব্যঞ্জনবর্ণ'}
            </span>
            {currentItem.category !== 'english' && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-amber-950">
                অ থেকে চন্দ্রবিন্দু চাঁদ
              </span>
            )}
          </div>
          <span className="text-white/60 text-xs font-bold">
            {currentIndex + 1} / {items.length}
          </span>
        </div>

        {/* Center Display: 50/50 Equal Split - GIGANTIC Letter & BIG Picture */}
        <div className="grid grid-cols-1 sm:grid-cols-2 items-stretch justify-center gap-4 sm:gap-6 my-4">
          {/* 50% Half: Enormous Letter button */}
          <button
            onPointerDown={() => playAudio('letter')}
            className={`group p-6 sm:p-8 rounded-3xl bg-black/25 hover:bg-black/35 border-2 border-white/30 transition-all text-center flex flex-col items-center justify-center min-h-[220px] sm:min-h-[300px] shadow-2xl ${
              playingSection === 'letter' ? 'ring-4 ring-amber-300 scale-105' : 'active:scale-95'
            }`}
            title="বর্ণ শুনুন"
          >
            <div
              className={`text-9xl sm:text-[10.5rem] md:text-[12rem] font-black font-child tracking-tight ${currentItem.colorScheme.textLetter} drop-shadow-2xl leading-none`}
            >
              {currentItem.letter}
            </div>
            <div className="mt-4 flex items-center justify-center gap-1.5 text-base sm:text-lg font-bold text-white/95 bg-black/35 px-4 py-1 rounded-full border border-white/20 shadow-sm">
              <Volume2 className="w-4 h-4 text-amber-300" />
              <span>{currentItem.name}</span>
            </div>
          </button>

          {/* 50% Half: Big Illustration */}
          <div className="flex flex-col items-center justify-between gap-3">
            <button
              onPointerDown={() => playAudio('word')}
              className={`p-2 rounded-3xl bg-black/25 hover:bg-black/35 border-2 border-white/30 transition-transform shadow-2xl flex items-center justify-center overflow-hidden w-full h-full min-h-[200px] sm:min-h-[250px] ${
                playingSection === 'word' ? 'ring-4 ring-amber-300 scale-105' : 'active:scale-95'
              }`}
              title={`${currentItem.word} শুনুন`}
            >
              <IllustrationIcon
                type={currentItem.sampleSvg}
                customImage={currentImage}
                altText={currentItem.word}
                className="w-full h-full max-h-[260px] sm:max-h-[300px] object-cover drop-shadow-2xl rounded-2xl"
              />
            </button>
            <button
              onPointerDown={() => playAudio('word')}
              className="w-full py-2.5 rounded-2xl bg-white/25 hover:bg-white/35 text-white font-black font-child text-xl sm:text-2xl flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <span>{currentItem.word}</span>
              <Volume2 className="w-5 h-5 text-amber-300" />
            </button>
          </div>
        </div>

        {/* Rhyme Section */}
        <div className="mt-6 pt-4 border-t border-white/20">
          <button
            onPointerDown={() => playAudio('rhyme')}
            className={`w-full p-4 rounded-2xl bg-black/30 hover:bg-black/40 border border-white/15 transition-all text-center flex flex-col sm:flex-row items-center justify-between gap-3 ${
              playingSection === 'rhyme' ? 'ring-2 ring-amber-300 bg-black/50' : ''
            }`}
          >
            <div className="text-left">
              <span className="text-xs text-amber-300 font-bold block mb-0.5">ছড়া দিয়ে শেখা:</span>
              <span className="text-lg sm:text-2xl font-bold font-child text-white">
                {currentItem.rhyme}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-400 text-amber-950 font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-xs">
              <Volume2 className="w-4 h-4" />
              <span>ছড়া শোনো</span>
            </div>
          </button>
        </div>

        {/* Control Footer */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={onTraceCurrent}
            className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors border border-white/20"
          >
            <Edit3 className="w-4 h-4 text-emerald-300" />
            <span>বর্ণ লেখা শেখো</span>
          </button>

          <button
            onClick={() => playAudio('full')}
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md active:scale-95"
          >
            <Volume2 className="w-4 h-4" />
            <span>সম্পূর্ণ পাঠ</span>
          </button>
        </div>
      </div>

      {/* Prev / Next Navigation buttons for thumb ergonomics */}
      <div className="flex items-center justify-between gap-4 mt-4">
        <button
          onClick={handlePrev}
          className="flex-1 min-h-[48px] py-3 px-4 rounded-2xl bg-white text-slate-800 font-bold text-sm flex items-center justify-center gap-2 shadow-xs border border-amber-200 hover:bg-amber-50 active:scale-98 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-amber-600" />
          <span>আগের বর্ণ</span>
        </button>

        <button
          onClick={handleNext}
          className="flex-1 min-h-[48px] py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
        >
          <span>পরের বর্ণ</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
