/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BANGLA_ALPHABET, ENGLISH_ALPHABET, ALL_ALPHABET } from './data/alphabetData';
import { AlphabetItem, ViewTab } from './types/alphabet';
import { Header } from './components/Header';
import { TopAdBanner } from './components/TopAdBanner';
import { Banner } from './components/Banner';
import { FilterBar, FilterCategory } from './components/FilterBar';
import { BoardView } from './components/BoardView';
import { FlashcardView } from './components/FlashcardView';
import { TracingCanvas } from './components/TracingCanvas';
import { QuizGame } from './components/QuizGame';
import { AutoPlayer } from './components/AutoPlayer';
import { BottomNav } from './components/BottomNav';
import { ShareModal } from './components/ShareModal';
import { AdminModal } from './components/AdminModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { PoetrySection } from './components/PoetrySection';
import { ShortVideosSection } from './components/ShortVideosSection';
import { LongVideosSection } from './components/LongVideosSection';
import { PoetryCategory } from './data/poetryData';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { Share2, ArrowLeft } from 'lucide-react';
import { bengaliAudio } from './utils/audioPlayer';
import {
  trackAnalyticsEvent,
  recordSessionVisitOnce,
  checkAndTrackStandaloneLaunch,
  updatePlayerPresence,
  markPlayerOffline,
  subscribeToVideoButtonsVisibility,
  testConnection,
} from './services/firebase';

