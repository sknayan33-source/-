import React from 'react';
import { LayoutGrid, Layers, Edit3, Award, Share2 } from 'lucide-react';
import { ViewTab } from '../types/alphabet';
import { bengaliAudio } from '../utils/audioPlayer';

interface BottomNavProps {
  currentTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  onShareClick?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, onShareClick }) => {
  const tabs = [
    { id: 'board', label: 'বোর্ড বই', icon: LayoutGrid },
    { id: 'flashcard', label: 'কার্ড', icon: Layers },
    { id: 'tracing', label: 'হাতেখড়ি', icon: Edit3 },
    { id: 'quiz', label: 'কুইজ', icon: Award },
  ] as const;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t-2 border-amber-300/90 shadow-[0_-4px_20px_rgba(0,0,0,0.12)] px-1 pt-1.5"
      style={{
        paddingBottom: 'var(--app-safe-bottom, max(env(safe-area-inset-bottom, 0px), 18px))',
      }}
      aria-label="Mobile Bottom Navigation"
    >
      <div className="grid grid-cols-5 items-center min-h-[50px] pb-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                bengaliAudio.playClickSound();
                onTabChange(tab.id);
              }}
              className={`min-h-[46px] flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer ${
                isActive ? 'text-amber-600 font-black' : 'text-slate-600 hover:text-slate-900 font-bold'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-amber-100 text-amber-700 shadow-2xs scale-105' : 'text-slate-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span className="text-[11px] font-child tracking-tight mt-0.5 leading-none">
                {tab.label}
              </span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-0.5" />}
            </button>
          );
        })}

        {/* Prominent Share Tab Button on Mobile */}
        {onShareClick && (
          <button
            onClick={() => {
              bengaliAudio.playClickSound();
              onShareClick();
            }}
            className="min-h-[46px] flex flex-col items-center justify-center text-amber-600 font-bold hover:text-amber-700 transition-all active:scale-95 cursor-pointer"
            title="অ্যাপটি শেয়ার করুন"
          >
            <div className="p-1 rounded-xl bg-amber-100/90 text-amber-700 shadow-2xs">
              <Share2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-child font-black tracking-tight mt-0.5 leading-none text-amber-800">
              শেয়ার
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};
