import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  Square,
  Play,
  Volume2,
  Upload,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  AlertCircle,
  BookOpen,
  Music,
  Radio,
  FileAudio,
} from 'lucide-react';
import { BANGLA_ALPHABET, ENGLISH_ALPHABET } from '../data/alphabetData';
import { POETRY_ITEMS } from '../data/poetryData';
import { bengaliAudio } from '../utils/audioPlayer';
import {
  saveCustomLetterVoiceToFirestore,
  deleteCustomLetterVoiceFromFirestore,
} from '../services/firebase';

interface CustomVoiceStudioProps {
  adminPin: string;
  initialSection?: VoiceSection;
}

export type VoiceSection = 'bangla' | 'english' | 'intro' | 'kobita' | 'abriti' | 'chora';

export interface StudioItem {
  id: string;
  key: string;
  secondaryKey?: string;
  displayLetter: string;
  title: string;
  subtitle: string;
  section: VoiceSection;
  scriptLines: string[];
  author?: string;
  categoryTag: string;
}

export const CustomVoiceStudio: React.FC<CustomVoiceStudioProps> = ({ adminPin, initialSection }) => {
  const [activeSection, setActiveSection] = useState<VoiceSection>(initialSection || 'bangla');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
      setSelectedIndex(0);
    }
  }, [initialSection]);
  const [filterRecordedOnly, setFilterRecordedOnly] = useState<boolean>(false);
  const [customVoices, setCustomVoices] = useState<Record<string, string>>(() =>
    bengaliAudio.getCustomVoicesMap()
  );

  // Recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null
  );
  const [playingId, setPlayingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceAfterSaveRef = useRef<boolean>(false);

  // Sync customVoices state when audioPlayer updates
  useEffect(() => {
    const syncVoices = () => {
      setCustomVoices(bengaliAudio.getCustomVoicesMap());
    };
    window.addEventListener('custom-voices-updated', syncVoices);
    return () => {
      window.removeEventListener('custom-voices-updated', syncVoices);
      stopMicrophoneStream();
    };
  }, []);

  // Build items for all 6 sections
  const allStudioItems: Record<VoiceSection, StudioItem[]> = useMemo(() => {
    // ১. বাংলা বর্ণমালা (৫০টি বর্ণ: অ থেকে ঁ)
    const banglaItems: StudioItem[] = BANGLA_ALPHABET.map((item) => ({
      id: item.id,
      key: item.letter,
      secondaryKey: item.id,
      displayLetter: item.letter,
      title: `${item.letter} — ${item.word}`,
      subtitle: item.category === 'vowel' ? 'বাংলা স্বরবর্ণ' : 'বাংলা ব্যঞ্জনবর্ণ',
      section: 'bangla',
      scriptLines: [
        `${item.letter === 'ঁ' ? 'চন্দ্রবিন্দু' : item.letter}।`,
        `${item.letter === 'ঁ' ? 'চন্দ্রবিন্দুতে' : item.letter + '-তে'} ${item.word}।`,
        item.rhyme,
      ],
      categoryTag: item.category === 'vowel' ? 'স্বরবর্ণ' : 'ব্যঞ্জনবর্ণ',
    }));

    // ২. ইংরেজি A-Z (২৬টি বর্ণ: A to Z)
    const englishItems: StudioItem[] = ENGLISH_ALPHABET.map((item) => ({
      id: item.id,
      key: item.letter,
      secondaryKey: item.id,
      displayLetter: item.letter,
      title: `${item.letter} — ${item.word}`,
      subtitle: `ইংরেজি বর্ণ (${item.letter})`,
      section: 'english',
      scriptLines: [
        `${item.letter}!`,
        `${item.letter} for ${item.word.split('(')[0].trim()}.`,
        item.rhyme,
      ],
      categoryTag: 'ইংরেজি A-Z',
    }));

    // ৩. শোনো স্বর (ব্যানার পরিচিতি ও স্বাগতম অডিও)
    const introItems: StudioItem[] = [
      {
        id: 'intro_welcome',
        key: 'intro_welcome',
        secondaryKey: 'shono_swor',
        displayLetter: '🔊',
        title: 'শোনো স্বর (স্বাগত ও পরিচিতি বার্তা)',
        subtitle: 'ব্যানারে "শোনো স্বর" বাটনে চাপলে যে পরিচিতি কণ্ঠটি শিশুদের শোনানো হয়',
        section: 'intro',
        scriptLines: [
          'স্বাগতম! এসো সহজে বাংলা বর্ণমালা শিখি।',
          'স্বরবর্ণ ও ব্যঞ্জনবর্ণ, অ থেকে চন্দ্রবিন্দু চাঁদ পর্যন্ত সুন্দর ছবি ও ছড়া দিয়ে পড়াশোনা করো।',
        ],
        categoryTag: 'ব্যানার বাটন',
      },
    ];

    // ৪. কবিতা (৮টি কবিতা)
    const kobitaItems: StudioItem[] = POETRY_ITEMS.filter((it) => it.category === 'kobita').map((it) => ({
      id: it.id,
      key: it.id,
      secondaryKey: `poem_${it.id}`,
      displayLetter: it.emoji || '📖',
      title: it.title,
      subtitle: it.author ? `লিখেছেন: ${it.author}` : 'বাংলা কবিতা',
      section: 'kobita',
      author: it.author,
      scriptLines: [`${it.title} — ${it.author}`, ...it.lines],
      categoryTag: 'কবিতা',
    }));

    // ৫. আবৃত্তি (৮টি আবৃত্তি)
    const abritiItems: StudioItem[] = POETRY_ITEMS.filter((it) => it.category === 'abriti').map((it) => ({
      id: it.id,
      key: it.id,
      secondaryKey: `poem_${it.id}`,
      displayLetter: it.emoji || '🎤',
      title: it.title,
      subtitle: it.author ? `লিখেছেন: ${it.author}` : 'ছড়া আবৃত্তি',
      section: 'abriti',
      author: it.author,
      scriptLines: [`${it.title} — ${it.author}`, ...it.lines],
      categoryTag: 'আবৃত্তি',
    }));

    // ৬. ছড়া (৮টি ছড়া)
    const choraItems: StudioItem[] = POETRY_ITEMS.filter((it) => it.category === 'chora').map((it) => ({
      id: it.id,
      key: it.id,
      secondaryKey: `poem_${it.id}`,
      displayLetter: it.emoji || '🎵',
      title: it.title,
      subtitle: it.author ? `লিখেছেন: ${it.author}` : 'ছোটদের ছড়া',
      section: 'chora',
      author: it.author,
      scriptLines: [`${it.title} — ${it.author}`, ...it.lines],
      categoryTag: 'ছড়া',
    }));

    return {
      bangla: banglaItems,
      english: englishItems,
      intro: introItems,
      kobita: kobitaItems,
      abriti: abritiItems,
      chora: choraItems,
    };
  }, []);

  const currentSectionItems = allStudioItems[activeSection] || allStudioItems.bangla;

  // Filter items in current section
  const filteredItems = useMemo(() => {
    if (!filterRecordedOnly) return currentSectionItems;
    return currentSectionItems.filter((item) =>
      Boolean(
        customVoices[item.key] ||
          customVoices[item.id] ||
          (item.secondaryKey && customVoices[item.secondaryKey])
      )
    );
  }, [currentSectionItems, filterRecordedOnly, customVoices]);

  // Safe selected item
  const currentItem: StudioItem =
    filteredItems[selectedIndex] || filteredItems[0] || currentSectionItems[0];

  const stopMicrophoneStream = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsRecording(false);
    setRecordSeconds(0);
  };

  const showTempStatus = (type: 'success' | 'error' | 'info', text: string, ms = 4000) => {
    setStatusMsg({ type, text });
    setTimeout(() => {
      setStatusMsg((prev) => (prev?.text === text ? null : prev));
    }, ms);
  };

  // Calculate statistics across all sections
  const statsBySection = useMemo(() => {
    const calc = (items: StudioItem[]) => {
      const rec = items.filter((item) =>
        Boolean(
          customVoices[item.key] ||
            customVoices[item.id] ||
            (item.secondaryKey && customVoices[item.secondaryKey])
        )
      ).length;
      return { total: items.length, recorded: rec };
    };

    return {
      bangla: calc(allStudioItems.bangla),
      english: calc(allStudioItems.english),
      intro: calc(allStudioItems.intro),
      kobita: calc(allStudioItems.kobita),
      abriti: calc(allStudioItems.abriti),
      chora: calc(allStudioItems.chora),
    };
  }, [allStudioItems, customVoices]);

  const totalAllRecorded =
    statsBySection.bangla.recorded +
    statsBySection.english.recorded +
    statsBySection.intro.recorded +
    statsBySection.kobita.recorded +
    statsBySection.abriti.recorded +
    statsBySection.chora.recorded;

  const totalAllItems =
    statsBySection.bangla.total +
    statsBySection.english.total +
    statsBySection.intro.total +
    statsBySection.kobita.total +
    statsBySection.abriti.total +
    statsBySection.chora.total;

  // Max recording seconds depending on type
  const maxRecordingSeconds =
    activeSection === 'kobita' || activeSection === 'abriti' || activeSection === 'chora'
      ? 120
      : activeSection === 'intro'
      ? 45
      : 20;

  // Save audio for any studio item
  const persistVoice = async (
    item: StudioItem,
    audioDataUrl: string,
    advanceNext: boolean = false
  ) => {
    setIsSaving(true);
    showTempStatus('info', `⏳ '${item.title}'-এর ভয়েস সেভ হচ্ছে...`, 6000);

    try {
      // 1. Set immediately in local audio player
      bengaliAudio.setCustomVoice(item.key, item.id, audioDataUrl);
      if (item.secondaryKey) {
        bengaliAudio.setCustomVoice(item.secondaryKey, item.id, audioDataUrl);
      }
      setCustomVoices(bengaliAudio.getCustomVoicesMap());

      // 2. Save to Firestore (Real-time sync to all mobile users)
      const cloudSynced = await saveCustomLetterVoiceToFirestore(item.id, item.key, audioDataUrl);

      // 3. Backup to server
      try {
        await fetch('/api/custom-voice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': adminPin || '1234',
          },
          body: JSON.stringify({
            itemId: item.id,
            letter: item.key,
            audioBase64: audioDataUrl,
            adminPin: adminPin || '1234',
          }),
        });
      } catch (err) {
        console.warn('Server voice backup skipped:', err);
      }

      setIsSaving(false);
      showTempStatus(
        'success',
        cloudSynced
          ? `✅ '${item.title}'-এর কণ্ঠ ক্লাউডে সেভ হয়েছে — সবার ডিভাইসে অটোমেটিক আপডেট হয়ে গেছে!`
          : `✅ '${item.title}'-এর জন্য আপনার নিজের কণ্ঠ সফলভাবে সেভ হয়েছে!`
      );

      if (advanceNext && filteredItems.length > 1) {
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      }
    } catch (err) {
      setIsSaving(false);
      showTempStatus('error', 'ভয়েস সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    }
  };

  // Start live microphone recording
  const handleStartRecording = async (targetItem?: StudioItem) => {
    bengaliAudio.stop();
    if (targetItem) {
      const idx = filteredItems.findIndex((it) => it.id === targetItem.id);
      if (idx >= 0) setSelectedIndex(idx);
    }

    const activeItem = targetItem || currentItem;

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      showTempStatus(
        'error',
        'মাইক্রোফোন সাপোর্ট পাওয়া যায়নি। পাশের "ফাইল আপলোড" দিয়ে অডিও ফাইল দিন।'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      let chosenMime = '';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        for (const candidate of mimeCandidates) {
          if (MediaRecorder.isTypeSupported(candidate)) {
            chosenMime = candidate;
            break;
          }
        }
      }

      const recorderOptions: MediaRecorderOptions = chosenMime
        ? { mimeType: chosenMime, audioBitsPerSecond: 48000 }
        : { audioBitsPerSecond: 48000 };

      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const shouldAdvance = autoAdvanceAfterSaveRef.current;
        autoAdvanceAfterSaveRef.current = false;

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setIsRecording(false);
        setRecordSeconds(0);

        if (audioChunksRef.current.length === 0) return;

        const blobType = chosenMime || recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        audioChunksRef.current = [];

        if (audioBlob.size < 400) {
          showTempStatus('error', 'রেকর্ডিং খুব ছোট হয়েছে। অন্তত ১-২ সেকেন্ড কথা বলুন।');
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          if (base64Audio) {
            persistVoice(activeItem, base64Audio, shouldAdvance);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start(200);
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= maxRecordingSeconds) {
            handleStopRecording(false);
            return maxRecordingSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      showTempStatus(
        'error',
        'মাইক্রোফোন চালু করা যায়নি (Permission প্রয়োজন)। আপনি পাশের "ফাইল আপলোড" দিয়ে ফাইল দিতে পারেন!'
      );
    }
  };

  const handleStopRecording = (advanceToNext: boolean = false) => {
    autoAdvanceAfterSaveRef.current = advanceToNext;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    } else {
      stopMicrophoneStream();
    }
  };

  const handleCancelRecording = () => {
    audioChunksRef.current = [];
    autoAdvanceAfterSaveRef.current = false;
    stopMicrophoneStream();
    showTempStatus('info', 'রেকর্ডিং বাতিল করা হয়েছে।', 2000);
  };

  // Upload an audio file
  const handleFileUpload = (item: StudioItem, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 850 * 1024) {
      showTempStatus('error', 'অডিও ফাইলটি ৮৫০ KB-এর নিচে হতে হবে (MP3/M4A/WAV/WebM)।');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result) {
        persistVoice(item, result, false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Reset an item back to default voice
  const handleResetVoice = async (item: StudioItem) => {
    bengaliAudio.stop();
    bengaliAudio.removeCustomVoice(item.key, item.id);
    if (item.secondaryKey) {
      bengaliAudio.removeCustomVoice(item.secondaryKey, item.id);
    }
    setCustomVoices(bengaliAudio.getCustomVoicesMap());

    try {
      await fetch('/api/admin/reset-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin || '1234',
        },
        body: JSON.stringify({
          itemId: item.id,
          letter: item.key,
          adminPin: adminPin || '1234',
        }),
      });
    } catch {}

    await deleteCustomLetterVoiceFromFirestore(item.id, false);
    showTempStatus('info', `🔄 '${item.title}'-এর জন্য ডিফল্ট কণ্ঠ ফিরিয়ে আনা হয়েছে।`);
  };

  // Play custom voice or active voice
  const handlePlayVoice = (item: StudioItem) => {
    setPlayingId(item.id);
    const customSrc =
      customVoices[item.key] ||
      customVoices[item.id] ||
      (item.secondaryKey && customVoices[item.secondaryKey]);

    if (customSrc) {
      bengaliAudio.playCustomAudio(customSrc, () => {
        setPlayingId((prev) => (prev === item.id ? null : prev));
      });
      return;
    }

    // Default voice playback
    if (item.section === 'bangla' || item.section === 'english') {
      bengaliAudio.speakLetter(item.key, undefined, () => {
        setPlayingId((prev) => (prev === item.id ? null : prev));
      });
    } else if (item.section === 'intro') {
      bengaliAudio.speak(
        'স্বাগতম! এসো সহজে বাংলা বর্ণমালা শিখি। স্বরবর্ণ ও ব্যঞ্জনবর্ণ, অ থেকে চন্দ্রবিন্দু চাঁদ পর্যন্ত সুন্দর ছবি ও ছড়া দিয়ে পড়াশোনা করো।',
        () => {
          setPlayingId((prev) => (prev === item.id ? null : prev));
        }
      );
    } else {
      bengaliAudio.playPoemAudio(
        item.id,
        item.scriptLines.join(' '),
        undefined,
        () => {
          setPlayingId((prev) => (prev === item.id ? null : prev));
        }
      );
    }
  };

  const isCurrentItemRecorded = Boolean(
    customVoices[currentItem.key] ||
      customVoices[currentItem.id] ||
      (currentItem.secondaryKey && customVoices[currentItem.secondaryKey])
  );

  return (
    <div className="space-y-4">
      {/* Studio Header Banner with Multi-Category Counter */}
      <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-rose-500/20 border-2 border-amber-400/60 rounded-2xl p-3.5 sm:p-4 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] mb-1">
              <Sparkles className="w-3 h-3" /> এডমিন ভয়েস কন্ট্রোল রুম
            </span>
            <h3 className="text-sm sm:text-base font-black text-white">
              🎙️ আপনার আসল কণ্ঠে সম্পূর্ণ অ্যাপ পরিচালনা স্টুডিও
            </h3>
            <p className="text-[11px] text-slate-300 mt-0.5">
              বাংলা বর্ণমালা, ইংরেজি A-Z, শোনো স্বর, কবিতা, আবৃত্তি ও ছড়া — সবগুলোতে নিজের আসল কণ্ঠ রেকর্ড বা আপলোড করুন!
            </p>
          </div>
          <div className="bg-slate-900/90 border border-amber-400/50 px-3.5 py-2 rounded-2xl text-center shrink-0">
            <p className="text-[10px] text-amber-300 font-bold">মোট কণ্ঠ যুক্ত হয়েছে</p>
            <p className="text-base sm:text-lg font-black text-white">
              {totalAllRecorded} <span className="text-xs text-slate-400">/ {totalAllItems}টি আইটেম</span>
            </p>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all duration-300"
            style={{
              width: `${Math.min(100, Math.round((totalAllRecorded / Math.max(1, totalAllItems)) * 100))}%`,
            }}
          />
        </div>
      </div>

      {/* 6 Category Tabs (বাংলা, ইংরেজি A-Z, শোনো স্বর, কবিতা, আবৃত্তি, ছড়া) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => {
            if (isRecording) handleCancelRecording();
            setActiveSection('bangla');
            setSelectedIndex(0);
          }}
          className={`py-2 px-2 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
            activeSection === 'bangla'
              ? 'bg-amber-400 text-slate-950 shadow-md ring-1 ring-white'
              : 'text-slate-300 hover:text-white bg-slate-900/60'
          }`}
        >
          <span>অ-ঁ বাংলা বর্ণ</span>
          <span className="text-[10px] opacity-80">
            ({statsBySection.bangla.recorded}/{statsBySection.bangla.total})
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (isRecording) handleCancelRecording();
            setActiveSection('english');
            setSelectedIndex(0);
          }}
          className={`py-2 px-2 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
            activeSection === 'english'
              ? 'bg-purple-500 text-white shadow-md ring-1 ring-white'
              : 'text-slate-300 hover:text-white bg-slate-900/60'
          }`}
        >
          <span>A-Z ইংরেজি</span>
          <span className="text-[10px] opacity-80">
            ({statsBySection.english.recorded}/{statsBySection.english.total})
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (isRecording) handleCancelRecording();
            setActiveSection('intro');
            setSelectedIndex(0);
          }}
          className={`py-2 px-2 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
            activeSection === 'intro'
              ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-white'
              : 'text-slate-300 hover:text-white bg-slate-900/60'
          }`}
        >
          <span>🔊 শোনো স্বর</span>
          <span className="text-[10px] opacity-80">
            ({statsBySection.intro.recorded}/{statsBySection.intro.total})
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (isRecording) handleCancelRecording();
            setActiveSection('kobita');
            setSelectedIndex(0);
          }}
          className={`py-2 px-2 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
            activeSection === 'kobita'
              ? 'bg-rose-500 text-white shadow-md ring-1 ring-white'
              : 'text-slate-300 hover:text-white bg-slate-900/60'
          }`}
        >
          <span>📖 কবিতা</span>
          <span className="text-[10px] opacity-80">
            ({statsBySection.kobita.recorded}/{statsBySection.kobita.total})
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (isRecording) handleCancelRecording();
            setActiveSection('abriti');
            setSelectedIndex(0);
          }}
          className={`py-2 px-2 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
            activeSection === 'abriti'
              ? 'bg-blue-500 text-white shadow-md ring-1 ring-white'
              : 'text-slate-300 hover:text-white bg-slate-900/60'
          }`}
        >
          <span>🎤 আবৃত্তি</span>
          <span className="text-[10px] opacity-80">
            ({statsBySection.abriti.recorded}/{statsBySection.abriti.total})
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (isRecording) handleCancelRecording();
            setActiveSection('chora');
            setSelectedIndex(0);
          }}
          className={`py-2 px-2 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
            activeSection === 'chora'
              ? 'bg-emerald-500 text-white shadow-md ring-1 ring-white'
              : 'text-slate-300 hover:text-white bg-slate-900/60'
          }`}
        >
          <span>🎵 ছড়া</span>
          <span className="text-[10px] opacity-80">
            ({statsBySection.chora.recorded}/{statsBySection.chora.total})
          </span>
        </button>
      </div>

      {/* Status Toast Message */}
      {statusMsg && (
        <div
          className={`px-3.5 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
              : statusMsg.type === 'error'
              ? 'bg-rose-500/20 border-rose-400/50 text-rose-200'
              : 'bg-amber-500/20 border-amber-400/50 text-amber-200'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Horizontal Scroller / Item Selection Bar */}
      <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-2 flex items-center gap-1.5 overflow-x-auto">
        {currentSectionItems.map((item, idx) => {
          const isRec = Boolean(
            customVoices[item.key] ||
              customVoices[item.id] ||
              (item.secondaryKey && customVoices[item.secondaryKey])
          );
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (isRecording) handleCancelRecording();
                setSelectedIndex(idx);
              }}
              className={`relative px-3 py-2 rounded-xl font-child font-black text-xs shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-amber-400 text-slate-950 scale-105 ring-2 ring-white shadow-md'
                  : isRec
                  ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/50 hover:bg-emerald-600/40'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title={item.title}
            >
              <span>{item.displayLetter}</span>
              <span className="truncate max-w-[110px]">{item.title.split('—')[0]}</span>
              {isRec && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Item Recording & Studio Workspace Card */}
      <div className="bg-slate-900/95 border-2 border-slate-700 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
        {/* Header of Active Item */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-child font-black text-2xl shadow-md shrink-0">
              {currentItem.displayLetter}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base sm:text-lg font-black text-white">{currentItem.title}</h4>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 text-[10px] font-bold border border-slate-700">
                  {currentItem.categoryTag}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{currentItem.subtitle}</p>
            </div>
          </div>

          {/* Voice State Badge */}
          <div className="flex items-center gap-2 shrink-0">
            {isCurrentItemRecorded ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> আপনার আসল কণ্ঠ যুক্ত আছে
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold">
                ডিফল্ট সিস্টেম কণ্ঠ
              </span>
            )}
          </div>
        </div>

        {/* Script to Read Box (What to speak while recording) */}
        <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
              🎙️ রেকর্ডিং করার সময় যা মুখে সুন্দর করে বলবেন:
            </span>
            <span className="text-[10px] text-slate-400">সর্বোচ্চ সময়: {maxRecordingSeconds} সেকেন্ড</span>
          </div>

          <div className="space-y-1.5 py-1">
            {currentItem.scriptLines.map((line, idx) => (
              <p
                key={idx}
                className="text-sm sm:text-base font-bold text-slate-100 font-child leading-relaxed flex items-start gap-2"
              >
                <span className="text-amber-400 text-xs mt-1 shrink-0">{idx + 1}.</span>
                <span>{line}</span>
              </p>
            ))}
          </div>
        </div>

        {/* Live Recording Console */}
        {isRecording ? (
          <div className="bg-rose-950/40 border-2 border-rose-500/60 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center gap-3 text-center animate-pulse">
            <div className="w-14 h-14 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/50">
              <Mic className="w-7 h-7" />
            </div>

            <div>
              <p className="text-rose-200 text-xs font-bold">লাইভ রেকর্ডিং চলছে... স্পষ্ট কণ্ঠে বলুন</p>
              <p className="text-2xl font-black text-white font-mono mt-0.5">
                00:{recordSeconds < 10 ? `0${recordSeconds}` : recordSeconds} / 00:{maxRecordingSeconds}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleStopRecording(false)}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
              >
                <Square className="w-4 h-4 fill-slate-950" />
                <span>রেকর্ড শেষ ও সেভ করুন</span>
              </button>

              <button
                type="button"
                onClick={() => handleStopRecording(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
              >
                <span>সেভ ও পরবর্তী আইটেম →</span>
              </button>

              <button
                type="button"
                onClick={handleCancelRecording}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                বাতিল ✕
              </button>
            </div>
          </div>
        ) : (
          /* Normal State Action Buttons */
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* 1. Record Button */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleStartRecording()}
              className="flex-1 min-w-[160px] px-4 py-3 rounded-xl bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 hover:opacity-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95 transition-all"
            >
              <Mic className="w-4 h-4" />
              <span>{isCurrentItemRecorded ? 'আবার নতুন করে রেকর্ড করুন' : 'মাইক্রোফোনে রেকর্ড শুরু করুন'}</span>
            </button>

            {/* 2. File Upload Button */}
            <label className="flex-1 min-w-[150px] px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95">
              <Upload className="w-4 h-4 text-sky-400" />
              <span>অডিও ফাইল আপলোড</span>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => handleFileUpload(currentItem, e)}
                className="hidden"
              />
            </label>

            {/* 3. Play Current Audio */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handlePlayVoice(currentItem)}
              className="px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95 shrink-0"
              title="বর্তমান কণ্ঠ শুনুন"
            >
              {playingId === currentItem.id ? (
                <>
                  <Square className="w-4 h-4 fill-slate-950" />
                  <span>বাজছে...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>{isCurrentItemRecorded ? 'আপনার কণ্ঠ শুনুন' : 'কণ্ঠ শুনুন'}</span>
                </>
              )}
            </button>

            {/* 4. Reset Button */}
            {isCurrentItemRecorded && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleResetVoice(currentItem)}
                className="p-3 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shrink-0"
                title="ডিফল্ট কণ্ঠে ফিরে যান"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span className="hidden sm:inline">রিসেট</span>
              </button>
            )}
          </div>
        )}

        {/* Navigation Footer (পূর্ববর্তী | পরবর্তী) */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3">
          <button
            type="button"
            disabled={selectedIndex === 0 || isRecording}
            onClick={() => {
              if (isRecording) handleCancelRecording();
              setSelectedIndex((prev) => Math.max(0, prev - 1));
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>পূর্ববর্তী</span>
          </button>

          <span className="text-xs text-slate-400 font-bold">
            {selectedIndex + 1} / {filteredItems.length}
          </span>

          <button
            type="button"
            disabled={selectedIndex >= filteredItems.length - 1 || isRecording}
            onClick={() => {
              if (isRecording) handleCancelRecording();
              setSelectedIndex((prev) => Math.min(filteredItems.length - 1, prev + 1));
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>পরবর্তী</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