function MainAppContent() {
  const { isModalOpen, setIsModalOpen } = useAdmin();
  const [currentTab, setCurrentTab] = useState<ViewTab>('board');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [speed, setSpeed] = useState<'slow' | 'normal'>('normal');
  const [voiceTone, setVoiceTone] = useState<'sweet' | 'teacher'>('sweet');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activePoetryCategory, setActivePoetryCategory] = useState<PoetryCategory | null>(null);
  const [isShortVideosOpen, setIsShortVideosOpen] = useState(false);
  const [isLongVideosOpen, setIsLongVideosOpen] = useState(false);
  const [videosVisible, setVideosVisible] = useState(true);
  const [showExitToast, setShowExitToast] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.location.pathname.startsWith('/privacy')
  );
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const lastBackPressRef = useRef<number>(0);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeToVideoButtonsVisibility((vis) => {
      setVideosVisible(vis);
      if (!vis) {
        setIsShortVideosOpen(false);
        setIsLongVideosOpen(false);
      }
    });
    return () => unsub();
  }, []);

  // Index for Flashcard & Tracing
  const [selectedLetterId, setSelectedLetterId] = useState<string>(BANGLA_ALPHABET[0].id);

  // Auto-play state
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlayIndex, setAutoPlayIndex] = useState(0);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep latest navigation state in a ref for Android hardware Back button (popstate) handler
  const navStateRef = useRef({
    isModalOpen,
    isShareModalOpen,
    isPrivacyModalOpen,
    isAutoPlaying,
    isShortVideosOpen,
    isLongVideosOpen,
    activePoetryCategory,
    currentTab,
    filterCategory,
    searchQuery,
  });

  useEffect(() => {
    navStateRef.current = {
      isModalOpen,
      isShareModalOpen,
      isPrivacyModalOpen,
      isAutoPlaying,
      isShortVideosOpen,
      isLongVideosOpen,
      activePoetryCategory,
      currentTab,
      filterCategory,
      searchQuery,
    };
  }, [
    isModalOpen,
    isShareModalOpen,
    isPrivacyModalOpen,
    isAutoPlaying,
    isShortVideosOpen,
    isLongVideosOpen,
    activePoetryCategory,
    currentTab,
    filterCategory,
    searchQuery,
  ]);

  // Push history guard whenever user enters a sub-screen so Android Back button is intercepted
  useEffect(() => {
    const isSubScreen =
      isModalOpen ||
      isShareModalOpen ||
      isPrivacyModalOpen ||
      isAutoPlaying ||
      isShortVideosOpen ||
      isLongVideosOpen ||
      activePoetryCategory !== null ||
      currentTab !== 'board' ||
      filterCategory !== 'all' ||
      searchQuery.trim() !== '';

    if (isSubScreen) {
      window.history.pushState({ banglaAppGuard: true }, '');
    }
  }, [
    isModalOpen,
    isShareModalOpen,
    isPrivacyModalOpen,
    isAutoPlaying,
    isShortVideosOpen,
    isLongVideosOpen,
    activePoetryCategory,
    currentTab,
    filterCategory,
    searchQuery,
  ]);

  // Global Android / Browser Back Button (popstate) System
  useEffect(() => {
    // Initial history guard entry on app startup
    window.history.pushState({ banglaAppGuard: 1 }, '');
    window.history.pushState({ banglaAppGuard: 2 }, '');

    // Chromium Android WebView requires history.pushState inside a user gesture
    // for webView.canGoBack() to return true and block WebIntoApp's native exit ad popup
    let gestureGuardsCount = 0;
    const ensureGestureHistoryGuard = () => {
      if (gestureGuardsCount < 4) {
        window.history.pushState({ banglaAppGuard: Date.now(), gesture: true }, '');
        gestureGuardsCount++;
      }
    };

    window.addEventListener('touchstart', ensureGestureHistoryGuard, { passive: true });
    window.addEventListener('click', ensureGestureHistoryGuard, { passive: true });

    const handlePopState = () => {
      const state = navStateRef.current;
      gestureGuardsCount = Math.max(0, gestureGuardsCount - 1);

      // Always replenish guard immediately so webView.canGoBack() stays true
      window.history.pushState({ banglaAppGuard: Date.now() }, '');

      // Always stop any active speech/poem when Back is pressed
      bengaliAudio.stop();
      setActiveSpeakingId(null);

      // 1. Close Admin Control Room Modal if open
      if (state.isModalOpen) {
        setIsModalOpen(false);
        return;
      }

      // 2. Close Share Modal or Privacy Policy Modal if open
      if (state.isShareModalOpen) {
        setIsShareModalOpen(false);
        return;
      }

      if (state.isPrivacyModalOpen) {
        setIsPrivacyModalOpen(false);
        return;
      }

      // 3. Stop Auto-Play if running
      if (state.isAutoPlaying) {
        setIsAutoPlaying(false);
        return;
      }

      // 4. Close Short Videos or Long Videos player if open
      if (state.isShortVideosOpen) {
        setIsShortVideosOpen(false);
        return;
      }

      if (state.isLongVideosOpen) {
        setIsLongVideosOpen(false);
        return;
      }

      // 5. Close কবিতা / আবৃত্তি / ছড়া section if open
      if (state.activePoetryCategory !== null) {
        setActivePoetryCategory(null);
        return;
      }

      // 6. Return from কার্ড / হাতেখড়ি / কুইজ tab back to মূল বোর্ড বই ('board')
      if (state.currentTab !== 'board') {
        setCurrentTab('board');
        return;
      }

      // 7. Reset active category filter or search query back to 'সব বর্ণ' ('all')
      if (state.filterCategory !== 'all' || state.searchQuery.trim() !== '') {
        setFilterCategory('all');
        setSearchQuery('');
        return;
      }

      // 8. On Root Home Screen: Keep history stack non-empty so WebView wrapper never shows its third-party popup
      lastBackPressRef.current = Date.now();
      setShowExitToast(true);
      setTimeout(() => setShowExitToast(false), 2600);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('touchstart', ensureGestureHistoryGuard);
      window.removeEventListener('click', ensureGestureHistoryGuard);
    };
  }, [setIsModalOpen]);

  // Helper for on-screen Back button
  const handleManualBack = () => {
    bengaliAudio.stop();
    setActiveSpeakingId(null);
    if (isShortVideosOpen) {
      setIsShortVideosOpen(false);
    } else if (isLongVideosOpen) {
      setIsLongVideosOpen(false);
    } else if (activePoetryCategory !== null) {
      setActivePoetryCategory(null);
    } else if (currentTab !== 'board') {
      setCurrentTab('board');
    } else if (filterCategory !== 'all' || searchQuery.trim() !== '') {
      setFilterCategory('all');
      setSearchQuery('');
    }
  };

  // Preload audio for instant 0ms touch response & initialize Firebase tracking
  useEffect(() => {
    testConnection();
    // Track 1 visit per session & check if running as an installed app
    recordSessionVisitOnce();
    checkAndTrackStandaloneLaunch();
    updatePlayerPresence('board', 'বোর্ড বই পড়ছে');

    // Prioritize 'প থেকে ঁ', vowels, and English A-Z
    const paToChandTexts = BANGLA_ALPHABET.filter((it) => it.isPaToChand).map((it) => it.name || it.letter);
    const englishTexts = ENGLISH_ALPHABET.map((it) => it.letter);
    const allTexts = ALL_ALPHABET.map((it) => it.name || it.letter);
    bengaliAudio.preloadBatch([...paToChandTexts, ...englishTexts, ...allTexts]);
  }, []);

  // Heartbeat every 15s (only when visible) & immediate offline detection when minimized/closed
  useEffect(() => {
    const activeSection = isShortVideosOpen
      ? 'shorts'
      : isLongVideosOpen
      ? 'long_videos'
      : activePoetryCategory
      ? activePoetryCategory
      : currentTab;

    const activityText = isShortVideosOpen
      ? 'শর্ট ভিডিও দেখছে'
      : isLongVideosOpen
      ? 'লং ভিডিও দেখছে'
      : activePoetryCategory === 'kobita'
      ? 'কবিতা শুনছে'
      : activePoetryCategory === 'abriti'
      ? 'আবৃত্তি শুনছে'
      : activePoetryCategory === 'chora'
      ? 'ছড়া শুনছে'
      : currentTab === 'quiz'
      ? 'কুইজ খেলছে'
      : currentTab === 'tracing'
      ? 'হাতেখড়ি অনুশীলন করছে'
      : currentTab === 'flashcard'
      ? 'ফ্ল্যাশকার্ড দেখছে'
      : 'বোর্ড বই পড়ছে';

    updatePlayerPresence(activeSection, activityText);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updatePlayerPresence(activeSection, activityText);
      }
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        markPlayerOffline();
      } else {
        updatePlayerPresence(activeSection, activityText);
      }
    };

    const handlePageHide = () => {
      markPlayerOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [currentTab, isShortVideosOpen, isLongVideosOpen, activePoetryCategory]);

  // Secret search code trigger for Admin Control Room
  useEffect(() => {
    const clean = searchQuery.trim().toLowerCase();
    if (clean === 'admin1234' || clean === 'কন্ট্রোল রুম') {
      setSearchQuery('');
      setIsModalOpen(true);
    }
  }, [searchQuery, setIsModalOpen]);

  // Filter items based on category and search query
  const filteredItems = useMemo(() => {
    return ALL_ALPHABET.filter((item) => {
      // Category filter: 'paToChand' now represents 'অ থেকে ঁ (চন্দ্রবিন্দু চাঁদ)' (all 50 Bangla letters)
      if (filterCategory === 'paToChand' && item.category === 'english') return false;
      if (filterCategory === 'vowels' && item.category !== 'vowel') return false;
      if (filterCategory === 'consonants' && item.category !== 'consonant') return false;
      if (filterCategory === 'english' && item.category !== 'english') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          item.letter.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.word.toLowerCase().includes(q) ||
          item.rhyme.toLowerCase().includes(q) ||
          item.phoneticEn.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filterCategory, searchQuery]);

  // Current active index within filtered items
  const currentIndex = useMemo(() => {
    const idx = filteredItems.findIndex((it) => it.id === selectedLetterId);
    return idx >= 0 ? idx : 0;
  }, [filteredItems, selectedLetterId]);

  // Toggle audio speed
  const handleSpeedToggle = () => {
    const nextSpeed = speed === 'slow' ? 'normal' : 'slow';
    setSpeed(nextSpeed);
    bengaliAudio.setSpeed(nextSpeed);
    bengaliAudio.playClickSound();
  };

  // Toggle sweet female voice tone
  const handleVoiceToneToggle = () => {
    const nextTone = voiceTone === 'sweet' ? 'teacher' : 'sweet';
    setVoiceTone(nextTone);
    bengaliAudio.setVoiceTone(nextTone);
    bengaliAudio.playClickSound();
    if (soundEnabled) {
      bengaliAudio.speak(
        nextTone === 'sweet'
          ? 'মিষ্টি কণ্ঠে স্বাগতম!'
          : 'মহিলা শিক্ষক কণ্ঠে স্বাগতম!'
      );
    }
  };

  // Toggle sound
  const handleSoundToggle = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    if (!nextState) {
      bengaliAudio.stop();
      setIsAutoPlaying(false);
    } else {
      bengaliAudio.playClickSound();
    }
  };

  // Play intro message (শোনো স্বর)
  const handlePlayIntro = () => {
    if (!soundEnabled) return;
    const customIntro =
      bengaliAudio.getCustomVoice('intro_welcome') ||
      bengaliAudio.getCustomVoice('shono_swor') ||
      bengaliAudio.getCustomVoice('intro');
    if (customIntro) {
      bengaliAudio.playCustomAudio(customIntro);
      return;
    }
    bengaliAudio.speak(
      'স্বাগতম! এসো সহজে বাংলা বর্ণমালা শিখি। স্বরবর্ণ ও ব্যঞ্জনবর্ণ, অ থেকে চন্দ্রবিন্দু চাঁদ পর্যন্ত সুন্দর ছবি ও ছড়া দিয়ে পড়াশোনা করো।'
    );
  };

  // Quick filter for 'অ থেকে চন্দ্রবিন্দু ঁ'
  const handleFilterPaToChand = () => {
    if (filterCategory === 'paToChand') {
      setFilterCategory('all');
    } else {
      setFilterCategory('paToChand');
      // Set selection to 'অ'
      const firstBanglaItem = BANGLA_ALPHABET[0];
      if (firstBanglaItem) {
        setSelectedLetterId(firstBanglaItem.id);
      }
    }
  };

  // Quick filter for 'ইংরেজি A to Z'
  const handleFilterEnglish = () => {
    if (filterCategory === 'english') {
      setFilterCategory('all');
    } else {
      setFilterCategory('english');
      const aItem = ENGLISH_ALPHABET[0];
      if (aItem) {
        setSelectedLetterId(aItem.id);
        if (soundEnabled) {
          bengaliAudio.speak('A for Apple. Apple!');
        }
      }
    }
  };

  // Speak letter/word/rhyme
  const handleSpeakItem = (
    item: AlphabetItem,
    type: 'letter' | 'word' | 'rhyme' | 'full' = 'full'
  ) => {
    if (!soundEnabled) return;
    setActiveSpeakingId(item.id);

    // Track in Firebase Analytics & Live Presence
    updatePlayerPresence(currentTab, `${item.letter} (${item.word}) শুনছে`);
    if (type === 'letter') {
      trackAnalyticsEvent('letter_play', `${item.letter} (${item.name || ''})`);
    } else if (type === 'word') {
      trackAnalyticsEvent('word_play', `${item.letter} - ${item.word}`);
    } else if (type === 'rhyme') {
      trackAnalyticsEvent('rhyme_play', `${item.letter} - ${item.rhyme}`);
    } else {
      trackAnalyticsEvent('letter_play', `${item.letter} - সম্পূর্ণ`);
    }

    const onComplete = () => {
      setActiveSpeakingId(null);
    };

    if (type === 'letter') {
      bengaliAudio.speakLetter(item.letter, item.name, onComplete);
    } else if (type === 'word') {
      bengaliAudio.speakWord(item.letter, item.word, onComplete);
    } else if (type === 'rhyme') {
      bengaliAudio.speakRhyme(item.letter, item.word, item.rhyme, onComplete);
    } else {
      bengaliAudio.speakFull(item.letter, item.word, item.rhyme, onComplete);
    }
  };

  // Switch to flashcard for specific item
  const handleSelectItem = (item: AlphabetItem) => {
    setSelectedLetterId(item.id);
    setCurrentTab('flashcard');
    handleSpeakItem(item, 'full');
  };

  // Switch to tracing for specific item
  const handleTraceItem = (item: AlphabetItem) => {
    setSelectedLetterId(item.id);
    setCurrentTab('tracing');
    handleSpeakItem(item, 'letter');
  };

  // Index changes in Flashcard / Tracing
  const handleIndexChange = (newIndex: number) => {
    if (filteredItems[newIndex]) {
      const item = filteredItems[newIndex];
      setSelectedLetterId(item.id);
      if (soundEnabled) {
        handleSpeakItem(item, 'letter');
      }
    }
  };

  // Auto-play loop logic
  useEffect(() => {
    if (!isAutoPlaying) {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
      return;
    }

    if (filteredItems.length === 0) {
      setIsAutoPlaying(false);
      return;
    }

    const item = filteredItems[autoPlayIndex] || filteredItems[0];
    setActiveSpeakingId(item.id);
    setSelectedLetterId(item.id);

    bengaliAudio.speakFull(item.letter, item.word, item.rhyme, () => {
      setActiveSpeakingId(null);
      // Wait 1.2s before advancing to next letter
      autoPlayTimeoutRef.current = setTimeout(() => {
        setAutoPlayIndex((prev) => (prev + 1) % filteredItems.length);
      }, 1200);
    });

    return () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    };
  }, [isAutoPlaying, autoPlayIndex, filteredItems]);

  const toggleAutoPlay = () => {
    bengaliAudio.playClickSound();
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      bengaliAudio.stop();
      setActiveSpeakingId(null);
    } else {
      setIsAutoPlaying(true);
      setAutoPlayIndex(currentIndex);
    }
  };

  const currentAutoItem = filteredItems[autoPlayIndex] || filteredItems[0];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-b from-amber-50/70 via-orange-50/40 to-amber-100/50 flex flex-col font-sans">
      {/* Very Top Google AdMob Banner Slot (Family-Safe & COPPA Compliant) */}
      <TopAdBanner />

      {/* Top Header Contract */}
      <Header
        currentTab={currentTab}
        onTabChange={(tab) => {
          setActivePoetryCategory(null);
          setCurrentTab(tab);
        }}
        speed={speed}
        onSpeedToggle={handleSpeedToggle}
        soundEnabled={soundEnabled}
        onSoundToggle={handleSoundToggle}
        voiceTone={voiceTone}
        onVoiceToneToggle={handleVoiceToneToggle}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-2 sm:py-4">
        {/* Quick Back Navigation Bar when inside any sub-screen */}
        {(currentTab !== 'board' ||
          isShortVideosOpen ||
          isLongVideosOpen ||
          activePoetryCategory !== null ||
          filterCategory !== 'all' ||
          searchQuery.trim() !== '') && (
          <div className="mb-3 flex items-center justify-between bg-white/90 backdrop-blur-xs px-3.5 py-2 rounded-2xl border border-amber-200 shadow-xs">
            <button
              type="button"
              onClick={handleManualBack}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>পেছনে ফিরে যান (হোম)</span>
            </button>
            <span className="text-xs font-bold text-slate-600 font-child">
              {isShortVideosOpen
                ? '🎬 শর্ট ভিডিও (Shorts)'
                : isLongVideosOpen
                ? '📺 লং ভিডিও (Long Videos)'
                : activePoetryCategory === 'kobita'
                ? '📖 কবিতা বিভাগ'
                : activePoetryCategory === 'abriti'
                ? '🎙️ আবৃত্তি বিভাগ'
                : activePoetryCategory === 'chora'
                ? '🎵 ছড়া বিভাগ'
                : currentTab === 'flashcard'
                ? '🗂️ ফ্ল্যাশকার্ড'
                : currentTab === 'tracing'
                ? '✍️ হাতেখড়ি অনুশীলন'
                : currentTab === 'quiz'
                ? '🏆 বর্ণমালা কুইজ'
                : '🔍 বাছাইকৃত বর্ণ'}
            </span>
          </div>
        )}

        {/* Playful Banner & Top কবিতা / আবৃত্তি / ছড়া + শর্ট ও লং ভিডিও Buttons */}
        {currentTab === 'board' && (
          <>
            <Banner
              onPlayIntro={handlePlayIntro}
              onFilterPaToChand={() => {
                setActivePoetryCategory(null);
                setIsShortVideosOpen(false);
                setIsLongVideosOpen(false);
                handleFilterPaToChand();
              }}
              isPaToChandActive={
                filterCategory === 'paToChand' &&
                !activePoetryCategory &&
                !isShortVideosOpen &&
                !isLongVideosOpen
              }
              onFilterEnglish={() => {
                setActivePoetryCategory(null);
                setIsShortVideosOpen(false);
                setIsLongVideosOpen(false);
                handleFilterEnglish();
              }}
              isEnglishActive={
                filterCategory === 'english' &&
                !activePoetryCategory &&
                !isShortVideosOpen &&
                !isLongVideosOpen
              }
              onShare={() => setIsShareModalOpen(true)}
            />

            {/* Large Prominent Short Videos & Long Videos Buttons (Can be hidden in 1 tap via Control Room Play Store Review Mode) */}
            {videosVisible && (
              <>
                <ShortVideosSection
                  isOpen={isShortVideosOpen}
                  onToggleOpen={(open) => {
                    if (open) {
                      setIsAutoPlaying(false);
                      setActivePoetryCategory(null);
                      setIsLongVideosOpen(false);
                    }
                    setIsShortVideosOpen(open);
                  }}
                />

                <LongVideosSection
                  isOpen={isLongVideosOpen}
                  onToggleOpen={(open) => {
                    if (open) {
                      setIsAutoPlaying(false);
                      setActivePoetryCategory(null);
                      setIsShortVideosOpen(false);
                    }
                    setIsLongVideosOpen(open);
                  }}
                />
              </>
            )}

            {/* Top 3 Buttons: কবিতা, আবৃত্তি, ছড়া + Interactive Reader */}
            <PoetrySection
              activeCategory={activePoetryCategory}
              onSelectCategory={(cat) => {
                if (cat) {
                  setIsAutoPlaying(false);
                  setIsShortVideosOpen(false);
                  setIsLongVideosOpen(false);
                }
                setActivePoetryCategory(cat);
              }}
              soundEnabled={soundEnabled}
            />

            {!activePoetryCategory && !isShortVideosOpen && !isLongVideosOpen && (
              <FilterBar
                currentCategory={filterCategory}
                onCategoryChange={(cat) => {
                  setFilterCategory(cat);
                  setAutoPlayIndex(0);
                  if (cat === 'english' && soundEnabled) {
                    bengaliAudio.speak('A for Apple. Apple!');
                  }
                }}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                isAutoPlaying={isAutoPlaying}
                onToggleAutoPlay={toggleAutoPlay}
                totalCount={filteredItems.length}
              />
            )}
          </>
        )}

        {/* Tab Views */}
        {currentTab === 'board' &&
          !activePoetryCategory &&
          !isShortVideosOpen &&
          !isLongVideosOpen && (
          <BoardView
            items={filteredItems}
            activeSpeakingId={activeSpeakingId}
            onSelectItem={handleSelectItem}
            onTraceItem={handleTraceItem}
            onSpeakItem={handleSpeakItem}
          />
        )}

        {currentTab === 'flashcard' && (
          <FlashcardView
            items={filteredItems.length > 0 ? filteredItems : ALL_ALPHABET}
            currentIndex={currentIndex}
            onIndexChange={handleIndexChange}
            onTraceCurrent={() => setCurrentTab('tracing')}
          />
        )}

        {currentTab === 'tracing' && (
          <TracingCanvas
            items={BANGLA_ALPHABET}
            currentIndex={currentIndex}
            onIndexChange={handleIndexChange}
            selectedLetterId={selectedLetterId}
            onSelectLetterId={setSelectedLetterId}
          />
        )}

        {currentTab === 'quiz' && (
          <QuizGame
            items={
              filterCategory === 'paToChand'
                ? BANGLA_ALPHABET.filter((it) => it.isPaToChand)
                : filterCategory === 'english'
                ? ENGLISH_ALPHABET
                : BANGLA_ALPHABET
            }
          />
        )}
      </main>

      {/* Floating Auto-Player Widget when Auto-Play is active */}
      {isAutoPlaying && currentAutoItem && (
        <AutoPlayer
          currentItem={currentAutoItem}
          currentIndex={autoPlayIndex}
          totalCount={filteredItems.length}
          isPlaying={isAutoPlaying}
          onTogglePlay={toggleAutoPlay}
          onNext={() => setAutoPlayIndex((prev) => (prev + 1) % filteredItems.length)}
          onPrev={() =>
            setAutoPlayIndex((prev) => (prev === 0 ? filteredItems.length - 1 : prev - 1))
          }
          onClose={() => {
            setIsAutoPlaying(false);
            bengaliAudio.stop();
            setActiveSpeakingId(null);
          }}
        />
      )}

      {/* Floating App Install Button */}
      <PWAInstallButton variant="floating" />

      {/* Floating Quick Share Button - Hidden when Short or Long Videos player is open */}
      {!isShortVideosOpen && !isLongVideosOpen && (
        <button
          onClick={() => {
            bengaliAudio.playClickSound();
            trackAnalyticsEvent('share_click');
            setIsShareModalOpen(true);
          }}
          className="fixed bottom-24 md:bottom-6 right-4 z-40 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-bold px-4 py-2.5 rounded-full shadow-2xl border-2 border-white flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-amber-500/40"
          title="বন্ধুদের সাথে অ্যাপটি শেয়ার করুন"
        >
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          <span className="text-xs sm:text-sm font-child font-bold">শেয়ার করুন</span>
        </button>
      )}

      {/* Share Modal Dialog */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Admin Security Modal Dialog */}
      <AdminModal />

      {/* Root Home Screen Back Toast Notification */}
      {showExitToast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 text-white px-5 py-2.5 rounded-full shadow-2xl border-2 border-amber-400 text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap animate-bounce">
          <span>🌸 আপনি মূল পেজে আছেন • বের হতে ফোনের হোম (Home) বাটন চাপুন</span>
        </div>
      )}

      {/* In-App Privacy Policy & Child Safety Modal (Google Play Families Policy Compliant) */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border-4 border-amber-400 max-h-[88vh] overflow-y-auto text-slate-800">
            <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-amber-200">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[11px] mb-1">
                  Google Play Families & Child Safety Compliant
                </span>
                <h2 className="text-lg sm:text-xl font-black text-amber-900 font-child">
                  গোপনীয়তা নীতি (Privacy Policy) — সোনামণির পাঠশালা
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
              >
                বন্ধ করুন ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm leading-relaxed">
              <p>
                <strong>সোনামণির পাঠশালা (Sonamonir Pathshala)</strong> আমাদের নিজস্ব মৌলিক শিশুতোষ শিক্ষামূলক ব্র্যান্ড ও অ্যাপ (বাংলা ও ইংরেজি বর্ণমালা, সংখ্যা, ছড়া, হাতেখড়ি ও কুইজ শেখার অ্যাপ)। এটি কোনো লাইভ টেলিভিশন চ্যানেল বা থার্ড-পার্টি টিভি নেটওয়ার্ক নয়। শিশুদের ও অভিভাবকদের গোপনীয়তা ও নিরাপত্তা রক্ষা করা আমাদের সর্বোচ্চ অগ্রাধিকার।
              </p>
              <p className="text-slate-600 italic text-xs">
                <strong>Brand Notice:</strong> &quot;সোনামণির পাঠশালা (Sonamonir Pathshala)&quot; is an original interactive children&apos;s educational brand for learning alphabets, numbers, rhymes, drawing, and quizzes. It is not a live TV broadcast station or affiliated with any third-party television network.
              </p>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                <h3 className="font-extrabold text-amber-950 text-sm mb-1">
                  ১. ব্যক্তিগত তথ্য সংগ্রহ (Data Safety & No PII Collection)
                </h3>
                <p>
                  আমরা ব্যবহারকারী বা শিশুদের কাছ থেকে কোনো ব্যক্তিগত তথ্য (যেমন নাম, ফোন নম্বর, ইমেইল, ঠিকানা, ছবি, ক্যামেরা, মাইক্রোফোন অডিও বা জিপিএস লোকেশন) সংগ্রহ, সংরক্ষণ বা শেয়ার করি না। অ্যাপটি ব্যবহারের জন্য কোনো অ্যাকাউন্ট বা লগইন করার প্রয়োজন নেই।
                </p>
                <p className="text-slate-600 mt-1 italic text-xs">
                  We do not collect, store, or share any Personally Identifiable Information (PII) from children or general users. No account creation, login, camera, microphone, or location permission is required.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <h3 className="font-extrabold text-emerald-950 text-sm mb-1">
                  ২. শিশুদের নিরাপত্তা ও গুগল প্লে ফ্যামিলি পলিসি (COPPA & Families Policy)
                </h3>
                <p>
                  আমাদের অ্যাপটি Google Play Families Policy এবং Children&apos;s Online Privacy Protection Act (COPPA)-এর নীতিমালা সম্পূর্ণ মেনে চলে। অ্যাপে শুধুমাত্র শিশুদের উপযোগী বাংলা ও ইংরেজি বর্ণমালা, ছড়া, কবিতা, হাতেখড়ি ও কুইজ অন্তর্ভুক্ত রয়েছে। বাইরের যেকোনো শেয়ার অপশনে অভিভাবক যাচাইকরণ (Parental Gate) যুক্ত আছে।
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <h3 className="font-extrabold text-slate-900 text-sm mb-1">
                  ৩. যোগাযোগ (Developer Contact)
                </h3>
                <p>
                  গোপনীয়তা নীতি সম্পর্কে যেকোনো প্রশ্নে যোগাযোগ করুন: <strong>sknayan333@gmail.com</strong>
                </p>
              </div>
            </div>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs sm:text-sm shadow-md cursor-pointer"
              >
                ← সোনামণির পাঠশালা অ্যাপে ফিরে যান
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Play Store Compliant Footer with In-App Privacy Policy Modal Trigger */}
      <footer className="max-w-6xl w-full mx-auto px-4 pt-3 pb-32 md:pb-8 text-center text-xs text-slate-500 flex flex-wrap items-center justify-center gap-3">
        <span className="font-child font-bold text-slate-600">© সোনামণির পাঠশালা (Sonamonir Pathshala)</span>
        <span>•</span>
        <button
          type="button"
          onClick={() => {
            bengaliAudio.playClickSound();
            setIsPrivacyModalOpen(true);
          }}
          className="underline hover:text-amber-700 font-semibold transition-colors cursor-pointer"
        >
          গোপনীয়তা নীতি (Privacy Policy)
        </button>
        <span>•</span>
        <button
          type="button"
          onClick={() => {
            bengaliAudio.playClickSound();
            setIsModalOpen(true);
          }}
          className="hover:text-amber-700 font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 opacity-70 hover:opacity-100"
          title="এডমিন কন্ট্রোল রুম (পিন: 7867 বা 1234)"
        >
          <span>🔐 কন্ট্রোল রুম</span>
        </button>
      </footer>

      {/* Mobile Fixed Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={(tab) => {
          setActivePoetryCategory(null);
          setCurrentTab(tab);
        }}
        onShareClick={() => setIsShareModalOpen(true)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AdminProvider>
      <MainAppContent />
    </AdminProvider>
  );
}
