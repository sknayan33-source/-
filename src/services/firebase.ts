import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  increment,
  getDocFromServer,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import { getAnalytics, isSupported, logEvent, Analytics } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with auto-detect long polling to avoid 10s timeout in preview/iframes
const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
let firestoreInstance: Firestore;
try {
  firestoreInstance =
    databaseId && databaseId !== '(default)'
      ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true }, databaseId)
      : initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
} catch {
  firestoreInstance =
    databaseId && databaseId !== '(default)'
      ? getFirestore(app, databaseId)
      : getFirestore(app);
}
export const db: Firestore = firestoreInstance;

// Analytics instance holder
let analyticsInstance: Analytics | null = null;
let isAnalyticsSupported = false;

if (typeof window !== 'undefined') {
  const measurementId = (firebaseConfig as any).measurementId;
  if (measurementId && typeof measurementId === 'string' && measurementId.trim().length > 0) {
    isSupported()
      .then((supported) => {
        if (supported) {
          try {
            analyticsInstance = getAnalytics(app);
            isAnalyticsSupported = true;
            logEvent(analyticsInstance, 'app_session_start', {
              app_name: 'bangla_alphabet',
            });
          } catch {}
        }
      })
      .catch(() => {});
  }
}

// Persistent anonymous device/session ID for presence & analytics
export const getSessionId = (): string => {
  if (typeof window === 'undefined') return 'server';
  try {
    let sId = localStorage.getItem('hashikhushi_player_device_id');
    if (!sId || !sId.startsWith('player_')) {
      sId = 'player_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    }
    // Ensure it matches ^[a-zA-Z0-9_\-]+$
    sId = sId.replace(/[^a-zA-Z0-9_-]/g, '');
    localStorage.setItem('hashikhushi_player_device_id', sId);
    return sId;
  } catch {
    return 'fallback_player';
  }
};

export const isRunningAsInstalledApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const isAndroidWebViewApk =
    window.self === window.top &&
    (/; wv\)|WebIntoApp|Android.*Version\/[0-9.]+/i.test(ua) ||
      (typeof document !== 'undefined' && document.referrer.includes('android-app://')));
  return (
    isAndroidWebViewApk ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
};

export const getDevicePlatformName = (): string => {
  if (typeof window === 'undefined') return 'অজানা ডিভাইস';
  const ua = window.navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'Android ফোন';
  if (/iphone|ipad|ipod/.test(ua)) return 'iPhone / iPad';
  if (/windows|macintosh|linux/.test(ua)) return 'কম্পিউটার';
  return 'মোবাইল ডিভাইস';
};

export type TrackedEventType =
  | 'page_view'
  | 'app_install'
  | 'letter_play'
  | 'word_play'
  | 'rhyme_play'
  | 'quiz_complete'
  | 'share_click'
  | 'tracing_complete'
  | 'ad_banner_click';

const INSTALL_TRACKED_KEY = 'hashikhushi_app_install_counted_v2';
const SESSION_VISIT_KEY = 'hashikhushi_session_visit_counted_v2';

// Record 1 visit per actual app/browser session (prevents hot-reloads or refreshes from inflating totalVisits)
export const recordSessionVisitOnce = (): void => {
  if (typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem(SESSION_VISIT_KEY) === 'true') {
      return;
    }
    sessionStorage.setItem(SESSION_VISIT_KEY, 'true');
    trackAnalyticsEvent('page_view');
  } catch {
    trackAnalyticsEvent('page_view');
  }
};

// Record an app installation (ensures 1 count per unique device install)
export const recordAppInstallation = async (source: string = 'pwa_install'): Promise<void> => {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(INSTALL_TRACKED_KEY) === 'true') {
      return; // Already counted this device's installation
    }
    localStorage.setItem(INSTALL_TRACKED_KEY, 'true');
    await trackAnalyticsEvent('app_install', `${getDevicePlatformName()} (${source})`);
  } catch {}
};

// Automatically check on startup if user launched from an installed PWA/APK
export const checkAndTrackStandaloneLaunch = (): void => {
  if (typeof window === 'undefined') return;
  if (isRunningAsInstalledApp()) {
    recordAppInstallation('standalone_app_open');
  }
};

