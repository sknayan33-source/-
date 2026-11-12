import React from 'react';
import { Search, Play, Pause, RotateCcw } from 'lucide-react';
import { bengaliAudio } from '../utils/audioPlayer';

export type FilterCategory = 'all' | 'paToChand' | 'vowels' | 'consonants' | 'english';

interface FilterBarProps {
  currentCategory: FilterCategory;
  onCategoryChange: (cat: FilterCategory) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isAutoPlaying: boolean;
  onToggleAutoPlay: () => void;
  totalCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  currentCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  isAutoPlaying,
  onToggleAutoPlay,
  totalCount,
}) => {
  return (
    <div className="w-full max-w-full overflow-hidden flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-amber-200/80 shadow-xs">
      {/* Category Filter Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        <button
          onClick={() => {
            bengaliAudio.playClickSound();
            onCategoryChange('all');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            currentCategory === 'all'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-100/60 text-slate-700 hover:bg-amber-100'
          }`}
        >
          সব বর্ণ ({totalCount})
        </button>

        {/* User requested focus: অ থেকে চন্দ্রবিন্দু ঁ */}
        <button
          onClick={() => {
            bengaliAudio.playClickSound();
            onCategoryChange('paToChand');
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            currentCategory === 'paToChand'
              ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 text-white shadow-md ring-2 ring-rose-300 scale-[1.02]'
              : 'bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:from-rose-600 hover:to-orange-600 shadow-xs'
          }`}
        >
          <span className="bg-amber-300 text-rose-950 text-[10px] px-1.5 py-0.5 rounded-md font-black">
            অ-ঁ
          </span>
          <span>অ থেকে ঁ (চন্দ্রবিন্দু চাঁদ)</span>
        </button>

        <button
          onClick={() => {
            bengaliAudio.playClickSound();
            onCategoryChange('vowels');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            currentCategory === 'vowels'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-100/60 text-emerald-900 hover:bg-emerald-100'
          }`}
        >
          স্বরবর্ণ (১১)
        </button>

        <button
          onClick={() => {
            bengaliAudio.playClickSound();
            onCategoryChange('consonants');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            currentCategory === 'consonants'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-blue-100/60 text-blue-900 hover:bg-blue-100'
          }`}
        >
          ব্যঞ্জনবর্ণ (৩৯)
        </button>

        {/* English A to Z (26 letters) button requested by user */}
        <button
          onClick={() => {
            bengaliAudio.playClickSound();
            onCategoryChange('english');
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            currentCategory === 'english'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm ring-2 ring-purple-300 scale-[1.02]'
              : 'bg-purple-100/80 text-purple-900 hover:bg-purple-200/80 border border-purple-300/60'
          }`}
        >
          <span className="bg-purple-800 text-amber-200 text-[10px] px-1.5 py-0.5 rounded-md font-black tracking-wider">
            A-Z
          </span>
          <span>ইংরেজি A to Z (২৬)</span>
        </button>
      </div>

      {/* Right controls: Search and Auto-Read */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 sm:w-44">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="বর্ণ বা শব্দ খুঁজুন..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Auto Play Slideshow Button */}
        <button
          onClick={onToggleAutoPlay}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shadow-xs ${
            isAutoPlaying
              ? 'bg-rose-500 text-white animate-pulse'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
          }`}
          title="স্বয়ংক্রিয়ভাবে একের পর এক বর্ণ পড়ে শোনাবে"
        >
          {isAutoPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>থামাও</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>অটো পাঠ</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
