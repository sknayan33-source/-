import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  normalizePinString,
  getLocalSavedAdminPin,
  saveAdminPinToFirestore,
  fetchAdminPinFromFirestore,
  subscribeToAdminPin,
} from '../services/firebase';

interface AdminContextType {
  isAdmin: boolean;
  adminPin: string | null;
  isCustomPinSet: boolean;
  login: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  changePin: (newPin: string) => Promise<{ success: boolean; error?: string }>;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const ADMIN_SESSION_UNLOCKED_KEY = 'bangla_admin_session_unlocked_v2';

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expectedPin, setExpectedPin] = useState<string>(() => getLocalSavedAdminPin());
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPin, setAdminPin] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sync authoritative Admin PIN from Firestore + localStorage on startup and in real-time
  useEffect(() => {
    let mounted = true;

    fetchAdminPinFromFirestore()
      .then((pin) => {
        if (!mounted || !pin) return;
        setExpectedPin(pin);
        // Keep backend server in sync with Firestore PIN across container restarts
        fetch('/api/admin/change-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPin: pin }),
        }).catch(() => {});
      })
      .catch(() => {});

    const unsub = subscribeToAdminPin((pin) => {
      if (!mounted || !pin) return;
      setExpectedPin(pin);
      setAdminPin((prev) => (prev ? pin : null));
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const login = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    const clean = normalizePinString(pin);
    if (!clean) return { success: false, error: 'পিন কোড প্রদান করুন' };

    // Always check against the latest Firestore / local saved PIN first
    const latestSavedPin = await fetchAdminPinFromFirestore();
    setExpectedPin(latestSavedPin);

    if (clean === latestSavedPin) {
      setIsAdmin(true);
      setAdminPin(clean);
      try {
        sessionStorage.setItem(ADMIN_SESSION_UNLOCKED_KEY, clean);
      } catch {}
      // Ensure backend server also has this authoritative PIN
      fetch('/api/admin/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPin: clean }),
      }).catch(() => {});
      return { success: true };
    }

    // Also check backend in case PIN was updated on server directly
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: clean }),
      });
      const data = await res.json();
      if (data.success && latestSavedPin === '1234') {
        setIsAdmin(true);
        setAdminPin(clean);
        setExpectedPin(clean);
        await saveAdminPinToFirestore(clean);
        try {
          sessionStorage.setItem(ADMIN_SESSION_UNLOCKED_KEY, clean);
        } catch {}
        return { success: true };
      }
    } catch {}

    return { success: false, error: 'ভুল এডমিন পিন কোড! সঠিক পিন দিন।' };
  };

  const logout = () => {
    setIsAdmin(false);
    setAdminPin(null);
    try {
      sessionStorage.removeItem(ADMIN_SESSION_UNLOCKED_KEY);
    } catch {}
  };

  const changePin = async (newPin: string): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin) return { success: false, error: 'লগইন করা নেই' };
    const cleanNew = normalizePinString(newPin);
    if (!cleanNew || cleanNew.length < 4) {
      return { success: false, error: 'নতুন পিন কমপক্ষে ৪ সংখ্যার হতে হবে!' };
    }

    // 1. Save immediately in React state & localStorage
    setExpectedPin(cleanNew);
    setAdminPin(cleanNew);
    try {
      sessionStorage.setItem(ADMIN_SESSION_UNLOCKED_KEY, cleanNew);
    } catch {}

    // 2. Save permanently to Firestore (app_settings/admin_pin_config)
    await saveAdminPinToFirestore(cleanNew);

    // 3. Sync to backend Express server
    try {
      await fetch('/api/admin/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin: adminPin, newPin: cleanNew }),
      });
    } catch {}

    return { success: true };
  };

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        adminPin,
        isCustomPinSet: expectedPin !== '1234',
        login,
        logout,
        changePin,
        isModalOpen,
        setIsModalOpen,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