// Track an event across both Firebase Analytics SDK and Firestore Real-time Stats
export const trackAnalyticsEvent = async (
  eventType: TrackedEventType,
  details?: string
): Promise<void> => {
  try {
    const sessionId = getSessionId();
    const now = new Date().toISOString();

    if (analyticsInstance && isAnalyticsSupported) {
      try {
        logEvent(analyticsInstance, eventType as any, {
          details: details || '',
          session_id: sessionId,
        });
      } catch {}
    }

    const eventsRef = collection(db, 'analytics_events');
    const payload: Record<string, any> = {
      eventType,
      sessionId,
      createdAt: now,
    };
    if (details) {
      payload.details = String(details).substring(0, 100);
    }
    await addDoc(eventsRef, payload);

    const statsDocRef = doc(db, 'app_stats', 'overview');
    const updatePayload: Record<string, any> = {
      lastUpdated: now,
    };

    if (eventType === 'page_view') {
      updatePayload.totalVisits = increment(1);
    } else if (eventType === 'app_install') {
      updatePayload.totalInstalls = increment(1);
    } else if (eventType === 'letter_play' || eventType === 'word_play' || eventType === 'rhyme_play') {
      updatePayload.totalPlays = increment(1);
    } else if (eventType === 'quiz_complete') {
      updatePayload.totalQuizzes = increment(1);
    } else if (eventType === 'tracing_complete') {
      updatePayload.totalTracing = increment(1);
    } else if (eventType === 'share_click') {
      updatePayload.totalShares = increment(1);
    }

    await setDoc(statsDocRef, updatePayload, { merge: true });
  } catch {
    // Defensively handle network / offline without bubbling errors
  }
};

const ACTIVE_PLAYER_TIMEOUT_MS = 45000; // 45 seconds live window

// Update real-time player presence ("কত জন খেলছে") only when page is visible
export const updatePlayerPresence = async (
  currentTab: string,
  currentActivity: string
): Promise<void> => {
  try {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }
    const sessionId = getSessionId();
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const sessionRef = doc(db, 'active_sessions', sessionId);

    await setDoc(
      sessionRef,
      {
        sessionId,
        currentTab: String(currentTab).substring(0, 40),
        currentActivity: String(currentActivity).substring(0, 100),
        isInstalledApp: isRunningAsInstalledApp(),
        deviceType: getDevicePlatformName(),
        lastSeenMs: nowMs,
        updatedAt: nowIso,
      },
      { merge: true }
    );
  } catch {}
};

// Immediately mark player offline when they minimize app, switch tabs, or close window
export const markPlayerOffline = async (): Promise<void> => {
  try {
    const sessionId = getSessionId();
    const nowIso = new Date().toISOString();
    const sessionRef = doc(db, 'active_sessions', sessionId);
    await setDoc(
      sessionRef,
      {
        sessionId,
        lastSeenMs: 0,
        updatedAt: nowIso,
      },
      { merge: true }
    );
  } catch {}
};

// Reset Control Room counters to clean baseline
export const resetControlRoomStats = async (keepInstallsCount: number = 1): Promise<void> => {
  try {
    const nowIso = new Date().toISOString();
    const statsDocRef = doc(db, 'app_stats', 'overview');
    await setDoc(
      statsDocRef,
      {
        totalVisits: 1,
        totalInstalls: Math.max(0, keepInstallsCount),
        totalPlays: 0,
        totalQuizzes: 0,
        totalTracing: 0,
        totalShares: 0,
        lastUpdated: nowIso,
      },
      { merge: true }
    );
  } catch {}
};

export interface ActivePlayerInfo {
  sessionId: string;
  currentTab: string;
  currentActivity: string;
  isInstalledApp: boolean;
  deviceType: string;
  lastSeenMs: number;
  updatedAt: string;
}

