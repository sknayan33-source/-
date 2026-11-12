/**
 * Audio service for Bengali Alphabet pronunciation and Sound Effects
 * Guarantees the EXACT SAME Sweet Female Voice (মিষ্টি মহিলা কণ্ঠ) for ALL letters
 * from 'অ' all the way to 'ঁ' (চন্দ্রবিন্দু চাঁদ)!
 */

import { subscribeToCustomLetterVoices } from '../services/firebase';

export type VoiceTone = 'sweet' | 'teacher';

const CUSTOM_VOICES_STORAGE_KEY = 'hashikhushi_custom_voices_v1';

class BengaliAudioService {
  private currentAudio: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private rate: number = 0.96;
  private voiceTone: VoiceTone = 'sweet';

  // Client-side HTMLAudioElement pool for 0ms instantaneous touch response
  private audioPool: Map<string, HTMLAudioElement> = new Map();

  // Custom recorded voices map (keyed by both Bengali letter like 'অ' and itemId like 'v-1')
  private customVoices: Map<string, string> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      // 1. Load cached custom voices from localStorage immediately
      try {
        const cached = localStorage.getItem(CUSTOM_VOICES_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') {
            Object.entries(parsed).forEach(([k, v]) => {
              if (typeof v === 'string' && v) {
                this.customVoices.set(k, v);
              }
            });
          }
        }
      } catch {}

      // 2. Fetch server-saved custom voices
      fetch('/api/custom-voices')
        .then((r) => (r.ok ? r.json() : {}))
        .then((data) => {
          if (data && typeof data === 'object') {
            Object.entries(data).forEach(([k, v]) => {
              if (typeof v === 'string' && v) {
                this.customVoices.set(k, v);
              }
            });
            this.persistCustomVoicesLocally();
            window.dispatchEvent(new CustomEvent('custom-voices-updated'));
          }
        })
        .catch(() => {});

      // 3. Subscribe to Firestore real-time custom voices (authoritative global cloud state for all users)
      try {
        subscribeToCustomLetterVoices((firestoreVoices) => {
          if (firestoreVoices && typeof firestoreVoices === 'object') {
            this.customVoices.clear();
            Object.entries(firestoreVoices).forEach(([k, v]) => {
              if (typeof v === 'string' && v) {
                this.customVoices.set(k, v);
              }
            });
            this.persistCustomVoicesLocally();
            window.dispatchEvent(new CustomEvent('custom-voices-updated'));
          }
        });
      } catch {}
    }
  }

  private persistCustomVoicesLocally() {
    if (typeof window === 'undefined') return;
    try {
      const obj: Record<string, string> = {};
      this.customVoices.forEach((v, k) => {
        // Keep URLs or compact data URLs in localStorage
        if (v.length < 350000) {
          obj[k] = v;
        }
      });
      localStorage.setItem(CUSTOM_VOICES_STORAGE_KEY, JSON.stringify(obj));
    } catch {}
  }

  public setCustomVoice(letter: string, itemId: string, audioSrc: string) {
    if (letter) this.customVoices.set(letter, audioSrc);
    if (itemId) this.customVoices.set(itemId, audioSrc);
    this.audioPool.delete(`custom_voice_${letter}`);
    this.audioPool.delete(`custom_voice_${itemId}`);
    this.persistCustomVoicesLocally();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('custom-voices-updated'));
    }
  }

  public removeCustomVoice(letter: string, itemId: string) {
    if (letter) this.customVoices.delete(letter);
    if (itemId) this.customVoices.delete(itemId);
    this.audioPool.delete(`custom_voice_${letter}`);
    this.audioPool.delete(`custom_voice_${itemId}`);
    this.persistCustomVoicesLocally();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('custom-voices-updated'));
    }
  }

  public clearAllCustomVoices() {
    this.customVoices.clear();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(CUSTOM_VOICES_STORAGE_KEY);
      } catch {}
      window.dispatchEvent(new CustomEvent('custom-voices-updated'));
    }
  }

  public getCustomVoice(letterOrId: string): string | undefined {
    return this.customVoices.get(letterOrId);
  }

  public getCustomVoicesMap(): Record<string, string> {
    const out: Record<string, string> = {};
    this.customVoices.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }

  public playCustomAudio(src: string, onEnd?: () => void, skipClickSound: boolean = false) {
    if (!skipClickSound) {
      this.playClickSound();
    }
    this.stop();

    const audio = new Audio(src);
    this.currentAudio = audio;
    audio.playbackRate = this.rate;
    audio.currentTime = 0;

    let hasEnded = false;
    const finish = () => {
      if (!hasEnded) {
        hasEnded = true;
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        if (onEnd) onEnd();
      }
    };

    audio.onended = finish;
    audio.onerror = finish;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(finish);
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setVoiceTone(tone: VoiceTone) {
    this.voiceTone = tone;
  }

  public getVoiceTone(): VoiceTone {
    return this.voiceTone;
  }

  public setSpeed(speed: 'slow' | 'normal') {
    this.rate = speed === 'slow' ? 0.82 : 0.98;
    if (this.currentAudio) {
      this.currentAudio.playbackRate = this.rate;
    }
  }

  public getSpeed(): 'slow' | 'normal' {
    return this.rate <= 0.85 ? 'slow' : 'normal';
  }

  /**
   * Preload an audio string into memory so touching it plays instantly
   */
  public preload(text: string) {
    const cleanText = text.trim();
    if (!cleanText || this.audioPool.has(cleanText)) return;

    try {
      const url = `/api/tts?v=human2&text=${encodeURIComponent(cleanText)}`;
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.playbackRate = this.rate;
      audio.load();
      this.audioPool.set(cleanText, audio);
    } catch {
      // ignore
    }
  }

  /**
   * Preload batch of items in background with safe interval
   */
  public preloadBatch(texts: string[]) {
    texts.forEach((text, i) => {
      setTimeout(() => this.preload(text), i * 150);
    });
  }

  /**
   * Stop any active audio
   */
  public stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  /**
   * Speak with the natural human woman voice (bn-BD-NabanitaNeural)
   */
  public speak(text: string, onEnd?: () => void, skipClickSound: boolean = false): void {
    const cleanText = text.trim();
    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    // Instant tactile click sound unless reciting continuous poetry lines
    if (!skipClickSound) {
      this.playClickSound();
    }

    this.stop();

    // Check if preloaded in memory
    let audio = this.audioPool.get(cleanText);

    if (!audio) {
      const url = `/api/tts?v=human2&text=${encodeURIComponent(cleanText)}`;
      audio = new Audio(url);
      audio.playbackRate = this.rate;
      this.audioPool.set(cleanText, audio);
    }

    this.currentAudio = audio;
    audio.playbackRate = this.rate;
    audio.currentTime = 0;

    let hasEnded = false;
    const finish = () => {
      if (!hasEnded) {
        hasEnded = true;
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        if (onEnd) onEnd();
      }
    };

    audio.onended = finish;

    audio.onerror = () => {
      // Retry once cleanly from server
      const url = `/api/tts?v=human2&text=${encodeURIComponent(cleanText)}`;
      const retry = new Audio(url);
      retry.playbackRate = this.rate;
      retry.onended = finish;
      retry.play().catch(finish);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Handled cleanly
      });
    }
  }

  /**
   * Preload a pre-generated poem MP3 into memory for 0ms instant start
   */
  public preloadPoemAudio(poemId: string) {
    const key = `poem_mp3_${poemId}`;
    if (this.audioPool.has(key)) return;
    try {
      const audio = new Audio(`/audio/poems/${poemId}.mp3?v=human3`);
      audio.preload = 'auto';
      audio.playbackRate = this.rate;
      audio.load();
      this.audioPool.set(key, audio);
    } catch {
      // ignore
    }
  }

  /**
   * Play an entire poem continuously in one smooth natural woman voice recording
   * with real-time progress callback for line highlighting
   */
  public playPoemAudio(
    poemId: string,
    fallbackFullText: string,
    onProgress?: (ratio: number) => void,
    onEnd?: () => void,
    startRatio: number = 0
  ) {
    this.stop();

    // Check if custom recorded voice exists for this poem/recitation/rhyme
    const customVoice =
      this.customVoices.get(poemId) ||
      this.customVoices.get(`poem_${poemId}`) ||
      this.customVoices.get(`custom_voice_${poemId}`);

    let audio: HTMLAudioElement;
    if (customVoice) {
      audio = new Audio(customVoice);
    } else {
      const key = `poem_mp3_${poemId}`;
      let cachedAudio = this.audioPool.get(key);
      if (!cachedAudio) {
        cachedAudio = new Audio(`/audio/poems/${poemId}.mp3?v=human3`);
        this.audioPool.set(key, cachedAudio);
      }
      audio = cachedAudio;
    }

    this.currentAudio = audio;
    audio.playbackRate = this.rate;

    const applyStartAndPlay = () => {
      if (!audio) return;
      if (startRatio > 0 && audio.duration && isFinite(audio.duration)) {
        audio.currentTime = Math.max(0, Math.min(audio.duration - 0.5, audio.duration * startRatio));
      } else {
        audio.currentTime = 0;
      }
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    };

    let hasEnded = false;
    const finish = () => {
      if (!hasEnded) {
        hasEnded = true;
        audio!.ontimeupdate = null;
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        if (onEnd) onEnd();
      }
    };

    audio.ontimeupdate = () => {
      if (audio && audio.duration && audio.duration > 0 && onProgress) {
        onProgress(audio.currentTime / audio.duration);
      }
    };

    audio.onended = finish;
    audio.onerror = () => {
      audio!.ontimeupdate = null;
      this.speak(fallbackFullText, finish, true);
    };

    if (startRatio > 0 && (!audio.duration || !isFinite(audio.duration))) {
      audio.addEventListener('loadedmetadata', applyStartAndPlay, { once: true });
      audio.load();
    } else {
      applyStartAndPlay();
    }
  }

  public speakLetter(letter: string, name?: string, onEnd?: () => void) {
    const cleanLetter = letter.trim();
    const customSrc =
      this.customVoices.get(cleanLetter) ||
      this.customVoices.get(cleanLetter.toUpperCase()) ||
      this.customVoices.get(cleanLetter.toLowerCase()) ||
      this.customVoices.get(`en-${cleanLetter.toLowerCase()}`) ||
      (name ? this.customVoices.get(name) : undefined);

    if (customSrc) {
      this.playCustomAudio(customSrc, onEnd);
      return;
    }

    const isEn = /^[A-Za-z]$/.test(letter.trim());
    if (isEn) {
      this.speak(letter.toUpperCase(), onEnd);
      return;
    }
    // Speak clean child-friendly pronunciation of the Bengali letter
    let textToSpeak = letter;
    if (letter === 'ঁ') {
      textToSpeak = 'চন্দ্রবিন্দু';
    } else if (letter === 'ৎ') {
      textToSpeak = 'খণ্ড ত';
    } else if (letter === 'ং') {
      textToSpeak = 'অনুস্বার';
    } else if (letter === 'ঃ') {
      textToSpeak = 'বিসর্গ';
    }
    this.speak(textToSpeak, onEnd);
  }

  public speakWord(letter: string, word: string, onEnd?: () => void) {
    const cleanLetter = letter.trim();
    const customSrc =
      this.customVoices.get(cleanLetter) ||
      this.customVoices.get(cleanLetter.toUpperCase()) ||
      this.customVoices.get(cleanLetter.toLowerCase()) ||
      this.customVoices.get(`en-${cleanLetter.toLowerCase()}`);
    if (customSrc) {
      this.playCustomAudio(customSrc, onEnd);
      return;
    }

    const isEn = /^[A-Za-z]$/.test(letter.trim());
    if (isEn) {
      const cleanWord = word.split('(')[0].trim();
      const textToSpeak = `${letter} for ${cleanWord}. ${cleanWord}!`;
      this.speak(textToSpeak, onEnd);
      return;
    }
    const prefix = letter === 'ঁ' ? 'চন্দ্রবিন্দুতে' : `${letter} তে`;
    const textToSpeak = `${prefix} ${word}। ${word}`;
    this.speak(textToSpeak, onEnd);
  }

  public speakRhyme(letter: string, word: string, rhyme: string, onEnd?: () => void) {
    const cleanLetter = letter.trim();
    const customSrc =
      this.customVoices.get(cleanLetter) ||
      this.customVoices.get(cleanLetter.toUpperCase()) ||
      this.customVoices.get(cleanLetter.toLowerCase()) ||
      this.customVoices.get(`en-${cleanLetter.toLowerCase()}`);
    if (customSrc) {
      this.playCustomAudio(customSrc, onEnd);
      return;
    }

    const isEn = /^[A-Za-z]$/.test(letter.trim());
    if (isEn) {
      this.speak(rhyme, onEnd);
      return;
    }
    const prefix = letter === 'ঁ' ? 'চন্দ্রবিন্দুতে' : `${letter} তে`;
    const textToSpeak = `${prefix} ${word}। ${rhyme}`;
    this.speak(textToSpeak, onEnd);
  }

  public speakFull(letter: string, word: string, rhyme: string, onEnd?: () => void) {
    const cleanLetter = letter.trim();
    const customSrc =
      this.customVoices.get(cleanLetter) ||
      this.customVoices.get(cleanLetter.toUpperCase()) ||
      this.customVoices.get(cleanLetter.toLowerCase()) ||
      this.customVoices.get(`en-${cleanLetter.toLowerCase()}`);
    if (customSrc) {
      this.playCustomAudio(customSrc, onEnd);
      return;
    }

    this.speakDefaultFull(letter, word, rhyme, onEnd);
  }

  public speakDefaultFull(letter: string, word: string, rhyme: string, onEnd?: () => void) {
    const isEn = /^[A-Za-z]$/.test(letter.trim());
    if (isEn) {
      const cleanWord = word.split('(')[0].trim();
      const textToSpeak = `${letter}. ${letter} for ${cleanWord}. ${rhyme}`;
      this.speak(textToSpeak, onEnd);
      return;
    }
    const letterName = letter === 'ঁ' ? 'চন্দ্রবিন্দু' : letter;
    const prefix = letter === 'ঁ' ? 'চন্দ্রবিন্দুতে' : `${letter} তে`;
    const textToSpeak = `${letterName}। ${prefix} ${word}। ${rhyme}`;
    this.speak(textToSpeak, onEnd);
  }

  // Web Audio SFX
  public playClickSound() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1050, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      // AudioContext blocked
    }
  }

  public playChime(freq: number = 650) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.32);
    } catch {
      // ignore
    }
  }

  public playSuccessFanfare() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.setValueAtTime(0.16, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.3);
      });
    } catch {
      // ignore
    }
  }

  public playWrongTone() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {
      // ignore
    }
  }
}

export const bengaliAudio = new BengaliAudioService();
