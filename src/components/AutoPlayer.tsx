import React from 'react';
import { Pause, Play, SkipForward, SkipBack, X, Volume2 } from 'lucide-react';
import { AlphabetItem } from '../types/alphabet';

interface AutoPlayerProps {
  currentItem: AlphabetItem;
  currentIndex: number;
  totalCount: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export const AutoPlayer: React.FC<AutoPlayerProps> = ({
  currentItem,
  currentIndex,
  totalCount,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  onClose,
}) => {
  const progressPercent = ((currentIndex + 1) / totalCount) * 100;

  return (
    <div className="fixed bottom-16 md:bottom-6 left-4 right-4 max-w-lg mx-auto z-50 bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80">
      {/* Top progress line */}
      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2.5">
        <div
          className="bg-amber-400 h-full transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        {/* Left: Current Letter thumbnail */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-black font-child text-2xl flex items-center justify-center shrink-0 shadow-xs">
            {currentItem.letter}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-white font-child truncate">
                {currentItem.letter}-তে {currentItem.word}
              </span>
              <span className="text-[10px] text-amber-300 font-bold shrink-0">
                ({currentIndex + 1}/{totalCount})
              </span>
            </div>
            <p className="text-xs text-slate-300 truncate font-child">{currentItem.rhyme}</p>
          </div>
        </div>

        {/* Right: Audio playback controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onPrev}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
            title="আগের বর্ণ"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center transition-all shadow-md active:scale-95"
            title={isPlaying ? 'বিরতি দিন' : 'চালু করুন'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 fill-slate-950 ml-0.5" />}
          </button>

          <button
            onClick={onNext}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
            title="পরের বর্ণ"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="w-7 h-7 ml-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            title="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