export interface AppStatsData {
  totalVisits: number;
  totalInstalls: number;
  totalPlays: number;
  totalQuizzes: number;
  totalTracing: number;
  totalShares: number;
  lastUpdated?: string;
  activePlayers: ActivePlayerInfo[];
  recentEvents: Array<{
    id: string;
    eventType: string;
    details?: string;
    sessionId?: string;
    createdAt: string;
  }>;
}

export const fetchAppStats = async (): Promise<AppStatsData> => {
  const defaultStats: AppStatsData = {
    totalVisits: 0,
    totalInstalls: 0,
    totalPlays: 0,
    totalQuizzes: 0,
    totalTracing: 0,
    totalShares: 0,
    activePlayers: [],
    recentEvents: [],
  };

  try {
    const statsDocRef = doc(db, 'app_stats', 'overview');
    const docSnap = await getDoc(statsDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      defaultStats.totalVisits = data.totalVisits || 0;
      defaultStats.totalInstalls = data.totalInstalls || 0;
      defaultStats.totalPlays = data.totalPlays || 0;
      defaultStats.totalQuizzes = data.totalQuizzes || 0;
      defaultStats.totalTracing = data.totalTracing || 0;
      defaultStats.totalShares = data.totalShares || 0;
      defaultStats.lastUpdated = data.lastUpdated;
    }

    // Fetch active sessions
    const sessionsSnap = await getDocs(collection(db, 'active_sessions'));
    const nowMs = Date.now();
    const activeList: ActivePlayerInfo[] = [];
    sessionsSnap.docs.forEach((d) => {
      const s = d.data();
      // Active within the last 45 seconds and not marked offline (lastSeenMs > 0)
      if (s.lastSeenMs && s.lastSeenMs > 0 && nowMs - s.lastSeenMs <= ACTIVE_PLAYER_TIMEOUT_MS) {
        activeList.push({
          sessionId: s.sessionId || d.id,
          currentTab: s.currentTab || 'board',
          currentActivity: s.currentActivity || 'বর্ণমালা পড়ছে',
          isInstalledApp: Boolean(s.isInstalledApp),
          deviceType: s.deviceType || 'মোবাইল ডিভাইস',
          lastSeenMs: s.lastSeenMs,
          updatedAt: s.updatedAt || '',
        });
      }
    });
    activeList.sort((a, b) => b.lastSeenMs - a.lastSeenMs);
    defaultStats.activePlayers = activeList;

    // Fetch up to 25 recent events
    const eventsQuery = query(
      collection(db, 'analytics_events'),
      orderBy('createdAt', 'desc'),
      limit(25)
    );
    const querySnap = await getDocs(eventsQuery);
    defaultStats.recentEvents = querySnap.docs.map((d) => ({
      id: d.id,
      eventType: d.data().eventType,
      details: d.data().details,
      sessionId: d.data().sessionId,
      createdAt: d.data().createdAt,
    }));
  } catch {}

  return defaultStats;
};

// Real-time subscription for the Admin Control Room
export const subscribeToControlRoom = (
  onUpdate: (data: Partial<AppStatsData>) => void
): (() => void) => {
  const unsubStats = onSnapshot(
    doc(db, 'app_stats', 'overview'),
    (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        onUpdate({
          totalVisits: d.totalVisits || 0,
          totalInstalls: d.totalInstalls || 0,
          totalPlays: d.totalPlays || 0,
          totalQuizzes: d.totalQuizzes || 0,
          totalTracing: d.totalTracing || 0,
          totalShares: d.totalShares || 0,
          lastUpdated: d.lastUpdated,
        });
      }
    },
    () => {}
  );

  const unsubSessions = onSnapshot(
    collection(db, 'active_sessions'),
    (snap) => {
      const nowMs = Date.now();
      const activeList: ActivePlayerInfo[] = [];
      snap.docs.forEach((d) => {
        const s = d.data();
        if (s.lastSeenMs && s.lastSeenMs > 0 && nowMs - s.lastSeenMs <= ACTIVE_PLAYER_TIMEOUT_MS) {
          activeList.push({
            sessionId: s.sessionId || d.id,
            currentTab: s.currentTab || 'board',
            currentActivity: s.currentActivity || 'বর্ণমালা পড়ছে',
            isInstalledApp: Boolean(s.isInstalledApp),
            deviceType: s.deviceType || 'মোবাইল ডিভাইস',
            lastSeenMs: s.lastSeenMs,
            updatedAt: s.updatedAt || '',
          });
        }
      });
      activeList.sort((a, b) => b.lastSeenMs - a.lastSeenMs);
      onUpdate({ activePlayers: activeList });
    },
    () => {}
  );

  const eventsQuery = query(
    collection(db, 'analytics_events'),
    orderBy('createdAt', 'desc'),
    limit(25)
  );
  const unsubEvents = onSnapshot(
    eventsQuery,
    (snap) => {
      const recentEvents = snap.docs.map((d) => ({
        id: d.id,
        eventType: d.data().eventType,
        details: d.data().details,
        sessionId: d.data().sessionId,
        createdAt: d.data().createdAt,
      }));
      onUpdate({ recentEvents });
    },
    () => {}
  );

  return () => {
    unsubStats();
    unsubSessions();
    unsubEvents();
  };
};

