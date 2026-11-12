import React, { useRef, useState, useEffect, useMemo } from 'react';
import { RotateCcw, Volume2, ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react';
import { AlphabetItem } from '../types/alphabet';
import { BANGLA_ALPHABET, ENGLISH_ALPHABET } from '../data/alphabetData';
import { bengaliAudio } from '../utils/audioPlayer';
import { trackAnalyticsEvent, updatePlayerPresence } from '../services/firebase';

interface TracingCanvasProps {
  items: AlphabetItem[];
  currentIndex: number;
  onIndexChange: (idx: number) => void;
  selectedLetterId?: string;
  onSelectLetterId?: (id: string) => void;
}

type TracingGroup = 'bangla_all' | 'vowels' | 'consonants' | 'paToChand' | 'english';

const COLORS = [
  { name: 'Red', hex: '#EF4444' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Green', hex: '#10B981' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Pink', hex: '#EC4899' },
];

export const TracingCanvas: React.FC<TracingCanvasProps> = ({
  items,
  currentIndex,
  onIndexChange,
  selectedLetterId,
  onSelectLetterId,
}) => {
  // Default to full Bangla alphabet (অ থেকে চন্দ্রবিন্দু ঁ চাঁদ পর্যন্ত - ৫০টি বর্ণ)
  const [tracingGroup, setTracingGroup] = useState<TracingGroup>('bangla_all');
  const [localIndex, setLocalIndex] = useState<number>(0);

  const activeList = useMemo(() => {
    switch (tracingGroup) {
      case 'vowels':
        return BANGLA_ALPHABET.filter((it) => it.category === 'vowel');
      case 'consonants':
        return BANGLA_ALPHABET.filter((it) => it.category === 'consonant');
      case 'paToChand':
        return BANGLA_ALPHABET.filter((it) => it.isPaToChand);
      case 'english':
        return ENGLISH_ALPHABET;
      case 'bangla_all':
      default:
        return BANGLA_ALPHABET; // অ থেকে ঁ (চন্দ্রবিন্দু চাঁদ) পর্যন্ত ৫০টি বর্ণ
    }
  }, [tracingGroup]);

  // Sync when a Bangla letter is selected from outside
  useEffect(() => {
    if (!selectedLetterId) return;
    const inBangla = BANGLA_ALPHABET.findIndex((it) => it.id === selectedLetterId);
    if (inBangla >= 0) {
      setTracingGroup('bangla_all');
      setLocalIndex(inBangla);
    }
  }, [selectedLetterId]);

  const safeIndex = localIndex >= 0 && localIndex < activeList.length ? localIndex : 0;
  const currentItem = activeList[safeIndex] || BANGLA_ALPHABET[0];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#3B82F6');
  const [strokeWidth, setStrokeWidth] = useState(14);
  const [hasDrawn, setHasDrawn] = useState(false);
  const tracedInCurrentViewRef = useRef(false);

  // Sync canvas internal resolution with its rendered CSS size so strokes are 1:1 and never stretched
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
        setHasDrawn(false);
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Clear canvas when letter changes
  useEffect(() => {
    clearCanvas();
  }, [safeIndex, currentItem?.id, tracingGroup]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHasDrawn(false);
    tracedInCurrentViewRef.current = false;
  };

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const touch = 'touches' in e ? e.touches[0] || e.changedTouches[0] : null;
    const clientX = touch ? touch.clientX : (e as React.MouseEvent<HTMLCanvasElement>).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent<HTMLCanvasElement>).clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure canvas resolution matches display size if not yet initialized
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (Math.abs(canvas.width - rect.width * dpr) > 4) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.scale(dpr, dpr);
    }

    setIsDrawing(true);
    setHasDrawn(true);
    const { x, y } = getCoordinates(e, canvas);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
    bengaliAudio.playClickSound();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e, canvas);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && !tracedInCurrentViewRef.current) {
      tracedInCurrentViewRef.current = true;
      trackAnalyticsEvent('tracing_complete', `${currentItem.letter} (${currentItem.word})`);
      updatePlayerPresence('tracing', `হাতেখড়ি: ${currentItem.letter} লিখছে`);
    }
    setIsDrawing(false);
  };

  const selectLetterAt = (idx: number, list: AlphabetItem[] = activeList) => {
    const target = list[idx];
    if (!target) return;
    setLocalIndex(idx);
    onSelectLetterId?.(target.id);
    bengaliAudio.speakLetter(target.letter, target.name);
  };

  const handleGroupChange = (group: TracingGroup) => {
    bengaliAudio.playClickSound();
    setTracingGroup(group);
    setLocalIndex(0);
    let firstItem = BANGLA_ALPHABET[0];
    if (group === 'vowels') firstItem = BANGLA_ALPHABET.filter((it) => it.category === 'vowel')[0];
    else if (group === 'consonants') firstItem = BANGLA_ALPHABET.filter((it) => it.category === 'consonant')[0];
    else if (group === 'paToChand') firstItem = BANGLA_ALPHABET.filter((it) => it.isPaToChand)[0];
    else if (group === 'english') firstItem = ENGLISH_ALPHABET[0];
    if (firstItem) {
      onSelectLetterId?.(firstItem.id);
      bengaliAudio.speakLetter(firstItem.letter, firstItem.name);
    }
  };

  const handlePrev = () => {
    bengaliAudio.playClickSound();
    const nextIdx = safeIndex === 0 ? activeList.length - 1 : safeIndex - 1;
    selectLetterAt(nextIdx);
  };

  const handleNext = () => {
    bengaliAudio.playClickSound();
    const nextIdx = safeIndex === activeList.length - 1 ? 0 : safeIndex + 1;
    selectLetterAt(nextIdx);
  };

  const handleHearLetter = () => {
    bengaliAudio.speakFull(currentItem.letter, currentItem.word, currentItem.rhyme);
  };

  return (
    <div className="max-w-xl mx-auto pb-20">
      {/* Category Selector Tabs for Tracing: অ থেকে ঁ চাঁদ পর্যন্ত */}
      <div className="bg-white/90 backdrop-blur-md p-2 rounded-2xl border border-amber-200 shadow-xs mb-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => handleGroupChange('bangla_all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            tracingGroup === 'bangla_all'
              ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-300'
              : 'bg-amber-50 text-amber-950 hover:bg-amber-100'
          }`}
        >
          অ থেকে ঁ চাঁদ (৫০)
        </button>

        <button
          onClick={() => handleGroupChange('vowels')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            tracingGroup === 'vowels'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
          }`}
        >
          স্বরবর্ণ (অ - ঔ)
        </button>

        <button
          onClick={() => handleGroupChange('consonants')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            tracingGroup === 'consonants'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-blue-50 text-blue-900 hover:bg-blue-100'
          }`}
        >
          ব্যঞ্জনবর্ণ (ক - ঁ)
        </button>

        <button
          onClick={() => handleGroupChange('paToChand')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            tracingGroup === 'paToChand'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-rose-50 text-rose-900 hover:bg-rose-100'
          }`}
        >
          প থেকে ঁ (চাঁদ)
        </button>

        <button
          onClick={() => handleGroupChange('english')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
            tracingGroup === 'english'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
          }`}
        >
          <span>A-Z ইংরেজি</span>
        </button>
      </div>

      {/* Scrollable Quick Letter Picker Bar (অ, আ, ই ... ঁ) */}
      <div className="mb-3 bg-white/90 backdrop-blur-md p-2 rounded-2xl border border-amber-200 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {activeList.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => selectLetterAt(idx)}
            className={`w-9 h-9 shrink-0 rounded-xl font-bold font-child text-sm transition-all flex items-center justify-center ${
              idx === safeIndex
                ? 'bg-amber-500 text-white shadow-xs scale-105 ring-2 ring-amber-300'
                : 'bg-amber-50 text-slate-700 hover:bg-amber-100'
            }`}
            title={`${item.letter} - ${item.word}`}
          >
            {item.letter}
          </button>
        ))}
      </div>

      {/* Top Bar with Letter Selection & Word */}
      <div className="bg-white p-3 rounded-2xl border border-amber-200 shadow-xs mb-3 flex items-center justify-between">
        <button
          onClick={handlePrev}
          className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors"
          title="পূর্ববর্তী বর্ণ"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="text-3xl sm:text-4xl font-black font-child text-slate-800">
            {currentItem.letter}
          </span>
          <span className="text-sm sm:text-base font-bold font-child text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
            {currentItem.word}
          </span>
          <button
            onClick={handleHearLetter}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>শুনুন</span>
          </button>
        </div>

        <button
          onClick={handleNext}
          className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors"
          title="পরবর্তী বর্ণ"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Tracing Canvas Board */}
      <div className="relative bg-white rounded-3xl border-4 border-amber-300 shadow-lg overflow-hidden touch-none">
        {/* Background Guide Letter for Tracing */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className="text-[220px] sm:text-[280px] font-black font-child text-slate-200/80 leading-none">
            {currentItem.letter}
          </span>
        </div>

        {/* Tracing Instructions Overlay if empty */}
        {!hasDrawn && (
          <div className="absolute top-4 left-4 right-4 pointer-events-none text-center">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              <Sparkles className="w-3.5 h-3.5" />
              আঙুল দিয়ে বর্ণের উপর হাত বুলিয়ে লিখুন
            </span>
          </div>
        )}

        {/* HTML5 Canvas */}
        <canvas
          ref={canvasRef}
          width={480}
          height={380}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-[340px] sm:h-[380px] cursor-crosshair relative z-10"
        />
      </div>

      {/* Drawing Tools: Colors, Clear */}
      <div className="mt-3 bg-white p-3 rounded-2xl border border-amber-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Color Palette */}
        <div className="flex items-center gap-2">
          {COLORS.map((col) => (
            <button
              key={col.hex}
              onClick={() => {
                bengaliAudio.playClickSound();
                setCurrentColor(col.hex);
              }}
              style={{ backgroundColor: col.hex }}
              className={`w-8 h-8 rounded-full transition-transform flex items-center justify-center text-white ${
                currentColor === col.hex ? 'scale-110 ring-3 ring-amber-400 shadow-md' : 'hover:scale-105'
              }`}
            >
              {currentColor === col.hex && <Check className="w-4 h-4 stroke-[3]" />}
            </button>
          ))}
        </div>

        {/* Clear & Brush Size */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              bengaliAudio.playClickSound();
              setStrokeWidth(strokeWidth === 14 ? 22 : 14);
            }}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            তুলি: {strokeWidth === 14 ? 'মাঝারি' : 'মোটা'}
          </button>

          <button
            onClick={() => {
              bengaliAudio.playClickSound();
              clearCanvas();
            }}
            className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>মুছে ফেলো</span>
          </button>
        </div>
      </div>
    </div>
  );
};
