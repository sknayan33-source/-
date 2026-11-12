import React, { useState, useEffect } from 'react';
import { Volume2, CheckCircle2, XCircle, Award, RotateCcw, ArrowRight, Sparkles } from 'lucide-react';
import { AlphabetItem } from '../types/alphabet';
import { IllustrationIcon } from './IllustrationIcon';
import { bengaliAudio } from '../utils/audioPlayer';
import { trackAnalyticsEvent } from '../services/firebase';

interface QuizGameProps {
  items: AlphabetItem[];
}

export const QuizGame: React.FC<QuizGameProps> = ({ items }) => {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [targetItem, setTargetItem] = useState<AlphabetItem | null>(null);
  const [options, setOptions] = useState<AlphabetItem[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [quizMode, setQuizMode] = useState<'listen' | 'picture'>('listen');

  // Generate question
  const generateQuestion = () => {
    if (items.length < 4) return;
    const randomIndex = Math.floor(Math.random() * items.length);
    const target = items[randomIndex];
    setTargetItem(target);

    // Pick 3 random distractors
    const distractors: AlphabetItem[] = [];
    while (distractors.length < 3) {
      const rand = items[Math.floor(Math.random() * items.length)];
      if (rand.id !== target.id && !distractors.some((d) => d.id === rand.id)) {
        distractors.push(rand);
      }
    }

    const all = [target, ...distractors].sort(() => Math.random() - 0.5);
    setOptions(all);
    setSelectedOptionId(null);
    setIsAnswered(false);
    setIsCorrect(false);

    // Auto speak in sweet female voice
    setTimeout(() => {
      if (quizMode === 'listen') {
        bengaliAudio.speakLetter(target.letter, target.name);
      } else {
        bengaliAudio.speakWord(target.letter, target.word);
      }
    }, 350);
  };

  useEffect(() => {
    generateQuestion();
  }, [items, quizMode]);

  const handleOptionSelect = (option: AlphabetItem) => {
    if (isAnswered || !targetItem) return;
    setSelectedOptionId(option.id);
    setIsAnswered(true);

    if (option.id === targetItem.id) {
      setIsCorrect(true);
      setScore((s) => s + 1);
      trackAnalyticsEvent('quiz_complete', `স্কোর: ${score + 1} (${targetItem.letter})`);
      bengaliAudio.playSuccessFanfare();
      setTimeout(() => {
        bengaliAudio.speak(`সঠিক উত্তর! ${targetItem.letter}-তে ${targetItem.word}। খুব ভালো হয়েছে!`);
      }, 300);
    } else {
      setIsCorrect(false);
      bengaliAudio.playWrongTone();
      setTimeout(() => {
        bengaliAudio.speak(`আবার চেষ্টা করো। সঠিক বর্ণ হলো ${targetItem.letter}।`);
      }, 250);
    }
  };

  const handleNext = () => {
    bengaliAudio.playClickSound();
    setQuestionIndex((q) => q + 1);
    generateQuestion();
  };

  const handleReplayVoice = () => {
    if (!targetItem) return;
    bengaliAudio.playClickSound();
    if (quizMode === 'listen') {
      bengaliAudio.speakLetter(targetItem.letter, targetItem.name);
    } else {
      bengaliAudio.speakWord(targetItem.letter, targetItem.word);
    }
  };

  if (!targetItem) return null;

  return (
    // Single-screen container: strictly fits mobile viewport height with no scrolling
    <div className="w-full max-w-md mx-auto flex flex-col justify-between h-[calc(100dvh-130px)] md:h-[560px] pb-2 sm:pb-4 select-none">
      {/* 1. Top Bar: Mode switcher & Score */}
      <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-amber-200/90 shadow-2xs flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 bg-amber-100/70 p-0.5 rounded-xl">
          <button
            onClick={() => {
              bengaliAudio.playClickSound();
              setQuizMode('listen');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              quizMode === 'listen' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-700'
            }`}
          >
            অডিও শুনে
          </button>
          <button
            onClick={() => {
              bengaliAudio.playClickSound();
              setQuizMode('picture');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              quizMode === 'picture' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-700'
            }`}
          >
            ছবি দেখে
          </button>
        </div>

        {/* Score and Question Counter */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-950">
          <Award className="w-3.5 h-3.5 text-amber-500" />
          <span>স্কোর: {score}</span>
        </div>
      </div>

      {/* 2. Compact Question Box */}
      <div className="my-2 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-2xl p-3 sm:p-4 text-white shadow-md text-center relative overflow-hidden flex flex-col items-center justify-center flex-1 max-h-[180px] sm:max-h-[210px]">
        {quizMode === 'listen' ? (
          <div className="flex flex-col items-center justify-center">
            <span className="text-[11px] font-bold text-amber-100 bg-white/20 px-2.5 py-0.5 rounded-full mb-2">
              মিষ্টি কণ্ঠে শুনুন ও বর্ণ চিনুন
            </span>
            <button
              onClick={handleReplayVoice}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white text-amber-600 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shadow-lg ring-4 ring-white/40"
              title="আওয়াজ আবার শুনুন"
            >
              <Volume2 className="w-8 h-8 animate-pulse text-amber-600" />
            </button>
            <span className="text-xs font-semibold text-white mt-1.5 font-child">
              বোতামে চাপ দিয়ে আওয়াজ শুনুন
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-2xl border border-white/30 backdrop-blur-xs">
              <IllustrationIcon
                type={targetItem.sampleSvg}
                customImage={targetItem.customImage}
                altText={targetItem.word}
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md"
              />
            </div>
            <div className="text-left">
              <span className="text-[11px] font-bold text-amber-100 bg-white/20 px-2 py-0.5 rounded-full inline-block">
                ছবি দেখে বর্ণ মেলাও
              </span>
              <h3 className="text-2xl font-black font-child text-white mt-0.5">{targetItem.word}</h3>
              <button
                onClick={handleReplayVoice}
                className="text-xs text-amber-200 underline flex items-center gap-1 mt-0.5"
              >
                <Volume2 className="w-3 h-3" />
                <span>উচ্চারণ শুনুন</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Four Choices Grid (2x2) */}
      <div className="grid grid-cols-2 gap-2.5 my-1 shrink-0">
        {options.map((option) => {
          let btnStyle = 'bg-white hover:bg-amber-50 border-amber-200 text-slate-800 shadow-2xs';

          if (isAnswered) {
            if (option.id === targetItem.id) {
              btnStyle = 'bg-emerald-500 text-white border-emerald-600 ring-2 ring-emerald-300 scale-[1.02] shadow-sm';
            } else if (option.id === selectedOptionId) {
              btnStyle = 'bg-rose-500 text-white border-rose-600';
            } else {
              btnStyle = 'bg-slate-100 text-slate-400 border-slate-200 opacity-50';
            }
          }

          return (
            <button
              key={option.id}
              onClick={() => handleOptionSelect(option)}
              disabled={isAnswered}
              className={`h-16 sm:h-20 rounded-2xl border-2 font-black font-child text-4xl sm:text-5xl flex items-center justify-center transition-all active:scale-95 ${btnStyle}`}
            >
              <span>{option.letter}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Single-line Bottom Feedback & Action bar (Always in place, no layout shift) */}
      <div className="h-12 bg-white/95 backdrop-blur-md rounded-2xl border border-amber-200 px-3 flex items-center justify-between gap-2 shadow-2xs shrink-0 mt-1">
        {isAnswered ? (
          <>
            <div className="flex items-center gap-1.5 min-w-0">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="font-bold text-xs sm:text-sm text-emerald-700 font-child truncate">
                    দারুণ! সঠিক উত্তর: {targetItem.letter} ({targetItem.word})
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  <span className="font-bold text-xs sm:text-sm text-rose-700 font-child truncate">
                    সঠিক ছিল: {targetItem.letter} ({targetItem.word})
                  </span>
                </>
              )}
            </div>

            <button
              onClick={handleNext}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 shrink-0 shadow-xs active:scale-95 transition-all"
            >
              <span>পরেরটি</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="w-full flex items-center justify-center gap-1 text-xs text-amber-800 font-semibold font-child">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>সঠিক বর্ণের উপর ট্যাপ করুন</span>
          </div>
        )}
      </div>
    </div>
  );
};