// Save & subscribe to global Banner Watermark image in Firestore
export const saveBannerWatermark = async (imageDataUrl: string): Promise<void> => {
  try {
    const ref = doc(db, 'app_settings', 'banner_watermark');
    await setDoc(ref, {
      imageData: imageDataUrl,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to save banner watermark to Firestore:', err);
  }
};

export const subscribeToBannerWatermark = (
  onUpdate: (imageData: string | null) => void
): (() => void) => {
  try {
    return onSnapshot(
      doc(db, 'app_settings', 'banner_watermark'),
      (snap) => {
        if (snap.exists() && snap.data().imageData) {
          onUpdate(snap.data().imageData);
        } else {
          onUpdate(null);
        }
      },
      () => {}
    );
  } catch {
    return () => {};
  }
};

export interface ShortVideoItem {
  id: string;
  url: string;
  resolvedUrl?: string;
  canonicalEmbedUrl?: string;
  directMp4Url?: string;
  thumbnail?: string;
  platform?: 'youtube' | 'facebook' | 'instagram' | 'direct' | 'external';
  title: string;
  addedAt: string;
}

export interface AutoFetchedVideoMeta {
  success: boolean;
  originalUrl: string;
  resolvedUrl: string;
  canonicalEmbedUrl: string;
  directMp4Url: string;
  title: string;
  thumbnail: string;
  platform: 'youtube' | 'facebook' | 'instagram' | 'direct' | 'external';
}

export const autoFetchVideoDetails = async (rawUrl: string): Promise<AutoFetchedVideoMeta> => {
  try {
    const res = await fetch(`/api/autofetch-video?url=${encodeURIComponent(rawUrl.trim())}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return {
    success: false,
    originalUrl: rawUrl,
    resolvedUrl: rawUrl,
    canonicalEmbedUrl: '',
    directMp4Url: '',
    title: 'শিক্ষামূলক শর্ট ভিডিও',
    thumbnail: '',
    platform: 'external',
  };
};

export const DEFAULT_SHORT_VIDEOS: ShortVideoItem[] = [
  {
    id: 'default-short-1',
    url: 'https://www.youtube.com/shorts/J9lT2hW-9qQ',
    title: 'মজার ছন্দে বাংলা স্বরবর্ণ অ আ ই ঈ শিক্ষা',
    addedAt: '2026-10-05T08:00:00.000Z',
  },
  {
    id: 'default-short-2',
    url: 'https://www.youtube.com/shorts/7vK9P_xY6qE',
    title: 'ছোটদের মজার ছড়া ও কার্টুন শর্ট ভিডিও',
    addedAt: '2026-10-05T08:05:00.000Z',
  },
];

// Save & subscribe to global Short Videos list in Firestore (stored in app_settings/short_videos_feed)
export const saveShortVideosList = async (videos: ShortVideoItem[]): Promise<void> => {
  try {
    const ref = doc(db, 'app_settings', 'short_videos_feed');
    await setDoc(ref, {
      imageData: JSON.stringify(videos),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to save short videos to Firestore:', err);
  }
};

export const subscribeToShortVideosList = (
  onUpdate: (videos: ShortVideoItem[]) => void
): (() => void) => {
  try {
    return onSnapshot(
      doc(db, 'app_settings', 'short_videos_feed'),
      (snap) => {
        if (snap.exists() && snap.data().imageData) {
          try {
            const parsed = JSON.parse(snap.data().imageData);
            if (Array.isArray(parsed)) {
              onUpdate(parsed);
              return;
            }
          } catch {}
        }
        onUpdate([]);
      },
      () => {
        onUpdate([]);
      }
    );
  } catch {
    return () => {};
  }
};

// Save & subscribe to global Long Videos list in Firestore (stored in app_settings/long_videos_feed)
export const saveLongVideosList = async (videos: ShortVideoItem[]): Promise<void> => {
  try {
    const ref = doc(db, 'app_settings', 'long_videos_feed');
    await setDoc(ref, {
      imageData: JSON.stringify(videos),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to save long videos to Firestore:', err);
  }
};

export const subscribeToLongVideosList = (
  onUpdate: (videos: ShortVideoItem[]) => void
): (() => void) => {
  try {
    return onSnapshot(
      doc(db, 'app_settings', 'long_videos_feed'),
      (snap) => {
        if (snap.exists() && snap.data().imageData) {
          try {
            const parsed = JSON.parse(snap.data().imageData);
            if (Array.isArray(parsed)) {
              onUpdate(parsed);
              return;
            }
          } catch {}
        }
        onUpdate([]);
      },
      () => {
        onUpdate([]);
      }
    );
  } catch {
    return () => {};
  }
};

// Save & subscribe to global Video Buttons Visibility (Play Store Review Safe Mode) in Firestore
export const saveVideoButtonsVisibility = async (visible: boolean): Promise<void> => {
  try {
    const ref = doc(db, 'app_settings', 'video_buttons_visibility');
    await setDoc(ref, {
      imageData: visible ? 'visible' : 'hidden',
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to save video buttons visibility to Firestore:', err);
  }
};

export interface AdMobSettings {
  appId: string;
  bannerAdUnitId: string;
  interstitialAdUnitId: string;
  publisherId: string;
  adsEnabled: boolean;
}

export const saveAdMobSettings = async (settings: AdMobSettings): Promise<void> => {
  try {
    const ref = doc(db, 'app_settings', 'admob_settings');
    await setDoc(ref, {
      imageData: JSON.stringify(settings).substring(0, 10000),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to save AdMob settings to Firestore:', err);
  }
};

export const subscribeToAdMobSettings = (
  onUpdate: (settings: AdMobSettings) => void
): (() => void) => {
  const defaultSettings: AdMobSettings = {
    appId: 'ca-app-pub-4591170818423623~7017300992',
    bannerAdUnitId: 'ca-app-pub-4591170818423623/5258241626',
    interstitialAdUnitId: '',
    publisherId: 'pub-4591170818423623',
    adsEnabled: true,
  };
  try {
    return onSnapshot(
      doc(db, 'app_settings', 'admob_settings'),
      (snap) => {
        if (snap.exists() && snap.data().imageData) {
          try {
            const parsed = JSON.parse(snap.data().imageData);
            onUpdate({
              ...defaultSettings,
              ...parsed,
              appId: parsed.appId || defaultSettings.appId,
              bannerAdUnitId: parsed.bannerAdUnitId || defaultSettings.bannerAdUnitId,
              interstitialAdUnitId:
                parsed.interstitialAdUnitId || defaultSettings.interstitialAdUnitId,
              publisherId: parsed.publisherId || defaultSettings.publisherId,
            });
            return;
          } catch {}
        }
        onUpdate(defaultSettings);
      },
      () => {
        onUpdate(defaultSettings);
      }
    );
  } catch {
    return () => {};
  }
};

export const subscribeToVideoButtonsVisibility = (
  onUpdate: (visible: boolean) => void
): (() => void) => {
  try {
    return onSnapshot(
      doc(db, 'app_settings', 'video_buttons_visibility'),
      (snap) => {
        if (snap.exists() && snap.data().imageData === 'hidden') {
          onUpdate(false);
        } else {
          onUpdate(true);
        }
      },
      () => {
        onUpdate(true);
      }
    );
  } catch {
    return () => {};
  }
};

// Custom Voice Recording Storage & Sync in Firestore (অ থেকে চন্দ্রবিন্দু ঁ পর্যন্ত ৫০টি বর্ণ)
export interface CustomVoiceIndexMap {
  [itemId: string]: {
    letter: string;
    updatedAt: string;
  };
}

export const saveCustomLetterVoiceToFirestore = async (
  itemId: string,
  letter: string,
  audioDataUrl: string
): Promise<boolean> => {
  try {
    const safeId = itemId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeId || !audioDataUrl || audioDataUrl.length > 880000) {
      return false;
    }
    const now = new Date().toISOString();

    // 1. Save individual letter voice document in app_settings/custom_voice_{safeId}
    const voiceDocRef = doc(db, 'app_settings', `custom_voice_${safeId}`);
    await setDoc(voiceDocRef, {
      imageData: audioDataUrl,
      updatedAt: now,
    });

    // 2. Update index document in app_settings/custom_voices_index
    const indexDocRef = doc(db, 'app_settings', 'custom_voices_index');
    let indexMap: CustomVoiceIndexMap = {};
    try {
      const snap = await getDoc(indexDocRef);
      if (snap.exists() && snap.data().imageData) {
        indexMap = JSON.parse(snap.data().imageData) || {};
      }
    } catch {}

    indexMap[safeId] = {
      letter,
      updatedAt: now,
    };

    await setDoc(indexDocRef, {
      imageData: JSON.stringify(indexMap).substring(0, 800000),
      updatedAt: now,
    });
    return true;
  } catch (err) {
    console.warn('Failed to save custom voice to Firestore:', err);
    return false;
  }
};

export const deleteCustomLetterVoiceFromFirestore = async (
  itemId: string,
  resetAll: boolean = false
): Promise<void> => {
  try {
    const now = new Date().toISOString();
    const indexDocRef = doc(db, 'app_settings', 'custom_voices_index');

    if (resetAll) {
      await setDoc(indexDocRef, {
        imageData: '{}',
        updatedAt: now,
      });
      return;
    }

    const safeId = itemId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeId) return;

    const voiceDocRef = doc(db, 'app_settings', `custom_voice_${safeId}`);
    await setDoc(voiceDocRef, {
      imageData: '',
      updatedAt: now,
    });

    let indexMap: CustomVoiceIndexMap = {};
    try {
      const snap = await getDoc(indexDocRef);
      if (snap.exists() && snap.data().imageData) {
        indexMap = JSON.parse(snap.data().imageData) || {};
      }
    } catch {}

    delete indexMap[safeId];
    await setDoc(indexDocRef, {
      imageData: JSON.stringify(indexMap).substring(0, 800000),
      updatedAt: now,
    });
  } catch (err) {
    console.warn('Failed to delete custom voice from Firestore:', err);
  }
};

export const subscribeToCustomLetterVoices = (
  onUpdate: (voicesMap: Record<string, string>) => void
): (() => void) => {
  const voiceCache: Record<string, { updatedAt: string; audioData: string }> = {};

  try {
    return onSnapshot(
      doc(db, 'app_settings', 'custom_voices_index'),
      async (snap) => {
        if (!snap.exists() || !snap.data().imageData) {
          onUpdate({});
          return;
        }
        try {
          const indexMap: CustomVoiceIndexMap = JSON.parse(snap.data().imageData) || {};
          const keys = Object.keys(indexMap);
          if (keys.length === 0) {
            onUpdate({});
            return;
          }
          const combined: Record<string, string> = {};
          await Promise.all(
            keys.map(async (safeId) => {
              try {
                const expectedUpdatedAt = indexMap[safeId]?.updatedAt || '';
                const cached = voiceCache[safeId];

                if (cached && cached.updatedAt === expectedUpdatedAt && cached.audioData) {
                  combined[safeId] = cached.audioData;
                  if (indexMap[safeId]?.letter) {
                    combined[indexMap[safeId].letter] = cached.audioData;
                  }
                  return;
                }

                const voiceDocRef = doc(db, 'app_settings', `custom_voice_${safeId}`);
                const vSnap = await getDoc(voiceDocRef);

                if (vSnap.exists() && vSnap.data().imageData) {
                  const audioData = vSnap.data().imageData;
                  voiceCache[safeId] = {
                    updatedAt: expectedUpdatedAt,
                    audioData,
                  };
                  combined[safeId] = audioData;
                  if (indexMap[safeId]?.letter) {
                    combined[indexMap[safeId].letter] = audioData;
                  }
                }
              } catch {}
            })
          );
          onUpdate(combined);
        } catch {
          onUpdate({});
        }
      },
      () => {}
    );
  } catch {
    return () => {};
  }
};

// Persistent Admin Control Room PIN in Firestore + localStorage (with Bangla-to-English digit normalization)
const SAVED_ADMIN_PIN_KEY = 'hashikhushi_saved_admin_pin_v1';

export const normalizePinString = (raw: string): string => {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  let out = String(raw || '').trim();
  for (let i = 0; i < 10; i++) {
    out = out.split(banglaDigits[i]).join(String(i));
  }
  return out.replace(/\s+/g, '');
};

export const getLocalSavedAdminPin = (): string => {
  if (typeof window === 'undefined') return '1234';
  try {
    const saved = localStorage.getItem(SAVED_ADMIN_PIN_KEY);
    if (saved && saved.trim().length >= 4) {
      return normalizePinString(saved);
    }
  } catch {}
  return '1234';
};

export const saveAdminPinToFirestore = async (newPin: string): Promise<boolean> => {
  const cleanPin = normalizePinString(newPin);
  if (cleanPin.length < 4) return false;

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SAVED_ADMIN_PIN_KEY, cleanPin);
    }
  } catch {}

  try {
    const ref = doc(db, 'app_settings', 'admin_pin_config');
    await setDoc(ref, {
      imageData: JSON.stringify({ pin: cleanPin }),
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn('Failed to save Admin PIN to Firestore:', err);
    return false;
  }
};

export const fetchAdminPinFromFirestore = async (): Promise<string> => {
  try {
    const ref = doc(db, 'app_settings', 'admin_pin_config');
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().imageData) {
      const parsed = JSON.parse(snap.data().imageData);
      if (parsed && parsed.pin && String(parsed.pin).trim().length >= 4) {
        const cleanPin = normalizePinString(parsed.pin);
        try {
          localStorage.setItem(SAVED_ADMIN_PIN_KEY, cleanPin);
        } catch {}
        return cleanPin;
      }
    }
  } catch {}
  return getLocalSavedAdminPin();
};

export const subscribeToAdminPin = (onUpdate: (pin: string) => void): (() => void) => {
  try {
    return onSnapshot(
      doc(db, 'app_settings', 'admin_pin_config'),
      (snap) => {
        if (snap.exists() && snap.data().imageData) {
          try {
            const parsed = JSON.parse(snap.data().imageData);
            if (parsed && parsed.pin && String(parsed.pin).trim().length >= 4) {
              const cleanPin = normalizePinString(parsed.pin);
              try {
                localStorage.setItem(SAVED_ADMIN_PIN_KEY, cleanPin);
              } catch {}
              onUpdate(cleanPin);
              return;
            }
          } catch {}
        }
        onUpdate(getLocalSavedAdminPin());
      },
      () => {
        onUpdate(getLocalSavedAdminPin());
      }
    );
  } catch {
    return () => {};
  }
};

// Test initial connection with timeout protection to prevent 10s timeout warnings
export const testConnection = async (): Promise<boolean> => {
  try {
    const testDoc = doc(db, 'app_stats', 'overview');
    await Promise.race([
      getDoc(testDoc),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);
    return true;
  } catch (err) {
    if (err instanceof Error && err.message.includes('the client is offline')) {
      console.warn('Firestore is running in offline mode. Operating seamlessly via cache.');
    }
    return false;
  }
};
